"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, Package, Users, FileText, CheckCircle, ArrowRight, ArrowLeft, SkipForward, Loader2, Sparkles,
} from "lucide-react";
import {
  getOnboardingStatus, completeOnboardingStep, finishOnboarding, updateOrganizationOnboarding,
} from "@/lib/actions/onboarding";
import { createCustomer } from "@/lib/actions/sales";

type Step = "business" | "product" | "customer" | "invoice" | "done";

const steps: { id: Step; label: string; icon: typeof Building2 }[] = [
  { id: "business", label: "Business Setup", icon: Building2 },
  { id: "product", label: "First Product", icon: Package },
  { id: "customer", label: "First Customer", icon: Users },
  { id: "invoice", label: "First Invoice", icon: FileText },
  { id: "done", label: "Ready!", icon: Sparkles },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("business");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Business form
  const [bizName, setBizName] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizCity, setBizCity] = useState("");
  const [bizPhone, setBizPhone] = useState("");

  // Step 2: Product form
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");

  // Step 3: Customer form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  useEffect(() => {
    async function load() {
      const res = await getOnboardingStatus();
      if (res.success && res.data?.isCompleted) {
        router.replace("/dashboard");
        return;
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const goTo = (step: Step) => setCurrentStep(step);

  const handleBusinessSubmit = async () => {
    if (!bizName.trim()) return;
    setSubmitting(true);
    await updateOrganizationOnboarding({ name: bizName, address: bizAddress, city: bizCity, phone: bizPhone });
    await completeOnboardingStep("business");
    setSubmitting(false);
    goTo("product");
  };

  const handleProductSubmit = async () => {
    setSubmitting(true);
    await completeOnboardingStep("product");
    setSubmitting(false);
    goTo("customer");
  };

  const handleCustomerSubmit = async () => {
    if (!customerName.trim()) {
      setSubmitting(false);
      goTo("invoice");
      return;
    }
    setSubmitting(true);
    await createCustomer({ name: customerName, phone: customerPhone });
    await completeOnboardingStep("customer");
    setSubmitting(false);
    goTo("invoice");
  };

  const handleInvoiceSkip = async () => {
    setSubmitting(true);
    await completeOnboardingStep("invoice");
    await finishOnboarding();
    setSubmitting(false);
    goTo("done");
  };

  const handleDone = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nexabook-50 to-white flex flex-col items-center justify-center p-4">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                currentIndex >= i
                  ? "bg-nexabook-900 text-white"
                  : "bg-nexabook-100 text-nexabook-400"
              }`}
            >
              <step.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-6 ${currentIndex > i ? "bg-nexabook-900" : "bg-nexabook-200"}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="w-full max-w-lg shadow-xl border-0">
        {currentStep === "business" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to NexaBook! 🎉</CardTitle>
              <CardDescription className="text-base">
                Let's set up your business in under 2 minutes. Start by telling us about your company.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-nexabook-700">Business Name *</label>
                <Input
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Al-Raza Traders"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-nexabook-700">Address</label>
                <Input
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  placeholder="Shop #5, Main Bazaar"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-nexabook-700">City</label>
                  <Input
                    value={bizCity}
                    onChange={(e) => setBizCity(e.target.value)}
                    placeholder="Karachi"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-nexabook-700">Phone</label>
                  <Input
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleBusinessSubmit} disabled={!bizName.trim() || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {currentStep === "product" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Add Your First Product</CardTitle>
              <CardDescription className="text-base">
                Add a product you sell, or skip this step if you provide services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-nexabook-700">Product Name</label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Office Chair"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-nexabook-700">Selling Price (PKR)</label>
                <Input
                  type="number"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="e.g. 15000"
                  className="mt-1"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={() => goTo("customer")}>
                <SkipForward className="h-4 w-4 mr-2" /> Skip
              </Button>
              <Button onClick={handleProductSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {currentStep === "customer" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Add Your First Customer</CardTitle>
              <CardDescription className="text-base">
                Add a customer so you can create invoices right away. You can skip this too!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-nexabook-700">Customer Name</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ali Traders"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-nexabook-700">Phone</label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="mt-1"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={() => goTo("invoice")}>
                <SkipForward className="h-4 w-4 mr-2" /> Skip
              </Button>
              <Button onClick={handleCustomerSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save & Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {currentStep === "invoice" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Create Your First Invoice</CardTitle>
              <CardDescription className="text-base">
                You're almost done! Create your first invoice to see how everything works, or skip to the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium">Quick start tips:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Go to <strong>Sales → Invoices</strong> to create your first invoice</li>
                  <li>Use <strong>Sales → Customers</strong> to manage your customers</li>
                  <li>Check <strong>Reports</strong> to see your business performance</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={handleInvoiceSkip}>
                <SkipForward className="h-4 w-4 mr-2" /> Skip to Dashboard
              </Button>
              <Button onClick={() => router.push("/sales/invoices/new")}>
                Create Invoice <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {currentStep === "done" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">You're All Set! 🚀</CardTitle>
              <CardDescription className="text-base">
                Your business is ready to go. Here's what you've accomplished:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Business profile created</span>
                </div>
                {productName && (
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>First product added</span>
                  </div>
                )}
                {customerName && (
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>First customer saved</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Chart of Accounts seeded</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleDone} size="lg">
                Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
