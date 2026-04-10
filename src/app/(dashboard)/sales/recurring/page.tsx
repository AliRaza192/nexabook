"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Repeat, Plus, Search, Filter, Loader2, Edit, Trash2, Zap, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRecurringInvoices, deleteRecurringInvoice, generateRecurringInvoices } from "@/lib/actions/sales";

interface Recurring {
  id: string;
  templateName: string;
  interval: string;
  startDate: Date;
  endDate: Date | null;
  nextInvoiceDate: Date | null;
  status: string;
  customer: { id: string; name: string } | null;
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  const colors: Record<string, string> = { blue: "bg-blue-50 border-blue-200", green: "bg-green-50 border-green-200", orange: "bg-orange-50 border-orange-200" };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border ${colors[color]} hover:shadow-md`}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-600">{title}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div><div className="h-10 w-10 rounded-lg bg-white/50 flex items-center justify-center"><Icon className="h-5 w-5" /></div></div></CardContent></Card>
    </motion.div>
  );
}

function getIntervalLabel(interval: string) {
  return { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" }[interval] || interval;
}

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({ active: 0, next7: 0, thisMonth: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getRecurringInvoices(statusFilter === "all" ? undefined : statusFilter);
      if (res.success && res.data) {
        const data = res.data as Recurring[];
        setRecurring(data);
        const now = new Date(); const next7 = new Date(now); next7.setDate(next7.getDate() + 7);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStats({
          active: data.filter(r => r.status === 'active').length,
          next7: data.filter(r => r.nextInvoiceDate && r.nextInvoiceDate <= next7).length,
          thisMonth: data.filter(r => r.nextInvoiceDate && r.nextInvoiceDate <= endOfMonth).length,
        });
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring invoice?")) return;
    const res = await deleteRecurringInvoice(id);
    if (res.success) { alert("Deleted"); loadData(); } else alert(res.error || "Failed");
  };

  const handleGenerate = async () => {
    const res = await generateRecurringInvoices();
    if (res.success) { alert(`Generated ${(res.data as any)?.generated || 0} invoices`); loadData(); }
    else alert(res.error || "Failed");
  };

  const formatDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }) : "N/A";

  if (loading && !recurring.length) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto" /><p className="text-nexabook-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-nexabook-900">Recurring Invoices</h1><p className="text-nexabook-600 mt-1">Automated recurring billing</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={handleGenerate}><Zap className="mr-2 h-4 w-4" />Generate Now</Button><Link href="/sales/recurring/new"><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="mr-2 h-4 w-4" />New Recurring</Button></Link></div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Recurring" value={stats.active} icon={Repeat} color="green" />
        <StatCard title="Next 7 Days" value={stats.next7} icon={Calendar} color="orange" />
        <StatCard title="This Month" value={stats.thisMonth} icon={Activity} color="blue" />
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" /><Input type="search" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-nexabook-600" /><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
        </div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-xl text-nexabook-900">Recurring Invoices ({recurring.length})</CardTitle></CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <div className="text-center py-12"><Repeat className="h-16 w-16 text-nexabook-300 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No recurring invoices</h3><Link href="/sales/recurring/new"><Button className="bg-nexabook-900"><Plus className="mr-2 h-4 w-4" />Create Recurring</Button></Link></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr className="border-b border-nexabook-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Template Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Interval</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Start Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Next Invoice Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Actions</th>
              </tr></thead><tbody>
                {recurring.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-nexabook-100 hover:bg-nexabook-50">
                    <td className="py-3 px-4"><span className="text-sm font-medium">{r.templateName}</span></td>
                    <td className="py-3 px-4"><span className="text-sm">{r.customer?.name || "Unknown"}</span></td>
                    <td className="py-3 px-4"><Badge variant="outline" className="text-xs">{getIntervalLabel(r.interval)}</Badge></td>
                    <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{formatDate(r.startDate)}</span></td>
                    <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{formatDate(r.nextInvoiceDate)}</span></td>
                    <td className="py-3 px-4"><Badge variant={r.status === 'active' ? 'success' as any : r.status === 'paused' ? 'secondary' as any : 'outline' as any} className="text-xs capitalize">{r.status}</Badge></td>
                    <td className="py-3 px-4"><div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
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
