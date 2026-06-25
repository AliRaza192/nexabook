"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, CreditCard, BarChart3, Shield } from "lucide-react";

import { getSubscription, createCheckoutSession, createPortalSession } from "@/lib/actions/billing";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "Rs. 0",
    priceId: null,
    features: ["Up to 50 invoices/month", "Basic reports", "Single user"],
    icon: BarChart3,
  },
  {
    id: "professional",
    name: "Professional",
    price: "Rs. 2,999/mo",
    priceId: "professional",
    features: ["Unlimited invoices", "All reports & analytics", "Up to 5 users", "WhatsApp integration", "API access"],
    icon: CreditCard,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Rs. 7,999/mo",
    priceId: "enterprise",
    features: ["Everything in Professional", "Unlimited users", "Priority support", "Multi-company consolidation", "Custom integrations"],
    icon: Shield,
  },
];

export default function BillingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setLoading(true);
    const result = await getSubscription();
    if (result.success) setSubscription(result.data);
    setLoading(false);
  };

  const handleUpgrade = async (plan: string) => {
    const planConfig = plans.find(p => p.id === plan);
    if (!planConfig || !planConfig.priceId) return;
    setActionLoading(plan);
    const result = await createCheckoutSession(planConfig.priceId, plan);
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    }
    setActionLoading(null);
  };

  const handleManage = async () => {
    setActionLoading("manage");
    const result = await createPortalSession();
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    }
    setActionLoading(null);
  };

  const currentPlan = subscription?.plan || "free";
  const isSubscribed = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexabook-900">Billing & Subscription</h1>
        <p className="text-sm text-nexabook-500 mt-1">Manage your plan and billing information</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
        </div>
      ) : (
        <>
          {isSubscribed && (
            <Card className="enterprise-card bg-green-50 border-green-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Active {subscription?.plan} subscription</p>
                    {subscription?.endsAt && (
                      <p className="text-sm text-green-600">Renews on {new Date(subscription.endsAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={handleManage} disabled={actionLoading === "manage"}>
                  {actionLoading === "manage" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage"}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const Icon = plan.icon;
              return (
                <Card key={plan.id} className={`enterprise-card relative ${plan.popular ? 'ring-2 ring-nexabook-500' : ''} ${isCurrent ? 'border-green-400' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-nexabook-600 text-white text-xs px-3 py-1 rounded-full">Most Popular</span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-nexabook-600" />
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <p className="text-2xl font-bold mt-2">{plan.price}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-nexabook-700">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Button className="w-full" disabled>
                        {isSubscribed ? "Current Plan" : "Current (Free)"}
                      </Button>
                    ) : plan.priceId ? (
                      <Button className="w-full" onClick={() => handleUpgrade(plan.id)} disabled={actionLoading === plan.id}>
                        {actionLoading === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Upgrade to ${plan.name}`}
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
