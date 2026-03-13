import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the requester is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin role
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const hasPermission = roles?.some((r) => r.role === "admin");
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions - Admin only" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prevent self-deletion
    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete related data first, then auth user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find client record linked to this user
    const { data: clientData } = await adminClient
      .from("clients")
      .select("id")
      .eq("user_id", user_id);

    if (clientData && clientData.length > 0) {
      const clientIds = clientData.map((c: any) => c.id);

      // Find bookings for these clients
      const { data: bookingData } = await adminClient
        .from("bookings")
        .select("id")
        .in("client_id", clientIds);

      if (bookingData && bookingData.length > 0) {
        const bookingIds = bookingData.map((b: any) => b.id);

        // Delete booking-related records
        await adminClient.from("payments").delete().in("booking_id", bookingIds);
        await adminClient.from("appointments").delete().in("booking_id", bookingIds);
        await adminClient.from("booking_cats").delete().in("booking_id", bookingIds);
        await adminClient.from("cat_registry").delete().in("booking_id", bookingIds);
        await adminClient.from("documents").delete().in("booking_id", bookingIds);
        await adminClient.from("bookings").delete().in("id", bookingIds);
      }

      // Delete quote requests
      await adminClient.from("quote_requests").delete().in("client_id", clientIds);

      // Delete cats
      await adminClient.from("cats").delete().in("client_id", clientIds);

      // Delete clients
      await adminClient.from("clients").delete().in("id", clientIds);
    }

    // Nullify FK references that don't cascade
    await adminClient.from("bookings").update({ created_by: null }).eq("created_by", user_id);
    await adminClient.from("payments").update({ created_by: null }).eq("created_by", user_id);
    await adminClient.from("cage_overrides").update({ created_by: null }).eq("created_by", user_id);
    await adminClient.from("planning_tasks").update({ assigned_to: null }).eq("assigned_to", user_id);
    await adminClient.from("planning_tasks").update({ completed_by: null }).eq("completed_by", user_id);
    await adminClient.from("email_log").update({ created_by: null }).eq("created_by", user_id);
    await adminClient.from("documents").update({ created_by: null }).eq("created_by", user_id);
    await adminClient.from("audit_log").update({ user_id: null }).eq("user_id", user_id);

    // Clean up user-level tables (these have CASCADE but let's be explicit)
    await adminClient.from("trial_registrations").delete().eq("user_id", user_id);
    await adminClient.from("user_roles").delete().eq("user_id", user_id);
    await adminClient.from("profiles").delete().eq("user_id", user_id);

    // Delete from auth.users so email can be re-used
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
