import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { plan_type } = await req.json(); // "monthly" | "annual"

    // Amount in paise
    const amount = plan_type === "annual" ? 99900 : 9900; // ₹999 or ₹99

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    // Create Razorpay order
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        notes: {
          user_id: user.id,
          plan_type,
        },
      }),
    });

    if (!rzpRes.ok) {
      const err = await rzpRes.text();
      throw new Error(`Razorpay error: ${err}`);
    }

    const order = await rzpRes.json();

    // Store pending subscription
    await supabase.from("subscriptions").insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      plan_type,
      status: "created",
      amount_paise: amount,
    });

    return new Response(JSON.stringify({
      order_id: order.id,
      amount,
      currency: "INR",
      key_id: RAZORPAY_KEY_ID,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
