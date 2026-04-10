"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Hash, Percent, Users, Save, Upload, Plus, Trash2, CheckCircle,
} from "lucide-react";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement server action
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-nexabook-900">System Settings</h1>
        <p className="text-nexabook-600 mt-1">Configure company profile, numbering, tax, and user access</p>
      </motion.div>

      <Tabs defaultValue="company">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company"><Building2 className="h-4 w-4 mr-2" />Company Profile</TabsTrigger>
          <TabsTrigger value="numbering"><Hash className="h-4 w-4 mr-2" />Numbering Series</TabsTrigger>
          <TabsTrigger value="tax"><Percent className="h-4 w-4 mr-2" />Tax Settings</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />User Management</TabsTrigger>
        </TabsList>

        {/* COMPANY PROFILE */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Company Information</CardTitle><CardDescription>Update your business details and branding</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-lg bg-nexabook-100 flex items-center justify-center border-2 border-dashed border-nexabook-300">
                  <Building2 className="h-10 w-10 text-nexabook-400" />
                </div>
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Upload Logo</Button>
                    <Button variant="ghost" size="sm" className="text-red-600">Remove</Button>
                  </div>
                  <p className="text-xs text-nexabook-500">PNG, JPG up to 2MB. Recommended: 200x200px</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Company Name*</Label><Input defaultValue="Acme Corporation" /></div>
                <div className="space-y-2"><Label>Slug</Label><Input defaultValue="acme-corporation" disabled className="bg-nexabook-50" /></div>
                <div className="space-y-2"><Label>NTN (National Tax Number)</Label><Input placeholder="1234567-8" /></div>
                <div className="space-y-2"><Label>STRN (Sales Tax Registration)</Label><Input placeholder="1234567890123" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input placeholder="+92-XXX-XXXXXXX" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="info@company.com" /></div>
                <div className="space-y-2"><Label>Website</Label><Input placeholder="https://company.com" /></div>
                <div className="space-y-2"><Label>Currency</Label>
                  <select className="w-full rounded-md border border-nexabook-200 px-3 py-2" defaultValue="PKR">
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2"><Label>Address</Label><Textarea rows={3} placeholder="Street, City, Province" /></div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>City</Label><Input placeholder="Karachi" /></div>
                <div className="space-y-2"><Label>Country</Label><Input defaultValue="Pakistan" /></div>
                <div className="space-y-2"><Label>Fiscal Year Start</Label>
                  <select className="w-full rounded-md border border-nexabook-200 px-3 py-2" defaultValue="07-01">
                    <option value="01-01">January 1</option>
                    <option value="04-01">April 1</option>
                    <option value="07-01">July 1</option>
                    <option value="10-01">October 1</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleSave} className="bg-nexabook-900 hover:bg-nexabook-800">
                <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NUMBERING SERIES */}
        <TabsContent value="numbering" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Document Numbering Series</CardTitle><CardDescription>Configure custom prefixes and formats for document numbers</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Sales Invoice", key: "invoice", default: "SI", example: "SI-00001" },
                { label: "Sale Order", key: "order", default: "SO", example: "SO-00001" },
                { label: "Purchase Invoice (Bill)", key: "purchase", default: "PI", example: "PI-00001" },
                { label: "Purchase Order", key: "po", default: "PO", example: "PO-00001" },
                { label: "Quotation", key: "quote", default: "QT", example: "QT-00001" },
                { label: "Delivery Note", key: "delivery", default: "DN", example: "DN-00001" },
                { label: "Journal Entry", key: "journal", default: "JE", example: "JE-00001" },
                { label: "Payment Receipt", key: "payment", default: "RC", example: "RC-00001" },
              ].map((series, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg">
                  <div className="col-span-3"><Label className="text-sm font-medium">{series.label}</Label></div>
                  <div className="col-span-2"><Input defaultValue={series.default} placeholder="Prefix" className="h-9" /></div>
                  <div className="col-span-2"><Input defaultValue="00001" placeholder="Start #" className="h-9" /></div>
                  <div className="col-span-3"><p className="text-sm text-nexabook-500">Example: <code className="bg-nexabook-100 px-2 py-0.5 rounded">{series.example}</code></p></div>
                  <div className="col-span-2 flex justify-end"><Badge variant="outline">Active</Badge></div>
                </div>
              ))}

              <Button onClick={handleSave} className="bg-nexabook-900 hover:bg-nexabook-800 mt-4">
                <Save className="h-4 w-4 mr-2" />Save Numbering Series
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAX SETTINGS */}
        <TabsContent value="tax" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Global Tax Configuration</CardTitle><CardDescription>Set default GST and WHT rates applied across the system</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">GST (Goods & Services Tax) Rates</Label>
                {[
                  { label: "Standard GST Rate", value: "18", desc: "Applied to most goods and services" },
                  { label: "Reduced GST Rate", value: "5", desc: "For essential items and basic goods" },
                  { label: "Zero Rated", value: "0", desc: "For exports and exempt supplies" },
                ].map((tax, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg">
                    <div className="col-span-6">
                      <p className="font-medium">{tax.label}</p>
                      <p className="text-xs text-nexabook-500">{tax.desc}</p>
                    </div>
                    <div className="col-span-2"><Input defaultValue={tax.value} className="h-9 text-right" /><span className="text-sm text-nexabook-500">%</span></div>
                    <div className="col-span-4 flex items-center gap-2 justify-end">
                      <Switch defaultChecked />
                      <span className="text-sm text-nexabook-600">Enabled</span>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-semibold">Withholding Tax (WHT) Rates</Label>
                {[
                  { label: "WHT on Goods", value: "6.5", desc: "Applicable on purchase of goods" },
                  { label: "WHT on Services", value: "10", desc: "Applicable on service payments" },
                  { label: "WHT on Rent", value: "15", desc: "Applicable on rental payments" },
                  { label: "WHT on Contracts", value: "7", desc: "Applicable on execution contracts" },
                ].map((wht, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg">
                    <div className="col-span-6">
                      <p className="font-medium">{wht.label}</p>
                      <p className="text-xs text-nexabook-500">{wht.desc}</p>
                    </div>
                    <div className="col-span-2"><Input defaultValue={wht.value} className="h-9 text-right" /><span className="text-sm text-nexabook-500">%</span></div>
                    <div className="col-span-4 flex items-center gap-2 justify-end">
                      <Switch defaultChecked={idx < 2} />
                      <span className="text-sm text-nexabook-600">Enabled</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} className="bg-nexabook-900 hover:bg-nexabook-800">
                <Save className="h-4 w-4 mr-2" />Save Tax Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* USER MANAGEMENT / RBAC */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>User Access Control</CardTitle><CardDescription>Manage roles and permissions (RBAC)</CardDescription></div>
              <Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="h-4 w-4 mr-2" />Invite User</Button>
            </CardHeader>
            <CardContent>
              {/* Roles Definition */}
              <div className="mb-6">
                <Label className="text-base font-semibold mb-4 block">Role Definitions</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { role: "Admin", color: "bg-red-100 text-red-800", perms: "Full Access", users: 2 },
                    { role: "Manager", color: "bg-blue-100 text-blue-800", perms: "Read/Write + Approvals", users: 3 },
                    { role: "Staff", color: "bg-green-100 text-green-800", perms: "Limited Read/Write", users: 5 },
                    { role: "Accountant", color: "bg-purple-100 text-purple-800", perms: "Accounts Module Only", users: 1 },
                  ].map((r, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={r.color}>{r.role}</Badge>
                          <span className="text-xs text-nexabook-500">{r.users} users</span>
                        </div>
                        <p className="text-sm text-nexabook-600">{r.perms}</p>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">Edit Permissions</Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Trash2 className="h-3 w-3 text-red-500" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Active Users Table */}
              <Label className="text-base font-semibold mb-4 block">Active Users</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-nexabook-50">
                    <tr><th className="text-left px-4 py-3 text-sm font-medium text-nexabook-600">User</th><th className="text-left px-4 py-3 text-sm font-medium text-nexabook-600">Email</th><th className="text-left px-4 py-3 text-sm font-medium text-nexabook-600">Role</th><th className="text-left px-4 py-3 text-sm font-medium text-nexabook-600">Status</th><th className="text-right px-4 py-3 text-sm font-medium text-nexabook-600">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { name: "John Doe", email: "john@acme.com", role: "Admin", status: "Active" },
                      { name: "Jane Smith", email: "jane@acme.com", role: "Manager", status: "Active" },
                      { name: "Mike Johnson", email: "mike@acme.com", role: "Accountant", status: "Active" },
                      { name: "Sarah Wilson", email: "sarah@acme.com", role: "Staff", status: "Pending" },
                    ].map((user, idx) => (
                      <tr key={idx} className="hover:bg-nexabook-50/50">
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-nexabook-600">{user.email}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{user.role}</Badge></td>
                        <td className="px-4 py-3"><Badge variant={user.status === "Active" ? "default" : "outline"} className="gap-1"><CheckCircle className="h-3 w-3" />{user.status}</Badge></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7">Edit Role</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
