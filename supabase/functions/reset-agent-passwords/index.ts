import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const { password } = await req.json();
    const newPassword = password || "Stoneriver@#12";

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const agentUsers = users.filter(u =>
      u.user_metadata?.role === 'agent' &&
      u.email?.toLowerCase().startsWith('ag')
    );

    const results = [];
    const errors = [];

    for (const user of agentUsers) {
      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password: newPassword }
        );

        if (updateError) {
          errors.push({ email: user.email, error: updateError.message });
        } else {
          results.push({ email: user.email, status: "password_reset" });
        }
      } catch (error) {
        errors.push({ email: user.email, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: results.length,
        failed: errors.length,
        results,
        errors,
        newPassword,
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
