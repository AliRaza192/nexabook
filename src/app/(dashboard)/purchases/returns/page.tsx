"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { RotateCcw, Plus, Search, Filter, Loader2, Eye, Trash2, CheckCircle, Calendar, DollarSign, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPKR } from "@/lib/utils/number-format";
import { getPurchaseReturns, approvePurchaseReturn } from "@/lib/actions/purchases";

interface PurchaseReturn {
  id: string;
  returnNumber: string;
  returnDate: Date;
  reason: string;
  netAmount: string | null;
  refundAmount: string | null;
  status: string;
  vendor: { id: string; name: string } | null;
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  const colors: Record<string, string> = { blue: "bg-blue-50 border-blue-200", green: "bg-green-50 border-green-200", orange: "bg-orange-50 border-orange-200" };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border ${colors[color]} hover:shadow-md`}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-600">{title}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div><div className="h-10 w-10 rounded-lg bg-white/50 flex items-center justify-center"><Icon className="h-5 w-5" /></div></div></CardContent></Card>
    </motion.div>
  );
}

function getReasonLabel(reason: string) {
  const labels: Record<string, string> = { defective: "Defective", wrong_item: "Wrong Item", not_as_described: "Not as Described", damaged_in_transit: "Damaged in Transit", other: "Other" };
  return labels[reason] || reason;
}

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({ thisMonth: 0, totalRefund: "0", pending: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getPurchaseReturns(searchQuery, statusFilter === "all" ? undefined : statusFilter);
      if (res.success && res.data) {
        const data = res.data as PurchaseReturn[];
        setReturns(data);
        const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalRefund = data.filter(r => r.status === 'approved' || r.status === 'refunded').reduce((s, r) => s + parseFloat(r.refundAmount || '0'), 0);
        setStats({ thisMonth: data.filter(r => new Date(r.returnDate) >= monthStart).length, totalRefund: totalRefund.toFixed(2), pending: data.filter(r => r.status === 'pending').length });
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [searchQuery, statusFilter]);

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this return? This will reduce stock and create a debit note.")) return;
    const res = await approvePurchaseReturn(id);
    if (res.success) { alert("Return approved - stock reduced and debit note created"); loadData(); }
    else alert(res.error || "Failed");
  };

  const formatCurrency = (v: string | null) => v ? formatPKR(parseFloat(v), 'south-asian') : formatPKR(0, 'south-asian');
  const formatDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }) : "N/A";

  if (loading && !returns.length) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto" /><p className="text-nexabook-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-nexabook-900">Purchase Returns</h1><p className="text-nexabook-600 mt-1">Process returns to vendors and manage stock adjustments</p></div>
        <Link href="/purchases/returns/new"><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="mr-2 h-4 w-4" />New Purchase Return</Button></Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Returns This Month" value={stats.thisMonth} icon={RotateCcw} color="blue" />
        <StatCard title="Total Refund" value={formatCurrency(stats.totalRefund)} icon={DollarSign} color="green" />
        <StatCard title="Pending Approvals" value={stats.pending} icon={Clock} color="orange" />
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" /><Input type="search" placeholder="Search by return#, vendor, or reason..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-nexabook-600" /><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="refunded">Refunded</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
        </div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-xl text-nexabook-900">Purchase Returns ({returns.length})</CardTitle></CardHeader>
        <CardContent>
          {returns.length === 0 ? (
            <div className="text-center py-12"><RotateCcw className="h-16 w-16 text-nexabook-300 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No returns</h3><Link href="/purchases/returns/new"><Button className="bg-nexabook-900"><Plus className="mr-2 h-4 w-4" />Create Return</Button></Link></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr className="border-b border-nexabook-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Return#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Return Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Reason</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Net Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Refund Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Actions</th>
              </tr></thead><tbody>
                {returns.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-nexabook-100 hover:bg-nexabook-50">
                    <td className="py-3 px-4"><span className="text-sm font-medium">{r.returnNumber}</span></td>
                    <td className="py-3 px-4"><span className="text-sm">{r.vendor?.name || "Unknown"}</span></td>
                    <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{formatDate(r.returnDate)}</span></td>
                    <td className="py-3 px-4"><Badge variant="outline" className="text-xs">{getReasonLabel(r.reason)}</Badge></td>
                    <td className="py-3 px-4"><span className="text-sm font-semibold">{formatCurrency(r.netAmount)}</span></td>
                    <td className="py-3 px-4"><span className="text-sm font-semibold text-green-600">{formatCurrency(r.refundAmount)}</span></td>
                    <td className="py-3 px-4"><Badge variant={r.status === 'approved' || r.status === 'refunded' ? 'success' as any : r.status === 'pending' ? 'secondary' as any : 'outline' as any} className="text-xs capitalize">{r.status}</Badge></td>
                    <td className="py-3 px-4"><div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                      {r.status === 'pending' && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={() => handleApprove(r.id)}><CheckCircle className="h-3.5 w-3.5" /></Button>}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div></td>
                  </motion.tr>
                ))}
              </tbody></table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}