"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DollarSign, Loader2, ArrowLeft, Save, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVendors, createVendorPayment, getVendorOutstandingInvoices, type VendorPaymentFormData } from "@/lib/actions/purchases";

interface Vendor { id: string; name: string; }
interface OutstandingInvoice {
  id: string; billNumber: string; date: Date; dueDate: Date | null;
  netAmount: string | null; originalAmount: string | null; paidAmount: string | null;
  balanceAmount: string | null; status: string;
}

export default function VendorPaymentsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque" | "online" | "credit_card" | "other">("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  useEffect(() => {
    getVendors().then(res => { if (res.success && res.data) setVendors(res.data as Vendor[]); setLoading(false); });
  }, []);

  const loadOutstanding = async (vId: string) => {
    setVendorId(vId);
    if (!vId) { setOutstanding([]); return; }
    const res = await getVendorOutstandingInvoices(vId);
    if (res.success && res.data) {
      setOutstanding(res.data as OutstandingInvoice[]);
      const allocs: Record<string, string> = {};
      (res.data as OutstandingInvoice[]).forEach(inv => { allocs[inv.id] = inv.balanceAmount || "0"; });
      setAllocations(allocs);
    }
  };

  const totalAllocated = Object.values(allocations).reduce((s, a) => s + parseFloat(a || "0"), 0);
  const paymentAmount = parseFloat(amount || "0");
  const unallocated = paymentAmount - totalAllocated;
  const formatCurrency = (v: string | null) => v ? new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(parseFloat(v)) : "Rs. 0";
  const formatDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }) : "N/A";

  const handleSave = async () => {
    if (!vendorId) { alert("Please select a vendor"); return; }
    if (!amount || parseFloat(amount) <= 0) { alert("Please enter payment amount"); return; }
    setSubmitting(true);
    try {
      const allocs = Object.entries(allocations).filter(([_, a]) => parseFloat(a || "0") > 0).map(([invoiceId, a]) => ({ invoiceId, amount: a }));
      const data: VendorPaymentFormData = {
        vendorId, paymentDate, paymentMethod, amount,
        reference: reference || undefined, notes: notes || undefined,
        allocations: allocs.length > 0 ? allocs : undefined
      };
      const res = await createVendorPayment(data);
      if (res.success) { alert("Payment recorded successfully"); router.push("/purchases/invoices"); }
      else alert(res.error || "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/purchases/invoices"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600" />Make Payment to Vendor</h1></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Vendor*</Label><Select value={vendorId} onValueChange={loadOutstanding}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Payment Date*</Label><Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Payment Method*</Label><Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="credit_card">Credit Card</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Amount*</Label><Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-9 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reference #</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ref #" className="h-9 text-xs" /></div>
            </div>
          </CardContent></Card>

          {outstanding.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <div className="p-3 border-b border-gray-200 bg-gray-50"><h3 className="text-sm font-semibold text-gray-900">Outstanding Invoices ({outstanding.length})</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full"><thead><tr className="border-b border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50">
                  <th className="text-left py-2 px-3">Invoice#</th><th className="text-left py-2 px-3">Date</th><th className="text-left py-2 px-3">Due Date</th>
                  <th className="text-left py-2 px-3">Original</th><th className="text-left py-2 px-3">Paid</th><th className="text-left py-2 px-3">Balance</th><th className="text-left py-2 px-3">Allocate</th>
                </tr></thead><tbody>
                  {outstanding.map(inv => (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm font-medium">{inv.billNumber}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">{formatDate(inv.date)}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                      <td className="py-2 px-3 text-sm font-semibold">{formatCurrency(inv.originalAmount || inv.netAmount)}</td>
                      <td className="py-2 px-3 text-sm text-green-600">{formatCurrency(inv.paidAmount)}</td>
                      <td className="py-2 px-3 text-sm font-semibold text-orange-600">{formatCurrency(inv.balanceAmount)}</td>
                      <td className="py-2 px-3"><Input type="number" min="0" max={inv.balanceAmount || "0"} step="0.01" value={allocations[inv.id] || "0"} onChange={e => setAllocations(prev => ({ ...prev, [inv.id]: e.target.value }))} className="h-7 text-xs w-28" /></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm font-semibold">Total Allocated: <span className="text-blue-600">{formatCurrency(totalAllocated.toFixed(2))}</span></span>
                {unallocated !== 0 && <span className={`text-xs flex items-center gap-1 ${unallocated > 0 ? "text-orange-600" : "text-red-600"}`}><AlertTriangle className="h-3 w-3" />{unallocated > 0 ? `${formatCurrency(unallocated.toFixed(2))} unallocated` : "Over-allocated"}</span>}
              </div>
            </Card>
          )}

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4"><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-xs" /></CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Payment Amount</span><span className="text-sm font-semibold">{formatCurrency(amount || "0")}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Allocated</span><span className="text-sm font-semibold">{formatCurrency(totalAllocated.toFixed(2))}</span></div>
              <div className={`flex justify-between py-3 px-3 rounded-lg border mt-3 ${unallocated === 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
                <span className="text-sm font-bold">Unallocated</span><span className={`text-xl font-bold ${unallocated === 0 ? "text-green-600" : "text-orange-600"}`}>{formatCurrency(unallocated.toFixed(2))}</span>
              </div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-10" disabled={submitting || !amount} onClick={handleSave}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Save className="mr-2 h-4 w-4" />Save Payment</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/purchases/invoices")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}