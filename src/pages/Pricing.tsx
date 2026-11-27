import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Zap, Crown, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const FREE_FEATURES = [
  { text: "Unlimited classes & meetings", included: true },
  { text: "2 social events per week", included: true },
  { text: "Group availability finder", included: true },
  { text: "AI scheduling assistant (5/day)", included: true },
  { text: "RSVP shareable links", included: true },
  { text: "Push notifications", included: true },
  { text: "Unlimited social events", included: false },
  { text: "Priority AI responses", included: false },
  { text: "Export to PDF / Google Cal", included: false },
];

const PRO_FEATURES = [
  { text: "Unlimited classes & meetings", included: true },
  { text: "Unlimited social events", included: true },
  { text: "Group availability finder", included: true },
  { text: "Unlimited AI assistant", included: true },
  { text: "RSVP shareable links", included: true },
  { text: "Push notifications", included: true },
  { text: "2-way Google Calendar sync", included: true },
  { text: "Priority support", included: true },
  { text: "Export to PDF / Google Cal", included: true },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { plan, isLoading: planLoading } = usePlan();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);

  const isAnnual = billingCycle === "annual";
  const monthlyPrice = 99;
  const annualTotal = 999;
  const annualMonthly = Math.round((annualTotal / 12) * 100) / 100; // 83.25

  const handleUpgrade = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    if (plan === "pro") {
      toast.info("You're already on Pro!");
      return;
    }

    setLoading(true);
    try {
      // Load Razorpay script if not loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay"));
          document.head.appendChild(script);
        });
      }

      // Create order via Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ plan_type: billingCycle }),
        }
      );

      if (!res.ok) throw new Error("Failed to create order");
      const { order_id, amount, currency, key_id } = await res.json();

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        order_id,
        name: "SyncMates",
        description: `Pro ${billingCycle === "annual" ? "Annual" : "Monthly"} Plan`,
        image: "/logo.png",
        prefill: { email: user.email },
        theme: { color: "#16a34a" },
        handler: (response: any) => {
          // Payment successful — webhook will activate Pro
          toast.success("Payment successful! Your Pro plan is activating...", { duration: 5000 });
          setTimeout(() => window.location.reload(), 3000);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info("Payment cancelled");
          },
        },
      });

      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="container max-w-5xl mx-auto px-4 pb-20">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Simple, honest pricing</h1>
          <p className="text-muted-foreground text-lg">
            Free for students. Pro for those who plan together — a lot.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                billingCycle === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                SAVE 16%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Free</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">Perfect for getting started</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">₹0</span>
              <span className="text-muted-foreground text-sm ml-1">forever</span>
            </div>

            <Button
              variant="outline"
              className="w-full mb-6"
              disabled={!planLoading && plan === "free"}
              onClick={() => navigate("/dashboard")}
            >
              {!planLoading && plan === "free" ? "Current plan" : "Get started free"}
            </Button>

            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {f.included ? (
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                  )}
                  <span className={f.included ? "" : "text-muted-foreground/60"}>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-green-500 bg-card p-6 relative shadow-lg shadow-green-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              MOST POPULAR
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold">Pro</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">For groups that sync constantly</p>

            <div className="mb-6">
              {isAnnual ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground line-through text-xl">₹99</span>
                    <span className="text-4xl font-bold">₹{annualMonthly}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Billed as ₹{annualTotal}/year</p>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">₹{monthlyPrice}</span>
                  <span className="text-muted-foreground text-sm ml-1">/month</span>
                </>
              )}
            </div>

            <Button
              className="w-full mb-6 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleUpgrade}
              disabled={loading || (!planLoading && plan === "pro")}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {!planLoading && plan === "pro"
                ? "✓ Current plan"
                : isAnnual
                ? `Get Pro Annual — ₹${annualTotal}/yr`
                : `Get Pro Monthly — ₹${monthlyPrice}/mo`}
            </Button>

            <ul className="space-y-2.5">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-10">
          Payments processed securely via Razorpay · Indian pricing · Cancel anytime
        </p>
      </div>
    </div>
  );
}
