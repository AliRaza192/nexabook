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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVendors, getPurchaseInvoices, createVendorSettlement } from "@/lib/actions/purchases";

interface Vendor { id: string; name: string; }
interface SettlementDoc { documentId: string; documentType: string; documentNumber: string; date: string; originalAmount: string; paidAmount: string; balanceAmount: string; discountAmount: string; settlementAmount: string; }

export default function VendorSettlementPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque" | "online" | "credit_card" | "other">("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<SettlementDoc[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorsRes, invoicesRes] = await Promise.all([getVendors(), getPurchaseInvoices()]);
        if (vendorsRes.success && vendorsRes.data) setVendors(vendorsRes.data as Vendor[]);
        if (invoicesRes.success && invoicesRes.data) setInvoices(invoicesRes.data as any[]);
      } catch (error) {} finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handleVendorSelect = (vId: string) => {
    setVendorId(vId);
    const vendorInvoices = (invoices as any[]).filter(inv => (inv as any).vendorId === vId && (inv.status === 'Approved' || inv.status === 'Sent'));
    const docs: SettlementDoc[] = vendorInvoices.map(inv => ({
      documentId: inv.id,
      documentType: 'invoice',
      documentNumber: inv.billNumber,
      date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : '',
      originalAmount: inv.netAmount || '0',
      paidAmount: '0',
      balanceAmount: inv.netAmount || '0',
      discountAmount: '0',
      settlementAmount: inv.netAmount || '0',
    }));
    setDocuments(docs);
  };

  const updateDocument = (index: number, field: keyof SettlementDoc, value: string) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate settlement amount
    const doc = updated[index];
    const balance = parseFloat(doc.balanceAmount || '0');
    const discount = parseFloat(doc.discountAmount || '0');
    if (field === 'discountAmount') {
      updated[index].settlementAmount = Math.max(0, balance - discount).toFixed(2);
    }
    setDocuments(updated);
  };

  const totalOutstanding = documents.reduce((sum, doc) => sum + parseFloat(doc.balanceAmount || '0'), 0);
  const totalDiscount = documents.reduce((sum, doc) => sum + parseFloat(doc.discountAmount || '0'), 0);
  const totalSettlement = documents.reduce((sum, doc) => sum + parseFloat(doc.settlementAmount || '0'), 0);
  const netPayable = totalSettlement;

  const formatCurrency = (v: string | null) => v ? new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(parseFloat(v)) : "Rs. 0";

  const handleSave = async () => {
    if (!vendorId) { alert("Please select a vendor"); return; }
    if (documents.length === 0) { alert("No documents to settle"); return; }
    setSubmitting(true);
    try {
      const res = await createVendorSettlement({
        vendorId,
        settlementDate,
        paymentMethod,
        documents: documents.map(doc => ({
          documentId: doc.documentId,
          documentType: doc.documentType,
          originalAmount: doc.originalAmount,
          paidAmount: doc.paidAmount,
          balanceAmount: doc.balanceAmount,
          discountAmount: doc.discountAmount,
          settlementAmount: doc.settlementAmount,
        })),
        reference: reference || undefined,
        notes: notes || undefined,
      });
      if (res.success) { alert("Settlement completed successfully!"); router.push("/purchases/invoices"); }
      else alert(res.error || "Failed");
    } catch (error) { alert("Failed to create settlement"); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/purchases/invoices"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Handshake className="h-5 w-5 text-purple-600" />Vendor Settlement</h1></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Vendor*</Label><Select value={vendorId} onValueChange={handleVendorSelect}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Settlement Date*</Label><Input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)} className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Payment Method*</Label><Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="credit_card">Credit Card</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ref #" className="h-9 text-xs" /></div>
            </div>
          </CardContent></Card>

          {documents.length > 0 && (
            <Card className="border-gray-200 shadow-sm">
              <div className="p-3 border-b border-gray-200 bg-gray-50"><h3 className="text-sm font-semibold text-gray-900">Outstanding Documents ({documents.length})</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full"><thead><tr className="border-b border-gray-200 text-xs font-semibold text-gray-700 bg-gray-50">
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Document#</th>
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Original</th>
                  <th className="text-left py-2 px-3">Balance</th>
                  <th className="text-left py-2 px-3">Discount</th>
                  <th className="text-left py-2 px-3">Settlement Amt</th>
                </tr></thead><tbody>
                  {documents.map((doc, i) => (
                    <tr key={doc.documentId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs capitalize">{doc.documentType}</Badge></td>
                      <td className="py-2 px-3 text-sm font-medium">{doc.documentNumber}</td>
                      <td className="py-2 px-3 text-sm text-gray-600">{doc.date}</td>
                      <td className="py-2 px-3 text-sm font-semibold">{formatCurrency(doc.originalAmount)}</td>
                      <td className="py-2 px-3 text-sm font-semibold text-orange-600">{formatCurrency(doc.balanceAmount)}</td>
                      <td className="py-2 px-3"><Input type="number" min="0" max={doc.balanceAmount} step="0.01" value={doc.discountAmount} onChange={e => updateDocument(i, "discountAmount", e.target.value)} className="h-7 text-xs w-24" /></td>
                      <td className="py-2 px-3"><div className="h-7 px-2 flex items-center bg-blue-50 rounded border border-blue-200"><span className="text-xs font-semibold text-blue-700">{formatCurrency(doc.settlementAmount)}</span></div></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            </Card>
          )}

          {documents.length === 0 && vendorId && (
            <Card className="border-gray-200 shadow-sm"><CardContent className="p-6 text-center text-gray-500">No outstanding documents found for this vendor.</CardContent></Card>
          )}

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4"><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-xs" /></CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator className="h-4 w-4" />Settlement Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Outstanding</span><span className="text-sm font-semibold">{formatCurrency(totalOutstanding.toFixed(2))}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Discount</span><span className="text-sm font-semibold text-green-600">- {formatCurrency(totalDiscount.toFixed(2))}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Settlement</span><span className="text-sm font-semibold">{formatCurrency(totalSettlement.toFixed(2))}</span></div>
              <div className="flex justify-between py-3 bg-purple-50 px-3 rounded-lg border border-purple-200 mt-3">
                <span className="text-sm font-bold text-purple-900">Net Payable</span>
                <span className="text-xl font-bold text-purple-900">{formatCurrency(netPayable.toFixed(2))}</span>
              </div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-10" disabled={submitting || documents.length === 0} onClick={handleSave}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Save className="mr-2 h-4 w-4" />Save Settlement</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/purchases/invoices")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}