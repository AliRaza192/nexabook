"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import { getFilingDeadlines, type FilingDeadline } from "@/lib/actions/tax-filing";
import Link from "next/link";

export default function FilingReminders() {
  const [deadlines, setDeadlines] = useState<FilingDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFilingDeadlines().then((res) => {
      if (res.success && res.data) setDeadlines(res.data);
      setLoading(false);
    });
  }, []);

  if (loading || deadlines.length === 0) return null;

  return (
    <div className="space-y-2">
      {deadlines.map((deadline, index) => {
        const isOverdue = deadline.status === "overdue";
        const isUrgent = deadline.daysUntil <= 3 && deadline.daysUntil >= 0;
        const isFiled = deadline.status === "filed";

        return (
          <Card
            key={index}
            className={`${
              isOverdue
                ? "border-red-300 bg-red-50 dark:bg-red-950/30"
                : isUrgent
                ? "border-orange-300 bg-orange-50 dark:bg-orange-950/30"
                : isFiled
                ? "border-green-300 bg-green-50 dark:bg-green-950/30"
                : ""
            }`}
          >
            <CardContent className="p-3 flex items-center gap-3">
              {isFiled ? (
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              ) : isOverdue ? (
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              ) : isUrgent ? (
                <Clock className="h-5 w-5 text-orange-600 shrink-0" />
              ) : (
                <FileText className="h-5 w-5 text-blue-600 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {deadline.taxAuthority} — {deadline.returnType}
                  </span>
                  <Badge
                    variant={
                      isFiled
                        ? "default"
                        : isOverdue
                        ? "destructive"
                        : isUrgent
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {isFiled
                      ? "Filed"
                      : isOverdue
                      ? `Overdue by ${Math.abs(deadline.daysUntil)} days`
                      : deadline.daysUntil === 0
                      ? "Due Today"
                      : `${deadline.daysUntil} days left`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deadline: {deadline.deadline} • {deadline.pendingInvoices} invoices pending
                </p>
              </div>

              {!isFiled && (
                <Link href="/reports/tax-returns">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    File Now
                  </Badge>
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
