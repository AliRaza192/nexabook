"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Handshake, Loader2, ArrowLeft, Save, X, Calculator } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getCustomers, getCustomerOutstandingInvoices, createCustomerSettlement, type SettlementFormData } from "@/lib/actions/sales";

interface Customer { id: string; name: string; }
interface OutstandingInvoice {
  id: string; invoiceNumber: string; issueDate: Date; dueDate: Date | null;
  netAmount: string | null; balanceAmount: string | null; status: string;
}

interface SettlementDoc {
  documentId: string; documentType: string; documentNumber: string; date: string;
  originalAmount: string; paidAmount: string; balanceAmount: string;
  discountAmount: string; adjustment: string; settlementAmount: string;
}

export default function SettlementPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque" | "online" | "credit_card" | "other">("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [settlementDocs, setSettlementDocs] = useState<SettlementDoc[]>([]);

  useEffect(() => {
    getCustomers().then(res => { if (res.success && res.data) setCustomers(res.data as Customer[]); setLoading(false); });
  }, []);

  const loadOutstanding = async (custId: string) => {
    setCustomerId(custId);
    if (!custId) { setOutstanding([]); setSettlementDocs([]); return; }
    const res = await getCustomerOutstandingInvoices(custId);
    if (res.success && res.data) {
      const invoices = res.data as OutstandingInvoice[];
      setOutstanding(invoices);
      setSettlementDocs(invoices.map(inv => ({
        documentId: inv.id, documentType: "invoice", documentNumber: inv.invoiceNumber,
        date: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("en-PK") : "",
        originalAmount: inv.netAmount || "0", paidAmount: "0",
        balanceAmount: inv.balanceAmount || "0", discountAmount: "0", adjustment: "0",
        settlementAmount: inv.balanceAmount || "0"
      })));
    }
  };

  const updateSettlementDoc = (index: number, field: string, value: string) => {
    const updated = [...settlementDocs];
    updated[index] = { ...updated[index], [field]: value };
    const balance = parseFloat(updated[index].balanceAmount || "0");
    const discount = parseFloat(updated[index].discountAmount || "0");
    const adjustment = parseFloat(updated[index].adjustment || "0");
    updated[index].settlementAmount = Math.max(0, balance - discount - adjustment).toFixed(2);
    setSettlementDocs(updated);
  };

  const totalOutstanding = settlementDocs.reduce((s, d) => s + parseFloat(d.balanceAmount || "0"), 0);
  const totalDiscount = settlementDocs.reduce((s, d) => s + parseFloat(d.discountAmount || "0"), 0);
  const totalSettlement = settlementDocs.reduce((s, d) => s + parseFloat(d.settlementAmount || "0"), 0);
  const formatCurrency = (v: string | number) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(typeof v === "string" ? parseFloat(v) : v);

  const handleSave = async () => {
    if (!customerId) { alert("Please select a customer"); return; }
    if (settlementDocs.length === 0) { alert("No documents to settle"); return; }
    setSubmitting(true);
    try {
      const data: SettlementFormData = {
        customerId, settlementDate, paymentMethod,
        documents: settlementDocs.map(d => ({
          documentId: d.documentId, documentType: d.documentType,
          originalAmount: d.originalAmount, paidAmount: d.paidAmount,
          balanceAmount: d.balanceAmount, discountAmount: d.discountAmount,
          settlementAmount: d.settlementAmount
        })),
        reference: reference || undefined, notes: notes || undefined
      };
      const res = await createCustomerSettlement(data);
      if (res.success) { alert("Settlement recorded successfully"); router.push("/sales/invoices"); }
      else alert(res.error || "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/sales/invoices"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Handshake className="h-5 w-5 text-purple-600" />Customer Settlement</h1></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Customer*</Label><Select value={customerId} onValueChange={loadOutstanding}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Settlement Date*</Label><Input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)} className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Payment Method*</Label><Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="credit_card">Credit Card</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            </div>
          </CardContent></Card>

          {settlementDocs.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <div className="p-3 border-b border-gray-200 bg-gray-50"><h3 className="text-sm font-semibold text-gray-900">Outstanding Documents ({settlementDocs.length})</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full"><thead><tr className="border-b border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50">
                  <th className="text-left py-2 px-3">Type</th><th className="text-left py-2 px-3">Document#</th>
                  <th className="text-left py-2 px-3">Date</th><th className="text-right py-2 px-3">Original</th>
                  <th className="text-right py-2 px-3">Balance</th><th className="text-right py-2 px-3">Discount</th>
                  <th className="text-right py-2 px-3">Adjustment</th><th className="text-right py-2 px-3">Settlement</th>
                </tr></thead><tbody>
                  {settlementDocs.map((doc, i) => (
                    <tr key={doc.documentId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs capitalize">{doc.documentType}</Badge></td>
                      <td className="py-2 px-3 text-sm font-medium">{doc.documentNumber}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">{doc.date}</td>
                      <td className="py-2 px-3 text-sm text-right">{formatCurrency(doc.originalAmount)}</td>
                      <td className="py-2 px-3 text-sm font-semibold text-right text-orange-600">{formatCurrency(doc.balanceAmount)}</td>
                      <td className="py-2 px-3 text-right"><Input type="number" min="0" step="0.01" value={doc.discountAmount} onChange={e => updateSettlementDoc(i, "discountAmount", e.target.value)} className="h-7 text-xs w-20 text-right" /></td>
                      <td className="py-2 px-3 text-right"><Input type="number" min="0" step="0.01" value={doc.adjustment} onChange={e => updateSettlementDoc(i, "adjustment", e.target.value)} className="h-7 text-xs w-20 text-right" /></td>
                      <td className="py-2 px-3 text-sm font-semibold text-right text-green-600">{formatCurrency(doc.settlementAmount)}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            </Card>
          )}

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ref #" className="h-9 text-xs" /></div>
            </div>
            <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-xs" /></div>
          </CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator className="h-4 w-4" />Settlement Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Outstanding</span><span className="text-sm font-semibold">{formatCurrency(totalOutstanding)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Discount</span><span className="text-sm font-semibold text-red-600">- {formatCurrency(totalDiscount)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Adjustment</span><span className="text-sm font-semibold text-red-600">- {formatCurrency(settlementDocs.reduce((s, d) => s + parseFloat(d.adjustment || "0"), 0))}</span></div>
              <div className="flex justify-between py-3 bg-purple-50 px-3 rounded-lg border border-purple-200 mt-3">
                <span className="text-sm font-bold text-purple-900">Net Payable</span><span className="text-xl font-bold text-purple-900">{formatCurrency(totalSettlement)}</span>
              </div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-10" disabled={submitting || settlementDocs.length === 0} onClick={handleSave}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Save className="mr-2 h-4 w-4" />Save Settlement</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/sales/invoices")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
