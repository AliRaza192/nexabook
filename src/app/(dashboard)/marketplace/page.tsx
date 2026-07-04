"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Calculator,
  FileText,
  Package,
  Users,
  Receipt,
  Check,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FteProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  features: string[];
  priceMonthly: number;
  priceYearly: number | null;
  category: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  accounting: <Calculator className="h-8 w-8" />,
  tax: <Receipt className="h-8 w-8" />,
  inventory: <Package className="h-8 w-8" />,
  payroll: <FileText className="h-8 w-8" />,
  crm: <Users className="h-8 w-8" />,
};

const categoryColors: Record<string, string> = {
  accounting: "from-blue-500 to-blue-600",
  tax: "from-green-500 to-green-600",
  inventory: "from-purple-500 to-purple-600",
  payroll: "from-orange-500 to-orange-600",
  crm: "from-pink-500 to-pink-600",
};

export default function MarketplacePage() {
  const [products, setProducts] = useState<FteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/marketplace/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(product: FteProduct) {
    try {
      const res = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          billingCycle,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8" />
              <Badge className="bg-white/20 text-white border-white/30">
                AI-Powered
              </Badge>
            </div>
            <h1 className="text-4xl font-bold mb-4">Digital FTE Marketplace</h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              Hire AI workers that work 24/7 for your business. Pakistani accounting, tax,
              and inventory automation — no paid APIs required.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                billingCycle === "monthly"
                  ? "bg-white text-indigo-600"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                billingCycle === "yearly"
                  ? "bg-white text-indigo-600"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Yearly
              <span className="ml-1 text-xs bg-green-400 text-green-900 px-1.5 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-12 w-12 bg-slate-200 rounded-lg" />
                  <div className="h-6 w-48 bg-slate-200 rounded" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-2 hover:border-indigo-200">
                  <CardHeader>
                    <div
                      className={`h-12 w-12 rounded-lg bg-gradient-to-br ${
                        categoryColors[product.category] || "from-gray-500 to-gray-600"
                      } flex items-center justify-center text-white mb-2`}
                    >
                      {categoryIcons[product.category] || <Bot className="h-8 w-8" />}
                    </div>
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col h-full">
                    <p className="text-slate-600 dark:text-slate-400 mb-4 flex-grow">
                      {product.description}
                    </p>
                    <div className="space-y-2 mb-6">
                      {product.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-3xl font-bold">
                          ${billingCycle === "monthly" ? product.priceMonthly : Math.round((product.priceYearly || product.priceMonthly * 10) / 12)}
                        </span>
                        <span className="text-slate-500">/mo</span>
                        {billingCycle === "yearly" && product.priceYearly && (
                          <Badge className="ml-2 bg-green-100 text-green-700">
                            Save ${product.priceMonthly * 12 - product.priceYearly}
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={() => handleSubscribe(product)}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Subscribe Now
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
