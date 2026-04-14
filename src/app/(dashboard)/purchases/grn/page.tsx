"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Package, Plus, Search, Loader2, Eye, Trash2, ClipboardCheck, Truck, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/utils/number-format";
import { getGoodReceivingNotes, deleteGRN } from "@/lib/actions/purchases";

interface GRN {
  id: string;
  grnNumber: string;
  receivingDate: Date;
  reference: string | null;
  status: 'received' | 'inspected' | 'accepted' | 'rejected';
  vendor: { id: string; name: string } | null;
  purchaseOrder: { id: string; orderNumber: string } | null;
  createdAt: Date;
}

interface GRNStats {
  grnsToday: number;
  pendingInspection: number;
  accepted: number;
}

function StatCard({ title, value, icon: Icon, description, color }: { title: string; value: string | number; icon: any; description: string; color: "blue" | "green" | "orange" }) {
  const colorClasses = { blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" }, green: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-200" }, orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200" } };
  const colors = colorClasses[color];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={`border ${colors.border} hover:shadow-md transition-shadow`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1"><p className="text-sm font-medium text-nexabook-600 mb-1">{title}</p><p className="text-3xl font-bold text-nexabook-900">{value}</p><p className="text-xs text-nexabook-500 mt-2">{description}</p></div>
            <div className={`h-12 w-12 rounded-lg ${colors.bg} flex items-center justify-center`}><Icon className={`h-6 w-6 ${colors.icon}`} /></div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
    received: { label: "Received", variant: "default" as const, icon: Truck },
    inspected: { label: "Inspected", variant: "secondary" as const, icon: ClipboardCheck },
    accepted: { label: "Accepted", variant: "success" as const, icon: CheckCircle },
    rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
  };
  return statusConfig[status] || statusConfig.received;
}

export default function GRNPage() {
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [stats, setStats] = useState<GRNStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getGoodReceivingNotes(searchQuery);
      if (res.success && res.data) {
        const data = res.data as GRN[];
        setGRNs(data);
        const today = new Date().toDateString();
        const grnsToday = data.filter(g => new Date(g.receivingDate).toDateString() === today).length;
        const pendingInspection = data.filter(g => g.status === 'received' || g.status === 'inspected').length;
        const accepted = data.filter(g => g.status === 'accepted').length;
        setStats({ grnsToday, pendingInspection, accepted });
      }
    } catch (error) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [searchQuery]);

  const formatCurrency = (v: string | null) => v ? formatPKR(parseFloat(v), 'south-asian') : formatPKR(0, 'south-asian');
  const formatDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }) : "N/A";

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this GRN? This will reverse the stock updates.")) return;
    const res = await deleteGRN(id);
    if (res.success) { alert("GRN deleted and stock reversed!"); loadData(); }
    else alert(res.error || "Failed to delete GRN");
  };

  if (loading && !grns.length) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto" /><p className="text-nexabook-600 ml-3">Loading GRNs...</p></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-nexabook-900">Good Receiving Notes</h1><p className="text-nexabook-600 mt-1">Record and manage incoming inventory receipts.</p></div>
        <Link href="/purchases/grn/new"><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="mr-2 h-4 w-4" />New GRN</Button></Link>
      </motion.div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="GRNs Today" value={stats.grnsToday} icon={Truck} description="Received today" color="blue" />
          <StatCard title="Pending Inspection" value={stats.pendingInspection} icon={ClipboardCheck} description="Needs inspection" color="orange" />
          <StatCard title="Accepted" value={stats.accepted} icon={CheckCircle} description="Stock added" color="green" />
        </div>
      )}

      <Card><CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
            <Input type="search" placeholder="Search by GRN#, vendor, or PO..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-xl text-nexabook-900">Good Receiving Notes ({grns.length})</CardTitle></CardHeader>
        <CardContent>
          {grns.length === 0 ? (
            <div className="text-center py-12"><Package className="h-16 w-16 text-nexabook-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-nexabook-900 mb-2">No GRNs found</h3><Link href="/purchases/grn/new"><Button className="bg-nexabook-900"><Plus className="mr-2 h-4 w-4" />Create GRN</Button></Link></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr className="border-b border-nexabook-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">GRN#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">PO Reference</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Receiving Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Actions</th>
              </tr></thead><tbody>
                {grns.map((grn, i) => {
                  const statusConfig = getStatusBadge(grn.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <motion.tr key={grn.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="border-b border-nexabook-100 hover:bg-nexabook-50">
                      <td className="py-3 px-4"><span className="text-sm font-medium">{grn.grnNumber}</span></td>
                      <td className="py-3 px-4"><span className="text-sm">{grn.vendor?.name || "Unknown"}</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{grn.purchaseOrder?.orderNumber || "—"}</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{formatDate(grn.receivingDate)}</span></td>
                      <td className="py-3 px-4"><Badge variant={statusConfig.variant} className="text-xs gap-1"><StatusIcon className="h-3 w-3" />{statusConfig.label}</Badge></td>
                      <td className="py-3 px-4"><div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-nexabook-100"><Eye className="h-4 w-4 text-nexabook-600" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDelete(grn.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div></td>
                    </motion.tr>
                  );
                })}
              </tbody></table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}