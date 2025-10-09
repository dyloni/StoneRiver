import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserAccount {
  email: string;
  password: string;
  role: string;
  firstName?: string;
  surname?: string;
  adminRole?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const accounts: UserAccount[] = body.accounts || body.users || [];

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No accounts provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const results = [];
    const errors = [];

    for (const account of accounts) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            role: account.role === "agent" ? "agent" : account.adminRole || account.role,
          },
        });

        if (authError) {
          errors.push({ email: account.email, error: authError.message });
          continue;
        }

        if (account.role === "agent") {
          const { data: agentData, error: insertError } = await supabaseAdmin
            .from("agents")
            .insert({
              auth_user_id: authData.user?.id,
              first_name: account.firstName || account.email.split("@")[0],
              surname: account.surname || "",
              email: account.email,
            })
            .select()
            .single();

          if (insertError) {
            errors.push({ email: account.email, error: `Auth created but agent record failed: ${insertError.message}` });
          } else {
            results.push({ email: account.email, role: account.role, agentId: agentData.id, status: "success" });
          }
        } else if (account.role === "admin" && account.adminRole) {
          const { data: adminData, error: insertError} = await supabaseAdmin
            .from("admins")
            .insert({
              auth_user_id: authData.user?.id,
              first_name: account.firstName || account.email.split("@")[0],
              surname: account.surname || "",
              email: account.email,
              admin_role: account.adminRole,
              role: account.adminRole,
            })
            .select()
            .single();

          if (insertError) {
            errors.push({ email: account.email, error: `Auth created but admin record failed: ${insertError.message}` });
          } else {
            results.push({ email: account.email, role: account.role, adminRole: account.adminRole, adminId: adminData.id, status: "success" });
          }
        }
      } catch (error) {
        errors.push({ email: account.email, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: results.length,
        failed: errors.length,
        results,
        errors,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
