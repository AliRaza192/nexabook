"use client";

import { useState, useEffect } from "react";
import { getEmailTemplate, saveEmailTemplate } from "@/lib/actions/email-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, Mail, Eye } from "lucide-react";

export default function EmailTemplatesPage() {
  const [templateType, setTemplateType] = useState("invoice");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, [templateType]);

  const load = async () => {
    setLoading(true);
    const res = await getEmailTemplate(templateType);
    if (res.success && res.data) {
      setSubject(res.data.subject || "");
      setBodyHtml(res.data.bodyHtml || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveEmailTemplate({ templateType, subject, bodyHtml });
    setSaving(false);
    setMessage(res.success ? "Template saved!" : res.error || "Failed");
    setTimeout(() => setMessage(""), 3000);
  };

  const previewHtml = bodyHtml
    .replace(/{businessName}/g, "NexaBook")
    .replace(/{invoiceNumber}/g, "INV-00001")
    .replace(/{customerName}/g, "Ahmed Khan")
    .replace(/{amount}/g, "Rs. 15,000")
    .replace(/{dueDate}/g, new Date().toLocaleDateString("en-PK"))
    .replace(/{paymentLink}/g, "#")
    .replace(/{businessPhone}/g, "+92 300 1234567")
    .replace(/{businessEmail}/g, "info@nexabook.com")
    .replace(/{items}/g, "<tr><td>Product A</td><td>2</td><td>Rs. 10,000</td></tr><tr><td>Product B</td><td>1</td><td>Rs. 5,000</td></tr>")
    .replace(/{notes}/g, "<p style='color:#64748b;font-size:13px;margin-top:16px'>Thank you for your business!</p>");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-nexabook-600" />
            Email Templates
          </h1>
          <p className="text-nexabook-500 text-sm mt-1">Customize email templates for invoices and quotations</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="quotation">Quotation</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setPreview(!preview)}>
            <Eye className="h-4 w-4 mr-1" /> {preview ? "Edit" : "Preview"}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-nexabook-600 hover:bg-nexabook-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg border text-sm ${message === "Template saved!" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-nexabook-400" /></div>
      ) : preview ? (
        <Card className="enterprise-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-nexabook-50">
            <CardTitle className="text-sm font-semibold text-nexabook-900">
              Preview: {subject}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <iframe srcDoc={previewHtml} className="w-full border-0" style={{ minHeight: "500px" }} title="Preview" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="enterprise-card">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-sm font-semibold text-nexabook-900">Subject Line</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Label>Email Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Invoice #{invoiceNumber} from {businessName}" className="mt-1" />
              <p className="text-xs text-nexabook-400 mt-1">
                Variables: <code>{'{invoiceNumber}'}</code> <code>{'{businessName}'}</code> <code>{'{customerName}'}</code> <code>{'{amount}'}</code>
              </p>
            </CardContent>
          </Card>

          <Card className="enterprise-card">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-sm font-semibold text-nexabook-900">Available Variables</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-sm">
              {[
                { var: "{businessName}", desc: "Your business name" },
                { var: "{invoiceNumber}", desc: "Invoice/quotation number" },
                { var: "{customerName}", desc: "Customer name" },
                { var: "{amount}", desc: "Invoice total" },
                { var: "{dueDate}", desc: "Due/valid until date" },
                { var: "{paymentLink}", desc: "Online payment link" },
                { var: "{businessPhone}", desc: "Your phone number" },
                { var: "{businessEmail}", desc: "Your email" },
                { var: "{items}", desc: "Invoice items HTML table" },
                { var: "{notes}", desc: "Invoice notes" },
              ].map((v) => (
                <div key={v.var} className="flex items-center gap-2">
                  <code className="text-xs bg-nexabook-100 px-1.5 py-0.5 rounded text-nexabook-700">{v.var}</code>
                  <span className="text-nexabook-500">— {v.desc}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card className="enterprise-card">
              <CardHeader className="pb-3 border-b border-nexabook-50">
                <CardTitle className="text-sm font-semibold text-nexabook-900">HTML Body</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <textarea
                  className="w-full min-h-[400px] rounded-lg border border-nexabook-200 bg-white px-3 py-2 text-xs font-mono text-nexabook-800 focus:outline-none focus:ring-2 focus:ring-nexabook-400 resize-y"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
