"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Shield, Search, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReportLayout from "@/components/reports/ReportLayout";
import { getAuditTrail } from "@/lib/actions/reports";

const entityTypes = [
  "all",
  "invoice",
  "purchase_invoice",
  "journal_entry",
  "expense",
  "employee",
  "payroll",
  "product",
  "customer",
  "vendor",
];

export default function AuditTrailPage() {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const result = await getAuditTrail(undefined, undefined, entityFilter === "all" ? undefined : entityFilter);
      if (result.success && result.data) {
        setAuditLogs(result.data);
      } else {
        console.error(result.error);
      }
    } catch (error) {
      console.error("Failed to load audit trail:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditTrail();
  }, [entityFilter]);

  // Filter logs based on search
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.changes && log.changes.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("create") || actionLower.includes("add")) {
      return { label: action, variant: "success" as const };
    }
    if (actionLower.includes("update") || actionLower.includes("edit")) {
      return { label: action, variant: "warning" as const };
    }
    if (actionLower.includes("delete") || actionLower.includes("remove")) {
      return { label: action, variant: "destructive" as const };
    }
    return { label: action, variant: "outline" as const };
  };

  const parseChanges = (changes: string | null) => {
    if (!changes) return null;
    try {
      return JSON.parse(changes);
    } catch {
      return changes;
    }
  };

  return (
    <ReportLayout
      title="Audit Trail"
      breadcrumb="Audit Log"
      category="Financial Reports"
      categoryHref="/reports"
      showExportButtons={false}
    >
      {/* Filters */}
      <Card className="enterprise-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="search"
                placeholder="Search by user, action, or entity type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by entity type" />
              </SelectTrigger>
              <SelectContent>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "all" ? "All Entities" : type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardHeader>
            <CardTitle className="text-xl text-nexabook-900">
              Audit Logs ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                  No audit logs found
                </h3>
                <p className="text-nexabook-600">
                  Audit logs will appear here as users perform actions
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-nexabook-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Timestamp
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        User
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Action
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Entity Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        IP Address
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => {
                      const actionBadge = getActionBadge(log.action);
                      return (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-nexabook-900">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-sm text-nexabook-900 font-medium">
                            {log.userId.substring(0, 12)}...
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={actionBadge.variant} className="text-xs">
                              {actionBadge.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-nexabook-700">
                            <Badge variant="outline" className="text-xs">
                              {log.entityType}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-nexabook-600 font-mono">
                            {log.ipAddress || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedLog(log);
                                setDialogOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
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
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-nexabook-600">Timestamp</label>
                  <p className="text-sm text-nexabook-900 font-medium">
                    {formatDate(selectedLog.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-nexabook-600">User ID</label>
                  <p className="text-sm text-nexabook-900 font-mono">{selectedLog.userId}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-nexabook-600">Action</label>
                  <p className="text-sm text-nexabook-900 font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-nexabook-600">Entity Type</label>
                  <p className="text-sm text-nexabook-900">{selectedLog.entityType}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-nexabook-600">Entity ID</label>
                  <p className="text-sm text-nexabook-900 font-mono">{selectedLog.entityId || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-nexabook-600">IP Address</label>
                  <p className="text-sm text-nexabook-900 font-mono">{selectedLog.ipAddress || "N/A"}</p>
                </div>
              </div>

              {selectedLog.changes && (
                <div>
                  <label className="text-xs font-medium text-nexabook-600">Changes</label>
                  <div className="mt-2 p-3 bg-nexabook-50 rounded-md">
                    <pre className="text-xs text-nexabook-900 overflow-auto max-h-60">
                      {JSON.stringify(parseChanges(selectedLog.changes), null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <label className="text-xs font-medium text-nexabook-600">User Agent</label>
                  <p className="text-xs text-nexabook-700 mt-1">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ReportLayout>
  );
}
