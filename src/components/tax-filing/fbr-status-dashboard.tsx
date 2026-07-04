"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Send,
} from "lucide-react";
import {
  getFBRSubmissionStats,
  getFBRSubmissions,
  batchSubmitToFBR,
  retryFailedSubmissions,
  type FBRSubmissionStats,
} from "@/lib/actions/tax-filing";

export default function FBRStatusDashboard() {
  const [stats, setStats] = useState<FBRSubmissionStats | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "submitted" | "failed" | "pending">("all");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    const [statsRes, subsRes] = await Promise.all([
      getFBRSubmissionStats(),
      getFBRSubmissions(filter === "all" ? undefined : filter),
    ]);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (subsRes.success && subsRes.data) setSubmissions(subsRes.data);
    setLoading(false);
  };

  const handleRetryAll = async () => {
    setRetrying(true);
    await retryFailedSubmissions();
    await loadData();
    setRetrying(false);
  };

  const handleExportCSV = () => {
    const headers = ["Invoice #", "Customer", "Amount", "Status", "Submission ID", "Submitted At"];
    const rows = submissions.map((s) => [
      s.invoiceNumber,
      s.customerName,
      s.netAmount,
      s.fbrStatus || "pending",
      s.fbrSubmissionId || "",
      s.fbrSubmittedAt ? new Date(s.fbrSubmittedAt).toLocaleString("en-PK") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fbr-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Submitted</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {(["all", "submitted", "pending", "pending"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        {stats && stats.failed > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetryAll}
            disabled={retrying}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${retrying ? "animate-spin" : ""}`} />
            Retry Failed ({stats.failed})
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submission ID</TableHead>
                <TableHead>Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {loading ? "Loading..." : "No submissions found"}
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.invoiceNumber}</TableCell>
                    <TableCell>{sub.customerName}</TableCell>
                    <TableCell className="text-right">
                      Rs. {parseFloat(sub.netAmount).toLocaleString("en-PK")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.fbrStatus === "submitted"
                            ? "default"
                            : sub.fbrStatus === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {sub.fbrStatus === "submitted" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {sub.fbrStatus === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                        {sub.fbrStatus === "pending" || !sub.fbrStatus ? (
                          <Clock className="h-3 w-3 mr-1" />
                        ) : null}
                        {sub.fbrStatus || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.fbrSubmissionId || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.fbrSubmittedAt
                        ? new Date(sub.fbrSubmittedAt).toLocaleString("en-PK")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
