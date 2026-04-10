"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Factory, Package, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getJobOrderProductionReport } from "@/lib/actions/reports";

export default function JobOrderProductionPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const loadReport = async (status?: string) => {
    setLoading(true);
    try {
      const result = await getJobOrderProductionReport(status === "all" ? undefined : status);
      if (result.success && result.data) {
        setReportData(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(selectedStatus);
  }, []);

  const handleApply = () => {
    loadReport(selectedStatus);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(value);
  };

  const totalOrders = reportData?.length || 0;
  const completed = reportData?.filter((j: any) => j.status === "completed").length || 0;
  const inProgress = reportData?.filter((j: any) => j.status === "in_progress").length || 0;
  const planned = reportData?.filter((j: any) => j.status === "planned").length || 0;
  const totalQty = reportData?.reduce((sum: number, j: any) => sum + (j.quantityToProduce || 0), 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "planned": return "bg-amber-100 text-amber-800 border-amber-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-nexabook-100 text-nexabook-800 border-nexabook-200";
    }
  };

  return (
    <ReportLayout
      title="Job Order Production"
      breadcrumb="Job Order Production"
      category="Manufacturing Reports"
      categoryHref="/reports"
    >
      <Card className="enterprise-card mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">Filter by Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleApply} className="bg-nexabook-900 hover:bg-nexabook-800 h-9">
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData && reportData.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Factory className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Orders</p>
                    <p className="text-xl font-bold text-nexabook-900">{totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Completed</p>
                    <p className="text-xl font-bold text-green-700">{completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">In Progress</p>
                    <p className="text-xl font-bold text-amber-700">{inProgress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Planned</p>
                    <p className="text-xl font-bold text-purple-700">{planned}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Package className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Qty to Produce</p>
                    <p className="text-xl font-bold text-emerald-700">{totalQty.toLocaleString("en-PK")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Job Order Status</CardTitle>
              <p className="text-sm text-nexabook-600">Production order tracking and status overview</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Order Number</TableHead>
                    <TableHead>BOM</TableHead>
                    <TableHead>Finished Good</TableHead>
                    <TableHead className="text-right">Qty to Produce</TableHead>
                    <TableHead>Completion Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((job: any, index: number) => {
                    const completionDate = job.completionDate ? new Date(job.completionDate).toLocaleDateString("en-PK") : "-";
                    const createdDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-PK") : "-";
                    return (
                      <motion.tr
                        key={job.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm font-medium text-nexabook-900">{job.orderNumber}</TableCell>
                        <TableCell className="text-nexabook-600">{job.bomName || "N/A"}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{job.finishedGoodName || "N/A"}</TableCell>
                        <TableCell className="text-right font-semibold text-nexabook-900">
                          {(job.quantityToProduce || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-nexabook-600 text-sm">{completionDate}</TableCell>
                        <TableCell className="text-nexabook-600 text-sm">{createdDate}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize ${getStatusBadge(job.status)}`}>
                            {job.status?.replace("_", " ") || "planned"}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No job orders found. Create job orders to track production.</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
