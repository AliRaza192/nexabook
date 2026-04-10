"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText, Plus, Search, Filter, Loader2, Eye, Edit, Trash2, ArrowRightCircle,
  TrendingUp, CheckCircle, Clock, RotateCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQuotations, deleteQuotation, convertQuotationToOrder } from "@/lib/actions/sales";

interface Quotation {
  id: string;
  quotationNumber: string;
  issueDate: Date;
  expiryDate: Date | null;
  status: string;
  netAmount: string | null;
  subject: string | null;
  createdAt: Date;
  customer: { id: string; name: string } | null;
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={`border ${colors[color] || colors.blue} hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-medium text-gray-600">{title}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div>
            <div className="h-10 w-10 rounded-lg bg-white/50 flex items-center justify-center"><Icon className="h-5 w-5" /></div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; variant: string }> = {
    draft: { label: "Draft", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    accepted: { label: "Accepted", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
    expired: { label: "Expired", variant: "outline" },
    converted: { label: "Converted", variant: "success" },
  };
  return config[status] || config.draft;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({ total: 0, accepted: 0, pending: 0, converted: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getQuotations(searchQuery, statusFilter === "all" ? undefined : statusFilter);
      if (res.success && res.data) {
        setQuotations(res.data as Quotation[]);
        const data = res.data as Quotation[];
        setStats({
          total: data.length,
          accepted: data.filter(q => q.status === 'accepted').length,
          pending: data.filter(q => q.status === 'draft' || q.status === 'sent').length,
          converted: data.filter(q => q.status === 'converted').length,
        });
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [searchQuery, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    const res = await deleteQuotation(id);
    if (res.success) { alert("Quotation deleted"); loadData(); }
    else alert(res.error || "Failed to delete");
  };

  const handleConvert = async (id: string) => {
    if (!confirm("Convert this quotation to a sale order?")) return;
    const res = await convertQuotationToOrder(id);
    if (res.success) { alert("Quotation converted to sale order"); loadData(); }
    else alert(res.error || "Failed to convert");
  };

  const formatCurrency = (val: string | null) => {
    if (!val) return "Rs. 0";
    return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(parseFloat(val));
  };

  const formatDate = (d: Date | null) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
  };

  if (loading && !quotations.length) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto" /><p className="text-nexabook-600 ml-3">Loading quotations...</p></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-nexabook-900">Quotations</h1><p className="text-nexabook-600 mt-1">Create and manage sales quotations</p></div>
        <Link href="/sales/quotations/new"><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="mr-2 h-4 w-4" />New Quotation</Button></Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Quotations" value={stats.total} icon={FileText} color="blue" />
        <StatCard title="Accepted" value={stats.accepted} icon={CheckCircle} color="green" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="yellow" />
        <StatCard title="Converted" value={stats.converted} icon={RotateCw} color="purple" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" /><Input type="search" placeholder="Search quotations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
            <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-nexabook-600" /><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="accepted">Accepted</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="converted">Converted</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-xl text-nexabook-900">Quotations ({quotations.length})</CardTitle></CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-12"><FileText className="h-16 w-16 text-nexabook-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-nexabook-900 mb-2">No quotations found</h3><Link href="/sales/quotations/new"><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="mr-2 h-4 w-4" />Create Quotation</Button></Link></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-nexabook-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Quotation#</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Subject</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Issue Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Expiry Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Net Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Actions</th>
                </tr></thead>
                <tbody>
                  {quotations.map((q, i) => {
                    const badge = getStatusBadge(q.status);
                    return (
                      <motion.tr key={q.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors">
                        <td className="py-3 px-4"><span className="text-sm font-medium text-nexabook-900">{q.quotationNumber}</span></td>
                        <td className="py-3 px-4"><span className="text-sm">{q.customer?.name || "Unknown"}</span></td>
                        <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{q.subject || "-"}</span></td>
                        <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{formatDate(q.issueDate)}</span></td>
                        <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{formatDate(q.expiryDate)}</span></td>
                        <td className="py-3 px-4"><span className="text-sm font-semibold">{formatCurrency(q.netAmount)}</span></td>
                        <td className="py-3 px-4"><Badge variant={badge.variant as any} className="text-xs">{badge.label}</Badge></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                            {q.status !== 'converted' && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={() => handleConvert(q.id)} title="Convert to Order"><ArrowRightCircle className="h-3.5 w-3.5" /></Button>}
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => handleDelete(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
