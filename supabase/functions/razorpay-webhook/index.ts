import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    // Verify webhook signature
    const expectedSig = createHmac("sha256", WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSig !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);

    // We care about payment.captured — means payment succeeded
    if (event.event !== "payment.captured") {
      return new Response("OK", { status: 200 });
    }

    const payment = event.payload.payment.entity;
    const order_id = payment.order_id;
    const payment_id = payment.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the subscription row by order_id
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("razorpay_order_id", order_id)
      .single();

    if (subErr || !sub) {
      console.error("Subscription not found for order:", order_id);
      return new Response("OK", { status: 200 }); // Don't reject, Razorpay retries on non-200
    }

    // Calculate expiry
    const now = new Date();
    const expires_at = new Date(now);
    if (sub.plan_type === "annual") {
      expires_at.setFullYear(expires_at.getFullYear() + 1);
    } else {
      expires_at.setMonth(expires_at.getMonth() + 1);
    }

    // Update subscription to paid
    await supabase
      .from("subscriptions")
      .update({
        status: "paid",
        razorpay_payment_id: payment_id,
        starts_at: now.toISOString(),
        expires_at: expires_at.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", sub.id);

    // Upgrade user's plan to pro
    await supabase
      .from("profiles")
      .update({ plan: "pro" })
      .eq("id", sub.user_id);

    console.log(`Upgraded user ${sub.user_id} to pro (${sub.plan_type}), expires ${expires_at.toISOString()}`);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
});
