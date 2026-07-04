"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clock, Undo2 } from "lucide-react";
import { formatPKR } from "@/lib/utils/number-format";

interface HistoryEntry {
  id: string;
  statementDate: string;
  openingBalance: string;
  closingBalance: string;
  totalDeposits: string;
  totalWithdrawals: string;
  status: string;
  matchedCount: number | null;
  unmatchedCount: number | null;
  finalizedAt: string | null;
  undoReason: string | null;
}

interface ReconciliationHistoryProps {
  history: HistoryEntry[];
  onUndo?: (statementId: string) => void;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: "bg-amber-100 text-amber-800", icon: <Clock className="h-3 w-3" />, label: "Pending" },
  matched: { color: "bg-blue-100 text-blue-800", icon: <CheckCircle2 className="h-3 w-3" />, label: "Matched" },
  reconciled: { color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" />, label: "Reconciled" },
};

export default function ReconciliationHistory({ history, onUndo }: ReconciliationHistoryProps) {
  if (history.length === 0) {
    return (
      <Card className="enterprise-card">
        <CardContent className="p-8 text-center">
          <Clock className="h-10 w-10 mx-auto mb-3 text-nexabook-200" />
          <p className="text-nexabook-500">No reconciliation history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="enterprise-card">
      <CardHeader>
        <CardTitle className="text-nexabook-900">Reconciliation History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((entry) => {
            const status = statusConfig[entry.status] || statusConfig.pending;
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-nexabook-900">
                      {new Date(entry.statementDate).toLocaleDateString("en-PK", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-nexabook-500">
                      Closing: {formatPKR(parseFloat(entry.closingBalance), "south-asian")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {entry.matchedCount !== null && (
                    <div className="text-right text-xs">
                      <span className="text-green-700">{entry.matchedCount} matched</span>
                      {entry.unmatchedCount !== null && entry.unmatchedCount > 0 && (
                        <span className="text-amber-600 ml-2">{entry.unmatchedCount} outstanding</span>
                      )}
                    </div>
                  )}
                  <Badge className={`${status.color} text-xs flex items-center gap-1`}>
                    {status.icon}
                    {status.label}
                  </Badge>
                  {entry.status === "reconciled" && onUndo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUndo(entry.id)}
                      className="text-xs text-nexabook-500 hover:text-red-600"
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Undo
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
