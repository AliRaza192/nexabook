"use client";

import { useState, useEffect } from "react";
import {
  getWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  regenerateWebhookSecret,
  getWebhookDeliveries,
  retryWebhookDelivery,
  CreateWebhookData,
} from "@/lib/actions/webhooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Trash2, RefreshCw, Copy, Eye, Loader2, Webhook, Activity,
} from "lucide-react";

const WEBHOOK_EVENTS = [
  { value: "invoice.created", label: "Invoice Created" },
  { value: "invoice.updated", label: "Invoice Updated" },
  { value: "invoice.paid", label: "Invoice Paid" },
  { value: "payment.received", label: "Payment Received" },
  { value: "customer.created", label: "Customer Created" },
  { value: "customer.updated", label: "Customer Updated" },
  { value: "purchase.created", label: "Purchase Created" },
  { value: "purchase.updated", label: "Purchase Updated" },
] as const;

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
}

interface WebhookDelivery {
  id: string;
  webhookEndpointId: string;
  event: string;
  status: "pending" | "success" | "failed";
  responseCode: number | null;
  responseBody: string | null;
  attempts: number;
  createdAt: Date;
}

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeliveries, setShowDeliveries] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => { loadEndpoints(); }, []);

  const loadEndpoints = async () => {
    setLoading(true);
    const res = await getWebhookEndpoints();
    if (res.success && res.data) setEndpoints(res.data as WebhookEndpoint[]);
    setLoading(false);
  };

  const loadDeliveries = async (endpointId: string) => {
    setDeliveriesLoading(true);
    setShowDeliveries(endpointId);
    const res = await getWebhookDeliveries(endpointId);
    if (res.success && res.data) setDeliveries(res.data as WebhookDelivery[]);
    setDeliveriesLoading(false);
  };

  const handleCreate = async () => {
    if (!formName || !formUrl || formEvents.length === 0) {
      setMessage("Name, URL, and at least one event are required");
      return;
    }

    setSaving(true);
    const data: CreateWebhookData = {
      name: formName,
      url: formUrl,
      events: formEvents as CreateWebhookData["events"],
      description: formDescription || undefined,
    };

    const res = await createWebhookEndpoint(data);
    setSaving(false);

    if (res.success) {
      setShowCreate(false);
      setFormName("");
      setFormUrl("");
      setFormEvents([]);
      setFormDescription("");
      setMessage("Webhook created!");
      loadEndpoints();
    } else {
      setMessage(res.error || "Failed to create webhook");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    const res = await updateWebhookEndpoint(id, { isActive: !currentActive });
    if (res.success) {
      setMessage(currentActive ? "Webhook disabled" : "Webhook enabled");
      loadEndpoints();
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook endpoint?")) return;
    const res = await deleteWebhookEndpoint(id);
    if (res.success) {
      setMessage("Webhook deleted");
      loadEndpoints();
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleRegenSecret = async (id: string) => {
    if (!confirm("Regenerate secret? Existing integrations will stop working.")) return;
    const res = await regenerateWebhookSecret(id);
    if (res.success) {
      setMessage("Secret regenerated!");
      loadEndpoints();
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleRetry = async (deliveryId: string) => {
    const res = await retryWebhookDelivery(deliveryId);
    if (res.success) {
      setMessage("Webhook retried");
      if (showDeliveries) loadDeliveries(showDeliveries);
    } else {
      setMessage(res.error || "Retry failed");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage("Copied!");
    setTimeout(() => setMessage(""), 2000);
  };

  const toggleEvent = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <Webhook className="h-6 w-6 text-nexabook-600" />
            Webhooks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send real-time data to external services when events happen
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Webhook Endpoint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Slack Notifications"
                />
              </div>
              <div>
                <Label>Endpoint URL</Label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://hooks.example.com/webhook"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What is this webhook for?"
                />
              </div>
              <div>
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEvents.includes(ev.value)}
                        onChange={() => toggleEvent(ev.value)}
                        className="rounded border-gray-300"
                      />
                      {ev.label}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
        </div>
      ) : endpoints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No webhooks configured yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a webhook to send data to external services
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <Card key={ep.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{ep.name}</CardTitle>
                    <Badge variant={ep.isActive ? "default" : "secondary"}>
                      {ep.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDeliveries(ep.id)}
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      Logs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(ep.id, ep.isActive)}
                    >
                      {ep.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenSecret(ep.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(ep.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate max-w-md">
                      {ep.url}
                    </span>
                    <button onClick={() => copyToClipboard(ep.url)} className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ep.events.map((ev) => (
                    <Badge key={ev} variant="outline" className="text-xs">
                      {ev}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Secret:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                    {ep.secret.substring(0, 16)}...
                  </code>
                  <button onClick={() => copyToClipboard(ep.secret)} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {ep.description && (
                  <p className="text-xs text-muted-foreground mt-2">{ep.description}</p>
                )}
              </CardContent>

              {showDeliveries === ep.id && (
                <CardContent className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Delivery Logs</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeliveries(null)}
                    >
                      Close
                    </Button>
                  </div>
                  {deliveriesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : deliveries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No deliveries yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {deliveries.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-start justify-between p-2 bg-muted/50 rounded-md text-xs"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  d.status === "success"
                                    ? "default"
                                    : d.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[10px] px-1 py-0"
                              >
                                {d.status}
                              </Badge>
                              <span className="font-medium">{d.event}</span>
                              <span className="text-muted-foreground">
                                (attempt {d.attempts})
                              </span>
                            </div>
                            {d.responseCode && (
                              <span className="text-muted-foreground block mt-0.5">
                                HTTP {d.responseCode}
                              </span>
                            )}
                            <span className="text-muted-foreground block mt-0.5">
                              {d.createdAt.toLocaleString()}
                            </span>
                          </div>
                          {d.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => handleRetry(d.id)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
