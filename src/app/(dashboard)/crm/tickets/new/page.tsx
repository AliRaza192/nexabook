"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Ticket,
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
  createTicket,
  getCustomersForDropdown,
  getLeadsForDropdown,
  type TicketFormData,
} from "@/lib/actions/crm";

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [leads, setLeads] = useState<Array<{ id: string; name: string; company: string | null }>>([]);
  const [formData, setFormData] = useState<TicketFormData>({
    customerId: "",
    leadId: "",
    subject: "",
    description: "",
    priority: "medium",
    assignedTo: "",
    notes: "",
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
      const result = await createTicket(formData);
      if (result.success) {
        router.push("/crm/tickets");
        router.refresh();
      } else {
        alert(result.error || "Failed to create ticket");
      }
    } catch (error) {
      alert("Failed to create ticket");
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
          <Link href="/crm/tickets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">New Support Ticket</h1>
            <p className="text-nexabook-600 mt-1">
              Create a new support ticket for a customer or lead.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-nexabook-900">
              <Ticket className="h-5 w-5" />
              Ticket Details
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

              {/* Subject */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={formData.priority || "medium"}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Assigned To */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  value={formData.assignedTo || ""}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  placeholder="Assignee name or ID"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the issue..."
                className="w-full min-h-[120px] px-3 py-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="notes">Internal Notes</Label>
              <textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional internal notes..."
                className="w-full min-h-[80px] px-3 py-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Ticket
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
