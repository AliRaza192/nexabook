"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Undo2, Loader2, ArrowLeft, Save, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCustomers, getSalesReturns } from "@/lib/actions/sales";

interface Customer { id: string; name: string; }
interface ReturnItem {
  id: string; returnNumber: string; refundAmount: string | null;
  customerId?: string; customer?: { id: string; name: string } | null;
}

export default function RefundPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [returnId, setReturnId] = useState("");
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split("T")[0]);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, rRes] = await Promise.all([getCustomers(), getSalesReturns(undefined, "approved")]);
        if (cRes.success && cRes.data) setCustomers(cRes.data as Customer[]);
        if (rRes.success && rRes.data) setReturns(rRes.data as ReturnItem[]);
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handleReturnSelect = (retId: string) => {
    setReturnId(retId);
    const ret = returns.find(r => r.id === retId);
    if (ret) {
      setAmount(ret.refundAmount || "0");
      if (ret.customerId) setCustomerId(ret.customerId);
      else if (ret.customer?.id) setCustomerId(ret.customer.id);
    }
  };

  const formatCurrency = (v: string | null) => v ? new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(parseFloat(v)) : "Rs. 0";

  const handleProcess = async () => {
    if (!customerId || !amount) { alert("Customer and amount are required"); return; }
    setSubmitting(true);
    try {
      // Create a settlement record for the refund
      const { createCustomerSettlement } = await import("@/lib/actions/sales");
      const res = await createCustomerSettlement({
        customerId, settlementDate: refundDate, paymentMethod: refundMethod as any,
        documents: returnId ? [{ documentId: returnId, documentType: "credit_note", originalAmount: amount, paidAmount: "0", balanceAmount: amount, discountAmount: "0", settlementAmount: amount }] : [],
        reference: reference || undefined, notes: notes || `Refund processed${returnId ? ` for return ${returns.find(r => r.id === returnId)?.returnNumber || ''}` : ''}`
      });
      if (res.success) { alert("Refund processed successfully"); router.push("/sales/returns"); }
      else alert(res.error || "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/sales/returns"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Undo2 className="h-5 w-5 text-orange-600" />Process Refund</h1></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Customer*</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Linked Return</Label><Select value={returnId} onValueChange={handleReturnSelect}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{returns.map(r => <SelectItem key={r.id} value={r.id}>{r.returnNumber} - {formatCurrency(r.refundAmount)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Refund Date*</Label><Input type="date" value={refundDate} onChange={e => setRefundDate(e.target.value)} className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Refund Method</Label><Select value={refundMethod} onValueChange={setRefundMethod}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="credit_card">Credit Card</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Amount*</Label><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ref #" className="h-9 text-xs" /></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4"><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Refund notes..." className="min-h-[80px] text-xs" /></CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Refund Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Refund Amount</span><span className="text-lg font-bold text-orange-600">{formatCurrency(amount || "0")}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Method</span><span className="text-sm font-semibold capitalize">{refundMethod.replace('_', ' ')}</span></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white h-10" disabled={submitting || !amount} onClick={handleProcess}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Save className="mr-2 h-4 w-4" />Process Refund</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/sales/returns")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
