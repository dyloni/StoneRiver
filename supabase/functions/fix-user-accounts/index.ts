import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserAccount {
  email: string;
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

    const { accounts }: { accounts: UserAccount[] } = await req.json();

    const results = [];
    const errors = [];

    for (const account of accounts) {
      try {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
          errors.push({ email: account.email, error: `Failed to list users: ${listError.message}` });
          continue;
        }

        const authUser = users.find(u => u.email?.toLowerCase() === account.email.toLowerCase());

        if (!authUser) {
          errors.push({ email: account.email, error: "Auth user not found" });
          continue;
        }

        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          user_metadata: {
            role: account.role === "agent" ? "agent" : account.adminRole || account.role,
          },
        });

        if (account.role === "agent") {
          const { data: existing } = await supabaseAdmin
            .from("agents")
            .select("id")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();

          if (!existing) {
            const { data: agentData, error: insertError } = await supabaseAdmin
              .from("agents")
              .insert({
                auth_user_id: authUser.id,
                first_name: account.firstName || account.email.split("@")[0],
                surname: account.surname || "",
                email: account.email,
              })
              .select()
              .single();

            if (insertError) {
              errors.push({ email: account.email, error: `Failed to create agent record: ${insertError.message}` });
            } else {
              results.push({ email: account.email, role: account.role, agentId: agentData.id, status: "fixed" });
            }
          } else {
            results.push({ email: account.email, role: account.role, agentId: existing.id, status: "already_exists" });
          }
        } else if (account.role === "admin" && account.adminRole) {
          const { data: existing } = await supabaseAdmin
            .from("admins")
            .select("id")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();

          if (!existing) {
            const { data: adminData, error: insertError } = await supabaseAdmin
              .from("admins")
              .insert({
                auth_user_id: authUser.id,
                first_name: account.firstName || account.email.split("@")[0],
                surname: account.surname || "",
                email: account.email,
                admin_role: account.adminRole,
                role: account.adminRole,
              })
              .select()
              .single();

            if (insertError) {
              errors.push({ email: account.email, error: `Failed to create admin record: ${insertError.message}` });
            } else {
              results.push({ email: account.email, role: account.role, adminRole: account.adminRole, adminId: adminData.id, status: "fixed" });
            }
          } else {
            results.push({ email: account.email, role: account.role, adminRole: account.adminRole, adminId: existing.id, status: "already_exists" });
          }
        }
      } catch (error) {
        errors.push({ email: account.email, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fixed: results.length,
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
