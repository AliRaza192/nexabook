"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getPendingApprovals, approveRequest, rejectRequest } from "@/lib/actions/approvals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, ClipboardCheck } from "lucide-react";

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await getPendingApprovals();
    if (res.success) setRequests(res.data || []);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    await approveRequest(id, comments[id]);
    setProcessing(null);
    load();
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    await rejectRequest(id, comments[id]);
    setProcessing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-nexabook-600" />
          Pending Approvals
        </h1>
        <p className="text-nexabook-500 text-sm mt-1">Review and approve/reject pending requests</p>
      </div>

      <Card className="enterprise-card">
        <CardHeader className="pb-3 border-b border-nexabook-50">
          <CardTitle className="text-base font-semibold text-nexabook-900">
            Requests ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-nexabook-400" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-nexabook-400 text-sm">No pending approvals</div>
          ) : (
            <div className="divide-y divide-nexabook-100">
              {requests.map((req) => (
                <div key={req.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800 text-xs capitalize">{req.entityType}</Badge>
                        <span className="text-sm font-medium text-nexabook-900">
                          {req.entityNumber || req.entityId.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-xs text-nexabook-400 mt-1">
                        Amount: Rs. {parseFloat(req.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-nexabook-400">
                        Requested: {new Date(req.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Comment (optional)..."
                      className="text-sm h-9"
                      value={comments[req.id] || ""}
                      onChange={(e) => setComments({ ...comments, [req.id]: e.target.value })}
                    />
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-9"
                      onClick={() => handleApprove(req.id)}
                      disabled={processing === req.id}
                    >
                      {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9"
                      onClick={() => handleReject(req.id)}
                      disabled={processing === req.id}
                    >
                      {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
