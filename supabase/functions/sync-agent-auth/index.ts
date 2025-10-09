import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("agents")
      .select("id, email, first_name, surname, auth_user_id, password")
      .order("id");

    if (agentsError) {
      throw new Error(`Failed to load agents: ${agentsError.message}`);
    }

    const results = [];
    const errors = [];

    for (const agent of agents) {
      try {
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(agent.auth_user_id);

        if (existingUser?.user) {
          results.push({ 
            agentId: agent.id, 
            email: agent.email, 
            status: "already_exists",
            authUserId: agent.auth_user_id 
          });
          continue;
        }

        const password = agent.password || "Stoneriver@#12";

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: agent.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            role: "agent",
            first_name: agent.first_name,
            surname: agent.surname,
          },
        });

        if (authError) {
          errors.push({ 
            agentId: agent.id, 
            email: agent.email, 
            error: authError.message 
          });
          continue;
        }

        const newAuthUserId = authData.user?.id;

        if (newAuthUserId !== agent.auth_user_id) {
          const { error: updateError } = await supabaseAdmin
            .from("agents")
            .update({ auth_user_id: newAuthUserId })
            .eq("id", agent.id);

          if (updateError) {
            errors.push({ 
              agentId: agent.id, 
              email: agent.email, 
              error: `Auth created but failed to update auth_user_id: ${updateError.message}` 
            });
            continue;
          }
        }

        results.push({ 
          agentId: agent.id, 
          email: agent.email, 
          status: "created",
          authUserId: newAuthUserId 
        });
      } catch (error) {
        errors.push({ 
          agentId: agent.id, 
          email: agent.email, 
          error: error.message 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalAgents: agents.length,
        created: results.filter(r => r.status === "created").length,
        alreadyExists: results.filter(r => r.status === "already_exists").length,
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
