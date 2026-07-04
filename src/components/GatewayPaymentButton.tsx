"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";

interface GatewayPaymentButtonProps {
  amount: number;
  invoiceId?: string;
  customerId?: string;
  gateway: "jazzcash" | "easypaisa";
  label?: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
}

export function GatewayPaymentButton({
  amount,
  invoiceId,
  customerId,
  gateway,
  label,
  onSuccess,
  onError,
}: GatewayPaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          invoiceId,
          customerId,
          gateway,
          returnOrigin: window.location.pathname,
        }),
      });

      const data = await res.json();

      if (data.success && data.redirectUrl) {
        onSuccess?.(data.transactionId);
        sessionStorage.setItem("NXL_PENDING_PAYMENT", JSON.stringify({
          transactionId: data.transactionId,
          gateway,
          amount,
          returnUrl: window.location.pathname,
        }));
        window.location.href = data.redirectUrl;
      } else {
        onError?.(data.error || "Payment initiation failed");
      }
    } catch (err) {
      onError?.("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePay}
      disabled={loading}
      className={`w-full h-14 text-lg font-semibold gap-2 ${
        gateway === "jazzcash"
          ? "bg-red-700 hover:bg-red-800"
          : "bg-emerald-700 hover:bg-emerald-800"
      }`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <ExternalLink className="h-5 w-5" />
      )}
      {loading ? "Redirecting..." : label || (gateway === "jazzcash" ? "Pay with JazzCash" : "Pay with Easypaisa")}
    </Button>
  );
}
