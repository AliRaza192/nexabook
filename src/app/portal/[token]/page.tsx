"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPortalData } from "@/lib/actions/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, DollarSign, Phone, Mail, Loader2, AlertCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
};

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getPortalData(token).then((res) => {
      setLoading(false);
      if (res.success) setData(res.data);
      else setError(res.error || "Invalid link");
    });
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nexabook-50 to-white">
      <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nexabook-50 to-white">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-lg font-medium text-red-600">Invalid or expired link</p>
          <p className="text-sm text-nexabook-500">Please contact the business to get a valid portal link.</p>
        </CardContent>
      </Card>
    </div>
  );

  const { customer, invoices } = data;
  const totalDue = invoices
    .filter((i: any) => i.status !== "paid")
    .reduce((s: number, i: any) => s + parseFloat(i.balanceAmount || "0"), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-nexabook-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <Card className="border-nexabook-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-nexabook-600 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-nexabook-900">{customer.orgName}</h1>
                <p className="text-sm text-nexabook-500 flex items-center gap-3 mt-1">
                  {customer.orgPhone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.orgPhone}</span>}
                  {customer.orgEmail && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.orgEmail}</span>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Welcome + Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-nexabook-200">
            <CardContent className="p-5">
              <p className="text-sm text-nexabook-500">Welcome</p>
              <p className="text-xl font-bold text-nexabook-900 mt-1">{customer.name}</p>
            </CardContent>
          </Card>
          <Card className="border-nexabook-200">
            <CardContent className="p-5">
              <p className="text-sm text-nexabook-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600 mt-1">Rs. {totalDue.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card className="border-nexabook-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-nexabook-100">
            <CardTitle className="text-base font-semibold text-nexabook-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-nexabook-600" />
              Invoices ({invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <div className="text-center py-10 text-nexabook-400 text-sm">No invoices found</div>
            ) : (
              <div className="divide-y divide-nexabook-100">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-nexabook-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-nexabook-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-nexabook-400 mt-0.5">
                          {new Date(inv.issueDate).toLocaleDateString("en-PK")}
                          {inv.dueDate && ` • Due: ${new Date(inv.dueDate).toLocaleDateString("en-PK")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-nexabook-900">
                        Rs. {parseFloat(inv.netAmount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </span>
                      <Badge className={`${STATUS_COLORS[inv.status] || "bg-gray-100 text-gray-700"} text-xs capitalize`}>
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-nexabook-400 pb-4">
          Powered by NexaBook — Accounting & Invoicing Software
        </p>
      </div>
    </div>
  );
}
