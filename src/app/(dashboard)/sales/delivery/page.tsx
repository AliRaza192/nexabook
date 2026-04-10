"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Package, Plus, Search, Filter, Loader2, Eye, Trash2, Truck, MapPin, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDeliveryNotes, updateDeliveryStatus } from "@/lib/actions/sales";

interface Delivery {
  id: string;
  deliveryNumber: string;
  deliveryDate: Date;
  status: string;
  shippedVia: string | null;
  trackingNumber: string | null;
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

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; variant: string }> = {
    pending: { label: "Pending", variant: "secondary" }, dispatched: { label: "Dispatched", variant: "default" },
    in_transit: { label: "In Transit", variant: "default" }, delivered: { label: "Delivered", variant: "success" },
    returned: { label: "Returned", variant: "destructive" }, cancelled: { label: "Cancelled", variant: "outline" },
  };
  return config[status] || config.pending;
}

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({ pending: 0, delivered: 0, inTransit: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDeliveryNotes(searchQuery, statusFilter === "all" ? undefined : statusFilter);
      if (res.success && res.data) {
        setDeliveries(res.data as Delivery[]);
        const d = res.data as Delivery[];
        setStats({ pending: d.filter(x => x.status === 'pending').length, delivered: d.filter(x => x.status === 'delivered').length, inTransit: d.filter(x => x.status === 'in_transit' || x.status === 'dispatched').length });
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [searchQuery, statusFilter]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await updateDeliveryStatus(id, status);
    if (res.success) { alert("Status updated"); loadData(); } else alert(res.error || "Failed");
  };

  const formatDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }) : "N/A";

  if (loading && !deliveries.length) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto" /><p className="text-nexabook-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-nexabook-900">Delivery Notes</h1><p className="text-nexabook-600 mt-1">Track and manage deliveries</p></div>
        <Link href="/sales/delivery/new"><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="mr-2 h-4 w-4" />New Delivery Note</Button></Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Pending Deliveries" value={stats.pending} icon={Package} color="orange" />
        <StatCard title="Delivered Today" value={stats.delivered} icon={CheckCircle} color="green" />
        <StatCard title="In Transit" value={stats.inTransit} icon={Truck} color="blue" />
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" /><Input type="search" placeholder="Search deliveries..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-nexabook-600" /><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="dispatched">Dispatched</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="returned">Returned</SelectItem></SelectContent></Select></div>
        </div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-xl text-nexabook-900">Delivery Notes ({deliveries.length})</CardTitle></CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="text-center py-12"><Package className="h-16 w-16 text-nexabook-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-nexabook-900 mb-2">No delivery notes</h3><Link href="/sales/delivery/new"><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="mr-2 h-4 w-4" />Create Delivery Note</Button></Link></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr className="border-b border-nexabook-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Delivery#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Delivery Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Shipped Via</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Tracking#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Actions</th>
              </tr></thead><tbody>
                {deliveries.map((d, i) => {
                  const badge = getStatusBadge(d.status);
                  return (
                    <motion.tr key={d.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-nexabook-100 hover:bg-nexabook-50">
                      <td className="py-3 px-4"><span className="text-sm font-medium text-nexabook-900">{d.deliveryNumber}</span></td>
                      <td className="py-3 px-4"><span className="text-sm">{d.customer?.name || "Unknown"}</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{formatDate(d.deliveryDate)}</span></td>
                      <td className="py-3 px-4">
                        <Select value={d.status} onValueChange={v => handleStatusChange(d.id, v)}>
                          <SelectTrigger className="w-[130px] h-7 text-xs"><Badge variant={badge.variant as any}>{badge.label}</Badge></SelectTrigger>
                          <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="dispatched">Dispatched</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="returned">Returned</SelectItem></SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{d.shippedVia || "-"}</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-nexabook-600">{d.trackingNumber || "-"}</span></td>
                      <td className="py-3 px-4"><div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
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
