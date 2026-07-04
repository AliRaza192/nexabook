"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Phone,
  Loader2,
  ArrowLeft,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCrmCall,
  getCustomersForDropdown,
  getLeadsForDropdown,
  type CrmCallFormData,
} from "@/lib/actions/crm";

const CALL_TYPES = ["Incoming", "Outgoing", "Missed"];
const CALL_OUTCOMES = ["Connected", "Voicemail", "No Answer", "Busy", "Call Back Later"];

function getLocalDate(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

export default function NewCallPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [leads, setLeads] = useState<Array<{ id: string; name: string; company: string | null }>>([]);
  const [formData, setFormData] = useState<CrmCallFormData>({
    customerId: "",
    leadId: "",
    callType: "Outgoing",
    subject: "",
    duration: 0,
    summary: "",
    outcome: "",
    followUpDate: undefined,
  });

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [custResult, leadsResult] = await Promise.all([
          getCustomersForDropdown(),
          getLeadsForDropdown(),
        ]);
        if (custResult.success && custResult.data) {
          setCustomers(custResult.data as Array<{ id: string; name: string }>);
        }
        if (leadsResult.success && leadsResult.data) {
          setLeads(leadsResult.data as Array<{ id: string; name: string; company: string | null }>);
        }
      } catch (error) {
        // silently fail
      }
    };
    loadDropdowns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createCrmCall(formData);
      if (result.success) {
        router.push("/crm/calls");
        router.refresh();
      } else {
        alert(result.error || "Failed to log call");
      }
    } catch (error) {
      alert("Failed to log call");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link href="/crm/calls">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Log Call</h1>
            <p className="text-nexabook-600 mt-1">
              Record details of a customer call.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-nexabook-900">
              <Phone className="h-5 w-5" />
              Call Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <select
                  id="customer"
                  value={formData.customerId || ""}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value || undefined, leadId: "" })}
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Lead */}
              <div className="space-y-2">
                <Label htmlFor="lead">Lead</Label>
                <select
                  id="lead"
                  value={formData.leadId || ""}
                  onChange={(e) => setFormData({ ...formData, leadId: e.target.value || undefined, customerId: "" })}
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
                >
                  <option value="">Select Lead</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}{l.company ? ` (${l.company})` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Call Type */}
              <div className="space-y-2">
                <Label htmlFor="callType">
                  Call Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="callType"
                  value={formData.callType}
                  onChange={(e) => setFormData({ ...formData, callType: e.target.value })}
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
                  required
                >
                  {CALL_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={formData.duration || 0}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              {/* Subject */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of the call"
                  required
                />
              </div>

              {/* Outcome */}
              <div className="space-y-2">
                <Label htmlFor="outcome">Outcome</Label>
                <select
                  id="outcome"
                  value={formData.outcome || ""}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value || undefined })}
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
                >
                  <option value="">Select Outcome</option>
                  {CALL_OUTCOMES.map((outcome) => (
                    <option key={outcome} value={outcome}>{outcome}</option>
                  ))}
                </select>
              </div>

              {/* Follow-up Date */}
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={formData.followUpDate ? getLocalDate(formData.followUpDate) : ""}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value ? new Date(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="summary">Summary</Label>
              <textarea
                id="summary"
                value={formData.summary || ""}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Detailed summary of the call..."
                className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t">
              <Button
                type="submit"
                disabled={loading}
                className="bg-nexabook-900 hover:bg-nexabook-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Call Log
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
