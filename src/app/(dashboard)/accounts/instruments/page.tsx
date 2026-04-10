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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Loader2, FileCheck, DollarSign, Calendar, Building, AlertTriangle, CheckCircle, X,
} from "lucide-react";
import {
  getPdcInstruments, getPdcInstrumentsDashboard, addPdcInstrument, updatePdcStatus,
  getCustomersForDropdown, getVendorsForDropdown,
  type PdcInstrumentFormData,
} from "@/lib/actions/adjustments";
import { getBankAccounts } from "@/lib/actions/banking";

export default function PdcInstrumentsPage() {
  const [instruments, setInstruments] = useState<any[]>([]);
  const [stats, setStats] = useState({ received: 0, deposited: 0, cleared: 0, bounced: 0, totalAmount: 0 });
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bounceDialogOpen, setBounceDialogOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<string>("");
  const [bounceReason, setBounceReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [dashRes, custRes, vendRes, bankRes] = await Promise.all([
      getPdcInstrumentsDashboard(),
      getCustomersForDropdown(),
      getVendorsForDropdown(),
      getBankAccounts(),
    ]);
    if (dashRes.success && dashRes.data) {
      setInstruments(dashRes.data.instruments || []);
      setStats(dashRes.data.stats || {});
    }
    if (custRes.success) setCustomers(custRes.data || []);
    if (vendRes.success) setVendors(vendRes.data || []);
    if (bankRes.success) setBankAccounts(bankRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    const data: PdcInstrumentFormData = {
      instrumentType: formData.get("instrumentType") as string,
      partyType: formData.get("partyType") as "customer" | "vendor",
      customerId: formData.get("customerId") as string,
      vendorId: formData.get("vendorId") as string,
      bankAccountId: formData.get("bankAccountId") as string,
      amount: formData.get("amount") as string,
      issueDate: formData.get("issueDate") as string,
      chequeDate: formData.get("chequeDate") as string,
      bankName: formData.get("bankName") as string,
      branchName: formData.get("branchName") as string,
      reference: formData.get("reference") as string,
      notes: formData.get("notes") as string,
    };
    const res = await addPdcInstrument(data);
    if (res.success) { setDialogOpen(false); loadData(); }
    setSubmitting(false);
  };

  const handleStatusUpdate = async (status: "deposited" | "cleared" | "bounced") => {
    if (!selectedInstrument) return;
    const res = await updatePdcStatus(selectedInstrument, status, status === "bounced" ? bounceReason : undefined);
    if (res.success) { setBounceDialogOpen(false); setSelectedInstrument(""); setBounceReason(""); loadData(); }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon: any, color: string }> = {
      received: { variant: "outline", label: "Received", icon: FileCheck, color: "text-blue-600" },
      deposited: { variant: "secondary", label: "Deposited", icon: DollarSign, color: "text-yellow-600" },
      cleared: { variant: "default", label: "Cleared", icon: CheckCircle, color: "text-green-600" },
      bounced: { variant: "destructive", label: "Bounced", icon: AlertTriangle, color: "text-red-600" },
    };
    const c = config[status] || config.received;
    const Icon = c.icon;
    return <Badge variant={c.variant} className="gap-1"><Icon className="h-3 w-3" />{c.label}</Badge>;
  };

  const getFilteredInstruments = (status: string) => instruments.filter(i => i.status === status);

  if (loading && !instruments.length) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">PDC Instruments</h1>
            <p className="text-nexabook-600 mt-1">Track post-dated cheques and payment instruments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="h-4 w-4 mr-2" />Record PDC</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Record PDC Instrument</DialogTitle><DialogDescription>Track post-dated cheque</DialogDescription></DialogHeader>
              <form action={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Party Type*</Label>
                    <select name="partyType" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                      <option value="customer">Customer</option><option value="vendor">Vendor</option>
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Instrument Type*</Label>
                    <select name="instrumentType" className="w-full rounded-md border border-nexabook-200 px-3 py-2" defaultValue="cheque">
                      <option value="cheque">Cheque</option><option value="dd">Demand Draft</option><option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Customer</Label>
                    <select name="customerId" className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                      <option value="">Select</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Vendor</Label>
                    <select name="vendorId" className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                      <option value="">Select</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Amount*</Label><Input name="amount" type="number" step="0.01" required /></div>
                  <div className="space-y-2"><Label>Bank Account</Label>
                    <select name="bankAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                      <option value="">Select</option>{bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Issue Date*</Label><Input name="issueDate" type="date" required /></div>
                  <div className="space-y-2"><Label>Cheque Date*</Label><Input name="chequeDate" type="date" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Bank Name</Label><Input name="bankName" /></div>
                  <div className="space-y-2"><Label>Branch</Label><Input name="branchName" /></div>
                </div>
                <div className="space-y-2"><Label>Reference</Label><Input name="reference" /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center"><FileCheck className="h-6 w-6 mx-auto mb-2 text-blue-600" /><p className="text-2xl font-bold">{stats.received}</p><p className="text-sm text-nexabook-600">Received</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><DollarSign className="h-6 w-6 mx-auto mb-2 text-yellow-600" /><p className="text-2xl font-bold">{stats.deposited}</p><p className="text-sm text-nexabook-600">Deposited</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" /><p className="text-2xl font-bold">{stats.cleared}</p><p className="text-sm text-nexabook-600">Cleared</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-600" /><p className="text-2xl font-bold">{stats.bounced}</p><p className="text-sm text-nexabook-600">Bounced</p></CardContent></Card>
        <Card className="col-span-2 md:col-span-1"><CardContent className="p-4 text-center"><DollarSign className="h-6 w-6 mx-auto mb-2 text-nexabook-700" /><p className="text-xl font-bold">Rs. {stats.totalAmount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p><p className="text-sm text-nexabook-600">Total</p></CardContent></Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({instruments.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({stats.received})</TabsTrigger>
          <TabsTrigger value="deposited">Deposited ({stats.deposited})</TabsTrigger>
          <TabsTrigger value="cleared">Cleared ({stats.cleared})</TabsTrigger>
          <TabsTrigger value="bounced">Bounced ({stats.bounced})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card><CardContent className="p-0"><PdcTable instruments={instruments} getStatusBadge={getStatusBadge} handleStatusUpdate={handleStatusUpdate} setSelectedInstrument={setSelectedInstrument} setBounceDialogOpen={setBounceDialogOpen} /></CardContent></Card>
        </TabsContent>
        {["received", "deposited", "cleared", "bounced"].map(status => (
          <TabsContent key={status} value={status}>
            <Card><CardContent className="p-0"><PdcTable instruments={getFilteredInstruments(status)} getStatusBadge={getStatusBadge} handleStatusUpdate={handleStatusUpdate} setSelectedInstrument={setSelectedInstrument} setBounceDialogOpen={setBounceDialogOpen} /></CardContent></Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Bounce Reason Dialog */}
      <Dialog open={bounceDialogOpen} onOpenChange={setBounceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bounce Reason</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Enter bounce reason..." value={bounceReason} onChange={e => setBounceReason(e.target.value)} rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setBounceDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleStatusUpdate("bounced")}>Confirm Bounced</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PdcTable({ instruments, getStatusBadge, handleStatusUpdate, setSelectedInstrument, setBounceDialogOpen }: any) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Instrument #</TableHead><TableHead>Party</TableHead><TableHead>Bank</TableHead><TableHead>Cheque Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {instruments.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-nexabook-500">No instruments found</TableCell></TableRow> :
          instruments.map((inst: any) => (
            <TableRow key={inst.id}>
              <TableCell className="font-medium">{inst.instrumentNumber}</TableCell>
              <TableCell>{inst.partyType === "customer" ? inst.customerId : inst.vendorId ? "Vendor" : "-"}</TableCell>
              <TableCell><div>{inst.bankName || "-"}</div><p className="text-xs text-nexabook-500">{inst.branchName || ""}</p></TableCell>
              <TableCell>{new Date(inst.chequeDate).toLocaleDateString()}</TableCell>
              <TableCell className="text-right font-semibold">Rs. {parseFloat(inst.amount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell>{getStatusBadge(inst.status)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {inst.status === "received" && <Button size="sm" variant="outline" onClick={() => handleStatusUpdate("deposited")}>Deposit</Button>}
                  {inst.status === "deposited" && <Button size="sm" variant="outline" onClick={() => handleStatusUpdate("cleared")}>Clear</Button>}
                  {(inst.status === "received" || inst.status === "deposited") && <Button size="sm" variant="destructive" onClick={() => { setSelectedInstrument(inst.id); setBounceDialogOpen(true); }}>Bounce</Button>}
                </div>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
