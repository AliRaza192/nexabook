"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
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
  createCrmEvent,
  getCustomersForDropdown,
  getLeadsForDropdown,
  type CrmEventFormData,
} from "@/lib/actions/crm";

const EVENT_TYPES = ["Meeting", "Call", "Email", "Task", "Note"];
const EVENT_STATUSES = ["scheduled", "completed", "cancelled", "no_show"];

function getLocalDateTime(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [leads, setLeads] = useState<Array<{ id: string; name: string; company: string | null }>>([]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const [formData, setFormData] = useState<CrmEventFormData>({
    title: "",
    eventType: "Meeting",
    customerId: "",
    leadId: "",
    description: "",
    scheduledAt: tomorrow,
    duration: 30,
    status: "scheduled",
    location: "",
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
      const result = await createCrmEvent(formData);
      if (result.success) {
        router.push("/crm/events");
        router.refresh();
      } else {
        alert(result.error || "Failed to create event");
      }
    } catch (error) {
      alert("Failed to create event");
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
          <Link href="/crm/events">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">New Event</h1>
            <p className="text-nexabook-600 mt-1">
              Schedule a meeting, call, email, task, or note.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-nexabook-900">
              <Calendar className="h-5 w-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Event title or subject"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="eventType">Type</Label>
                <select
                  id="eventType"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status || "scheduled"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>
                  ))}
                </select>
              </div>

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

              {/* Scheduled Date/Time */}
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">
                  Scheduled Date/Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={getLocalDateTime(formData.scheduledAt)}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: new Date(e.target.value) })}
                  required
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  step="5"
                  value={formData.duration || 30}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                  placeholder="30"
                />
              </div>

              {/* Location */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Meeting room, phone number, or URL"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Agenda or details..."
                className="w-full min-h-[80px] px-3 py-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-nexabook-500 bg-background"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="notes">Internal Notes</Label>
              <textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
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
                    Create Event
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
