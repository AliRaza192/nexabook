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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Loader2, Landmark, ArrowUpRight, ArrowDownLeft, Receipt, DollarSign,
  TrendingUp, TrendingDown, CheckCircle, Clock, XCircle,
} from "lucide-react";
import {
  getBankAccounts, addBankAccount, approveBankAccount, getBankDeposits, addBankDeposit, approveBankDeposit,
  getFundsTransfers, addFundsTransfer, approveFundsTransfer,
  getMiscContacts, addMiscContact, approveMiscContact,
  createContraEntry,
  type BankAccountFormData, type BankDepositFormData, type FundsTransferFormData, type MiscContactFormData,
} from "@/lib/actions/banking";
import { getBankAccounts as getAccountsForDropdown } from "@/lib/actions/banking";

export default function BankingPage() {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [miscContacts, setMiscContacts] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    const [accRes, depRes, transRes, miscRes, cashRes] = await Promise.all([
      getBankAccounts(searchQuery),
      getBankDeposits(searchQuery),
      getFundsTransfers(searchQuery),
      getMiscContacts(searchQuery),
      getAccountsForDropdown(searchQuery),
    ]);
    if (accRes.success) setBankAccounts(accRes.data || []);
    if (depRes.success) setDeposits(depRes.data || []);
    if (transRes.success) setTransfers(transRes.data || []);
    if (miscRes.success) setMiscContacts(miscRes.data || []);
    if (cashRes.success) {
      // Filter to get only cash accounts
      setCashAccounts((cashRes.data || []).filter((a: any) => a.accountType === 'cash'));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [searchQuery]);

  const openDialog = (key: string) => setDialogOpen(prev => ({ ...prev, [key]: true }));
  const closeDialog = (key: string) => setDialogOpen(prev => ({ ...prev, [key]: false }));

  // Bank Account Form
  const handleAddBankAccount = async (formData: FormData) => {
    setSubmitting(true);
    const data: BankAccountFormData = {
      accountName: formData.get("accountName") as string,
      iban: formData.get("iban") as string,
      accountNumber: formData.get("accountNumber") as string,
      branchName: formData.get("branchName") as string,
      bankName: formData.get("bankName") as string,
      accountType: formData.get("accountType") as string,
      openingBalance: formData.get("openingBalance") as string,
      currency: formData.get("currency") as string,
      notes: formData.get("notes") as string,
    };
    const res = await addBankAccount(data);
    if (res.success) { closeDialog("bankAccount"); loadData(); }
    setSubmitting(false);
  };

  // Deposit Form
  const handleAddDeposit = async (formData: FormData) => {
    setSubmitting(true);
    const data: BankDepositFormData = {
      bankAccountId: formData.get("bankAccountId") as string,
      depositType: formData.get("depositType") as "cash" | "cheque",
      amount: formData.get("amount") as string,
      depositDate: formData.get("depositDate") as string,
      reference: formData.get("reference") as string,
      chequeNumber: formData.get("chequeNumber") as string,
      chequeDate: formData.get("chequeDate") as string,
      drawnFrom: formData.get("drawnFrom") as string,
      notes: formData.get("notes") as string,
    };
    const res = await addBankDeposit(data);
    if (res.success) { closeDialog("deposit"); loadData(); }
    setSubmitting(false);
  };

  // Transfer Form
  const handleAddTransfer = async (formData: FormData) => {
    setSubmitting(true);
    const data: FundsTransferFormData = {
      transferType: formData.get("transferType") as any,
      fromBankAccountId: formData.get("fromBankAccountId") as string,
      toBankAccountId: formData.get("toBankAccountId") as string,
      amount: formData.get("amount") as string,
      transferDate: formData.get("transferDate") as string,
      reference: formData.get("reference") as string,
      notes: formData.get("notes") as string,
    };
    const res = await addFundsTransfer(data);
    if (res.success) { closeDialog("transfer"); loadData(); }
    setSubmitting(false);
  };

  // Misc Contact Form
  const handleAddMiscContact = async (formData: FormData) => {
    setSubmitting(true);
    const data: MiscContactFormData = {
      contactType: formData.get("contactType") as string,
      partyName: formData.get("partyName") as string,
      amount: formData.get("amount") as string,
      paymentMethod: formData.get("paymentMethod") as string,
      bankAccountId: formData.get("bankAccountId") as string,
      transactionDate: formData.get("transactionDate") as string,
      reference: formData.get("reference") as string,
      description: formData.get("description") as string,
    };
    const res = await addMiscContact(data);
    if (res.success) { closeDialog("miscContact"); loadData(); }
    setSubmitting(false);
  };

  // Contra Entry Form (Cash <-> Bank Transfer)
  const handleAddContraEntry = async (formData: FormData) => {
    setSubmitting(true);
    const data = {
      entryDate: formData.get("entryDate") as string,
      fromAccountId: formData.get("fromAccountId") as string,
      toAccountId: formData.get("toAccountId") as string,
      amount: formData.get("amount") as string,
      reference: formData.get("reference") as string,
      description: formData.get("description") as string,
    };
    const res = await createContraEntry(data);
    if (res.success) {
      alert(res.message);
      closeDialog("contraCashToBank");
      closeDialog("contraBankToCash");
      loadData();
    } else {
      alert(res.error || "Failed to create contra entry");
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon: any }> = {
      approved: { variant: "default", label: "Approved", icon: CheckCircle },
      pending_approval: { variant: "outline", label: "Pending", icon: Clock },
      rejected: { variant: "destructive", label: "Rejected", icon: XCircle },
    };
    const c = config[status] || config.pending_approval;
    const Icon = c.icon;
    return <Badge variant={c.variant} className="gap-1"><Icon className="h-3 w-3" />{c.label}</Badge>;
  };

  const totalBalance = bankAccounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0);
  const totalCash = bankAccounts.filter(a => a.accountType === "cash").reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0);
  const totalBank = bankAccounts.filter(a => a.accountType !== "cash").reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0);

  if (loading && !bankAccounts.length) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Banking & Fund Management</h1>
            <p className="text-nexabook-600 mt-1">Manage bank accounts, deposits, transfers, and collections</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-64" />
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-nexabook-600">Total Balance</p>
                <p className="text-2xl font-bold text-nexabook-900">Rs. {totalBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-nexabook-100 flex items-center justify-center"><DollarSign className="h-6 w-6 text-nexabook-700" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-nexabook-600">Cash in Hand</p>
                <p className="text-2xl font-bold text-nexabook-900">Rs. {totalCash.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-green-700" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-nexabook-600">Bank Balance</p>
                <p className="text-2xl font-bold text-nexabook-900">Rs. {totalBank.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center"><Landmark className="h-6 w-6 text-blue-700" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contra Entry Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Transfers</CardTitle>
          <p className="text-sm text-nexabook-600">Transfer funds between Cash and Bank accounts</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cash to Bank */}
            <Dialog open={dialogOpen.contraCashToBank} onOpenChange={(v) => setDialogOpen(prev => ({ ...prev, contraCashToBank: v }))}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 h-auto py-4 px-6 flex flex-col items-start">
                  <ArrowUpRight className="h-5 w-5 mb-2" />
                  <span className="font-semibold">Cash to Bank Transfer</span>
                  <span className="text-xs text-green-100">Deposit cash into bank account</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Cash to Bank Transfer</DialogTitle>
                  <DialogDescription>Transfer funds from cash account to bank account</DialogDescription>
                </DialogHeader>
                <form action={handleAddContraEntry} className="space-y-4">
                  <div className="space-y-2"><Label>Date*</Label><Input name="entryDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required /></div>
                  <div className="space-y-2"><Label>From Cash Account*</Label>
                    <select name="fromAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                      <option value="">Select cash account</option>
                      {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>To Bank Account*</Label>
                    <select name="toAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                      <option value="">Select bank account</option>
                      {bankAccounts.filter(a => a.accountType !== 'cash').map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Amount*</Label><Input name="amount" type="number" step="0.01" min="0.01" required /></div>
                  <div className="space-y-2"><Label>Reference</Label><Input name="reference" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} /></div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => closeDialog("contraCashToBank")}>Cancel</Button>
                    <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Transfer"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Bank to Cash */}
            <Dialog open={dialogOpen.contraBankToCash} onOpenChange={(v) => setDialogOpen(prev => ({ ...prev, contraBankToCash: v }))}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 h-auto py-4 px-6 flex flex-col items-start">
                  <ArrowDownLeft className="h-5 w-5 mb-2" />
                  <span className="font-semibold">Bank to Cash Withdrawal</span>
                  <span className="text-xs text-blue-100">Withdraw cash from bank account</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bank to Cash Withdrawal</DialogTitle>
                  <DialogDescription>Withdraw funds from bank account to cash</DialogDescription>
                </DialogHeader>
                <form action={handleAddContraEntry} className="space-y-4">
                  <div className="space-y-2"><Label>Date*</Label><Input name="entryDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required /></div>
                  <div className="space-y-2"><Label>From Bank Account*</Label>
                    <select name="fromAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                      <option value="">Select bank account</option>
                      {bankAccounts.filter(a => a.accountType !== 'cash').map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>To Cash Account*</Label>
                    <select name="toAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                      <option value="">Select cash account</option>
                      {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Amount*</Label><Input name="amount" type="number" step="0.01" min="0.01" required /></div>
                  <div className="space-y-2"><Label>Reference</Label><Input name="reference" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} /></div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => closeDialog("contraBankToCash")}>Cancel</Button>
                    <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Withdrawal"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="accounts">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        {/* BANK ACCOUNTS TAB */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bank Accounts</CardTitle>
              <Dialog open={dialogOpen.bankAccount} onOpenChange={(v) => setDialogOpen(prev => ({ ...prev, bankAccount: v }))}>
                <DialogTrigger asChild><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="h-4 w-4 mr-2" />Add Account</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add Bank Account</DialogTitle><DialogDescription>Create a new bank or cash account</DialogDescription></DialogHeader>
                  <form action={handleAddBankAccount} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Account Name*</Label><Input name="accountName" required /></div>
                      <div className="space-y-2"><Label>Account Number*</Label><Input name="accountNumber" required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>IBAN</Label><Input name="iban" /></div>
                      <div className="space-y-2"><Label>Account Type</Label>
                        <select name="accountType" className="w-full rounded-md border border-nexabook-200 px-3 py-2" defaultValue="checking">
                          <option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Bank Name</Label><Input name="bankName" /></div>
                      <div className="space-y-2"><Label>Branch</Label><Input name="branchName" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Opening Balance</Label><Input name="openingBalance" type="number" step="0.01" defaultValue="0" /></div>
                      <div className="space-y-2"><Label>Currency</Label><Input name="currency" defaultValue="PKR" /></div>
                    </div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => closeDialog("bankAccount")}>Cancel</Button>
                      <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Approve"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Bank/Branch</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {bankAccounts.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-nexabook-500">No bank accounts found</TableCell></TableRow> :
                    bankAccounts.map(acc => (
                      <TableRow key={acc.id}>
                        <TableCell><div><p className="font-medium">{acc.accountName}</p><p className="text-xs text-nexabook-500">{acc.accountNumber}</p></div></TableCell>
                        <TableCell><div>{acc.bankName || "-"}</div><p className="text-xs text-nexabook-500">{acc.branchName || "-"}</p></TableCell>
                        <TableCell><Badge variant="outline">{acc.accountType}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">Rs. {parseFloat(acc.currentBalance || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{getStatusBadge(acc.approvalStatus)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPOSITS TAB */}
        <TabsContent value="deposits" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bank Deposits</CardTitle>
              <Dialog open={dialogOpen.deposit} onOpenChange={(v) => setDialogOpen(prev => ({ ...prev, deposit: v }))}>
                <DialogTrigger asChild><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="h-4 w-4 mr-2" />Record Deposit</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Record Bank Deposit</DialogTitle><DialogDescription>Deposit cash or cheque into bank account</DialogDescription></DialogHeader>
                  <form action={handleAddDeposit} className="space-y-4">
                    <div className="space-y-2"><Label>Bank Account*</Label>
                      <select name="bankAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                        <option value="">Select account</option>
                        {bankAccounts.filter(a => a.accountType !== "cash").map(a => <option key={a.id} value={a.id}>{a.accountName} ({a.currentBalance})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Deposit Type*</Label>
                        <select name="depositType" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                          <option value="cash">Cash</option><option value="cheque">Cheque</option>
                        </select>
                      </div>
                      <div className="space-y-2"><Label>Amount*</Label><Input name="amount" type="number" step="0.01" required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Deposit Date*</Label><Input name="depositDate" type="date" required /></div>
                      <div className="space-y-2"><Label>Drawn From</Label><Input name="drawnFrom" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Cheque Number</Label><Input name="chequeNumber" /></div>
                      <div className="space-y-2"><Label>Cheque Date</Label><Input name="chequeDate" type="date" /></div>
                    </div>
                    <div className="space-y-2"><Label>Reference</Label><Input name="reference" /></div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => closeDialog("deposit")}>Cancel</Button>
                      <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Deposit #</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {deposits.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-nexabook-500">No deposits found</TableCell></TableRow> :
                    deposits.map(dep => (
                      <TableRow key={dep.id}>
                        <TableCell className="font-medium">{dep.depositNumber}</TableCell>
                        <TableCell>{bankAccounts.find(a => a.id === dep.bankAccountId)?.accountName || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{dep.depositType}</Badge></TableCell>
                        <TableCell>{new Date(dep.depositDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">Rs. {parseFloat(dep.amount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{getStatusBadge(dep.approvalStatus)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSFERS TAB */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Funds Transfers</CardTitle>
              <Dialog open={dialogOpen.transfer} onOpenChange={(v) => setDialogOpen(prev => ({ ...prev, transfer: v }))}>
                <DialogTrigger asChild><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="h-4 w-4 mr-2" />New Transfer</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Funds Transfer</DialogTitle><DialogDescription>Transfer funds between accounts</DialogDescription></DialogHeader>
                  <form action={handleAddTransfer} className="space-y-4">
                    <div className="space-y-2"><Label>Transfer Type*</Label>
                      <select name="transferType" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                        <option value="bank_to_bank">Bank to Bank</option>
                        <option value="cash_to_bank">Cash to Bank</option>
                        <option value="bank_to_cash">Bank to Cash</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>From Account*</Label>
                        <select name="fromBankAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                          <option value="">Select</option>
                          {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName} ({a.currentBalance})</option>)}
                        </select>
                      </div>
                      <div className="space-y-2"><Label>To Account*</Label>
                        <select name="toBankAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                          <option value="">Select</option>
                          {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Amount*</Label><Input name="amount" type="number" step="0.01" required /></div>
                      <div className="space-y-2"><Label>Transfer Date*</Label><Input name="transferDate" type="date" required /></div>
                    </div>
                    <div className="space-y-2"><Label>Reference</Label><Input name="reference" /></div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => closeDialog("transfer")}>Cancel</Button>
                      <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Transfer #</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transfers.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-nexabook-500">No transfers found</TableCell></TableRow> :
                    transfers.map(tr => (
                      <TableRow key={tr.id}>
                        <TableCell className="font-medium">{tr.transferNumber}</TableCell>
                        <TableCell><Badge variant="outline">{tr.transferType.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell>{bankAccounts.find(a => a.id === tr.fromBankAccountId)?.accountName || "-"}</TableCell>
                        <TableCell>{bankAccounts.find(a => a.id === tr.toBankAccountId)?.accountName || "-"}</TableCell>
                        <TableCell className="text-right font-semibold">Rs. {parseFloat(tr.amount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{getStatusBadge(tr.approvalStatus)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COLLECTIONS TAB */}
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Other Collections & Payments</CardTitle>
              <Dialog open={dialogOpen.miscContact} onOpenChange={(v) => setDialogOpen(prev => ({ ...prev, miscContact: v }))}>
                <DialogTrigger asChild><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="h-4 w-4 mr-2" />Record Transaction</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Record Collection/Payment</DialogTitle><DialogDescription>Non-customer/non-vendor transactions</DialogDescription></DialogHeader>
                  <form action={handleAddMiscContact} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                      <div className="space-y-2"><Label>Party Name*</Label><Input name="partyName" required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Amount*</Label><Input name="amount" type="number" step="0.01" required /></div>
                      <div className="space-y-2"><Label>Payment Method*</Label>
                        <select name="paymentMethod" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                          <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Bank Account</Label>
                      <select name="bankAccountId" className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                        <option value="">Select (optional)</option>
                        {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2"><Label>Transaction Date*</Label><Input name="transactionDate" type="date" required /></div>
                    <div className="space-y-2"><Label>Reference</Label><Input name="reference" /></div>
                    <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={2} /></div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => closeDialog("miscContact")}>Cancel</Button>
                      <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Ref #</TableHead><TableHead>Type</TableHead><TableHead>Party</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {miscContacts.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-nexabook-500">No transactions found</TableCell></TableRow> :
                    miscContacts.map(mc => (
                      <TableRow key={mc.id}>
                        <TableCell className="font-medium">{mc.referenceNumber}</TableCell>
                        <TableCell><Badge variant="outline">{mc.contactType.replace(/_/g, " ")}</Badge></TableCell>
                        <TableCell>{mc.partyName}</TableCell>
                        <TableCell>{new Date(mc.transactionDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">Rs. {parseFloat(mc.amount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{getStatusBadge(mc.approvalStatus)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
