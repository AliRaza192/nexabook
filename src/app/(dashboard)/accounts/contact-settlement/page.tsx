"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, CheckCircle, Clock, HandCoins } from "lucide-react";
import {
  getMiscContactSettlements, addMiscContactSettlement, approveMiscContactSettlement,
  type MiscContactSettlementFormData,
} from "@/lib/actions/adjustments";
import { getBankAccounts } from "@/lib/actions/banking";

export default function ContactSettlementPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [setRes, bankRes] = await Promise.all([
      getMiscContactSettlements(searchQuery),
      getBankAccounts(),
    ]);
    if (setRes.success) setSettlements(setRes.data || []);
    if (bankRes.success) setBankAccounts(bankRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [searchQuery]);

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    const data: MiscContactSettlementFormData = {
      partyName: formData.get("partyName") as string,
      contactType: formData.get("contactType") as string,
      settlementDate: formData.get("settlementDate") as string,
      totalOutstanding: formData.get("totalOutstanding") as string,
      settledAmount: formData.get("settledAmount") as string,
      discountAmount: formData.get("discountAmount") as string,
      paymentMethod: formData.get("paymentMethod") as string,
      bankAccountId: formData.get("bankAccountId") as string,
      reference: formData.get("reference") as string,
      notes: formData.get("notes") as string,
    };
    const res = await addMiscContactSettlement(data);
    if (res.success) { setDialogOpen(false); loadData(); }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "outline", label: string, icon: any }> = {
      approved: { variant: "default", label: "Approved", icon: CheckCircle },
      pending_approval: { variant: "outline", label: "Pending", icon: Clock },
    };
    const c = config[status] || config.pending_approval;
    const Icon = c.icon;
    return <Badge variant={c.variant} className="gap-1"><Icon className="h-3 w-3" />{c.label}</Badge>;
  };

  if (loading && !settlements.length) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Contact Settlements</h1>
            <p className="text-nexabook-600 mt-1">Settle balances with miscellaneous contacts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-64" />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="h-4 w-4 mr-2" />New Settlement</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Record Contact Settlement</DialogTitle><DialogDescription>Settle miscellaneous contact balance</DialogDescription></DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Party Name*</Label><Input name="partyName" required /></div>
                    <div className="space-y-2"><Label>Type*</Label>
                      <select name="contactType" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                        <option value="capital_investment">Capital Investment</option>
                        <option value="loan_proceeds">Loan Proceeds</option>
                        <option value="loan_repayment">Loan Repayment</option>
                        <option value="owner_withdrawal">Owner Withdrawal</option>
                        <option value="dividend">Dividend</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Outstanding*</Label><Input name="totalOutstanding" type="number" step="0.01" required /></div>
                    <div className="space-y-2"><Label>Settled Amount*</Label><Input name="settledAmount" type="number" step="0.01" required /></div>
                    <div className="space-y-2"><Label>Discount</Label><Input name="discountAmount" type="number" step="0.01" defaultValue="0" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Settlement Date*</Label><Input name="settlementDate" type="date" required /></div>
                    <div className="space-y-2"><Label>Payment Method</Label>
                      <select name="paymentMethod" className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                        <option value="">Select</option>
                        <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Bank Account</Label>
                    <select name="bankAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                      <option value="">Select</option>
                      {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Reference</Label><Input name="reference" /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Submit"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Settlement #</TableHead><TableHead>Party</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Settled</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {settlements.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-nexabook-500">No settlements found</TableCell></TableRow> :
                settlements.map(set => (
                  <TableRow key={set.id}>
                    <TableCell className="font-medium">{set.settlementNumber}</TableCell>
                    <TableCell>{set.partyName}</TableCell>
                    <TableCell><Badge variant="outline">{set.contactType.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>{new Date(set.settlementDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">Rs. {parseFloat(set.totalOutstanding || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold">Rs. {parseFloat(set.settledAmount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(set.approvalStatus)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
