"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Link2, Unlink, RefreshCw, Loader2, CheckCircle2,
  AlertCircle, Building2, Clock, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  getBankConnections, createBankConnection, deleteBankConnection, syncBankTransactions,
} from "@/lib/actions/bank-feeds";
import { getBankAccounts } from "@/lib/actions/banking";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  disconnected: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
};

const PROVIDER_LABELS: Record<string, string> = {
  plaid: "Plaid",
  saltedge: "Salt Edge",
  finverse: "Finverse",
  mock: "Mock Bank (Test)",
  manual: "Manual Import",
};

export default function BankFeedsSettingsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ bankAccountId: string; provider: string }>({ bankAccountId: "", provider: "mock" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [connRes, bankRes] = await Promise.all([getBankConnections(), getBankAccounts()]);
    if (connRes.success) setConnections(connRes.data);
    if (bankRes.success) setAccounts(bankRes.data as any);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.bankAccountId) return;
    setSubmitting(true);
    const res = await createBankConnection({ bankAccountId: form.bankAccountId, provider: form.provider });
    setSubmitting(false);
    if (res.success) { setDialogOpen(false); loadAll(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this bank connection?")) return;
    const res = await deleteBankConnection(id);
    if (res.success) loadAll();
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    const res = await syncBankTransactions(id);
    setSyncing(null);
    loadAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900">Bank Feeds</h1>
          <p className="text-nexabook-500 mt-1">Connect bank accounts for auto-syncing transactions</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Connect Account
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex items-start gap-3">
          <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Auto-Sync Active</p>
            <p className="text-blue-600 mt-0.5">
              Connected bank accounts will sync automatically via daily cron job. Set <code className="bg-blue-100 px-1 rounded">CRON_SECRET</code> in your environment variables to enable.
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-nexabook-400" /></div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-nexabook-400">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No bank connections yet.</p>
            <p className="text-sm mt-1">Connect a bank account to auto-import transactions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {connections.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-nexabook-900">{c.bankAccountName || "Bank Account"}</h3>
                          <Badge variant="outline" className={STATUS_COLORS[c.status] || ""}>
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-nexabook-400">
                          {c.bankName || ""} • {c.bankAccountNumber || ""} • {PROVIDER_LABELS[c.provider] || c.provider}
                        </p>
                        {c.lastSyncAt && (
                          <p className="text-xs text-nexabook-400 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last sync: {new Date(c.lastSyncAt).toLocaleString()}
                            {c.lastSyncStatus === "success" && <CheckCircle2 className="h-3 w-3 text-green-500 ml-1" />}
                            {c.lastSyncStatus === "failed" && <AlertCircle className="h-3 w-3 text-red-500 ml-1" />}
                          </p>
                        )}
                        {c.errorMessage && (
                          <p className="text-xs text-red-500 mt-0.5">{c.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(c.id)}
                        disabled={syncing === c.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${syncing === c.id ? "animate-spin" : ""}`} />
                        Sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(c.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Connect Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Account *</Label>
              <Select value={form.bankAccountId} onValueChange={(v) => setForm({ ...form, bankAccountId: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.accountName} ({a.accountNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock Bank (Development)</SelectItem>
                  <SelectItem value="plaid">Plaid</SelectItem>
                  <SelectItem value="saltedge">Salt Edge</SelectItem>
                  <SelectItem value="manual">Manual Import</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.bankAccountId} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
