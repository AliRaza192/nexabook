"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, Save, Loader2, CheckCircle2, AlertCircle,
  X, Pencil, ShieldCheck, UserCheck, UserX, Settings2, Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  getCompanyProfile, updateCompanyProfile,
  getOrgUsers, updateOrgUser, updateMyProfile,
  deactivateUser, reactivateUser, getCurrentUserProfile,
  getReminderSettings, updateReminderSettings,
  type CompanyProfileData, type UpdateUserData,
} from "@/lib/actions/settings";

type Tab = "company" | "users" | "myprofile" | "numbering" | "reminders";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  accountant: "bg-green-100 text-green-800",
  staff: "bg-gray-100 text-gray-700",
};

const FISCAL_YEARS = [
  { label: "Jan 1 – Dec 31", value: "01-01" },
  { label: "Apr 1 – Mar 31", value: "04-01" },
  { label: "Jul 1 – Jun 30 (Pakistan)", value: "07-01" },
  { label: "Oct 1 – Sep 30", value: "10-01" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("company");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Company Profile
  const [company, setCompany] = useState<CompanyProfileData & { id?: string }>({
    name: "", email: "", phone: "", address: "", city: "", country: "Pakistan",
    website: "", ntn: "", strn: "", currency: "PKR", fiscalYearStart: "07-01",
    invoicePrefix: "INV", orderPrefix: "SO", quotationPrefix: "QT",
    purchasePrefix: "PO", billPrefix: "PI", grnPrefix: "GRN",
    numberingPadding: 5, numberingIncludeYear: false,
  });

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState<UpdateUserData>({
    fullName: "", phone: "", department: "", designation: "", role: "staff", isActive: true,
  });

  // My Profile
  const [myProfile, setMyProfile] = useState({ fullName: "", phone: "", department: "", designation: "" });

  // Reminder Settings
  const [reminder, setReminder] = useState({
    isActive: false,
    reminderDaysBefore: 3,
    reminderOnDueDate: true,
    reminderDaysAfter: 7,
    messageTemplate: "Assalam-o-Alaikum {customerName}!\n{businessName} ki taraf se yaad dahaani:\nInvoice #{invoiceNumber} ka Rs. {amount} was due on {dueDate}.\nShukriya!",
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [compRes, usersRes, meRes, remRes] = await Promise.all([
      getCompanyProfile(),
      getOrgUsers(),
      getCurrentUserProfile(),
      getReminderSettings(),
    ]);
    if (compRes.success && compRes.data) {
      const d = compRes.data as any;
      setCompany({
        name: d.name || "", email: d.email || "", phone: d.phone || "",
        address: d.address || "", city: d.city || "", country: d.country || "Pakistan",
        website: d.website || "", ntn: d.ntn || "", strn: d.strn || "",
        currency: d.currency || "PKR", fiscalYearStart: d.fiscalYearStart || "07-01",
        invoicePrefix: d.invoicePrefix || "INV", orderPrefix: d.orderPrefix || "SO",
        quotationPrefix: d.quotationPrefix || "QT", purchasePrefix: d.purchasePrefix || "PO",
        billPrefix: d.billPrefix || "PI", grnPrefix: d.grnPrefix || "GRN",
        numberingPadding: d.numberingPadding || 5,
        numberingIncludeYear: d.numberingIncludeYear || false,
        logo: d.logo || "",
      });
    }
    if (usersRes.success && usersRes.data) setUsers(usersRes.data as any);
    if (remRes.success && remRes.data) {
      const r = remRes.data as any;
      setReminder({
        isActive: r.isActive ?? false,
        reminderDaysBefore: r.reminderDaysBefore ?? 3,
        reminderOnDueDate: r.reminderOnDueDate ?? true,
        reminderDaysAfter: r.reminderDaysAfter ?? 7,
        messageTemplate: r.messageTemplate || reminder.messageTemplate,
      });
    }
    if (meRes.success && meRes.data) {
      const me = meRes.data as any;
      setCurrentUser(me);
      setMyProfile({
        fullName: me.fullName || "", phone: me.phone || "",
        department: me.department || "", designation: me.designation || "",
      });
    }
  };

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Save Company Profile ──
  const saveCompany = async () => {
    setSaving(true);
    const r = await updateCompanyProfile(company);
    setSaving(false);
    r.success ? showMsg("success", "Company profile updated") : showMsg("error", r.error || "Failed");
  };

  // ── Save My Profile ──
  const saveMyProfile = async () => {
    setSaving(true);
    const r = await updateMyProfile(myProfile);
    setSaving(false);
    r.success ? showMsg("success", "Profile updated") : showMsg("error", r.error || "Failed");
  };

  // ── Edit User ──
  const openEditUser = (u: any) => {
    setEditUser(u);
    setEditUserForm({
      fullName: u.fullName, phone: u.phone || "",
      department: u.department || "", designation: u.designation || "",
      role: u.role, isActive: u.isActive,
    });
  };

  const saveEditUser = async () => {
    if (!editUser) return;
    setSaving(true);
    const r = await updateOrgUser(editUser.id, editUserForm);
    setSaving(false);
    if (r.success) {
      showMsg("success", "User updated");
      setEditUser(null);
      loadAll();
    } else {
      showMsg("error", r.error || "Failed");
    }
  };

  const saveReminder = async () => {
    setSaving(true);
    const r = await updateReminderSettings(reminder);
    setSaving(false);
    r.success ? showMsg("success", "Reminder settings saved") : showMsg("error", r.error || "Failed");
  };

  const handleToggleUser = async (u: any) => {
    setSaving(true);
    const r = u.isActive ? await deactivateUser(u.id) : await reactivateUser(u.id);
    setSaving(false);
    r.success ? (showMsg("success", `User ${u.isActive ? "deactivated" : "reactivated"}`), loadAll())
      : showMsg("error", r.error || "Failed");
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "company", label: "Company Profile", icon: <Building2 className="h-4 w-4" /> },
    { id: "numbering", label: "Document Numbering", icon: <Settings2 className="h-4 w-4" /> },
    { id: "users", label: "User Management", icon: <Users className="h-4 w-4" /> },
    { id: "myprofile", label: "My Profile", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "reminders", label: "Payment Reminders", icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-nexabook-600" />
          Settings
        </h1>
        <p className="text-nexabook-500 text-sm mt-1">Manage company information, users, and preferences</p>
      </motion.div>

      {/* Notification */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
            message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-nexabook-100 pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.id
                ? "border-nexabook-600 text-nexabook-900"
                : "border-transparent text-nexabook-500 hover:text-nexabook-700"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Company Profile ── */}
      {activeTab === "company" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="enterprise-card">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-base font-semibold text-nexabook-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-nexabook-600" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <Label>Business Name <span className="text-red-500">*</span></Label>
                  <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} placeholder="My Business Ltd." />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={company.email || ""} onChange={(e) => setCompany({ ...company, email: e.target.value })} placeholder="info@business.com" />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={company.phone || ""} onChange={(e) => setCompany({ ...company, phone: e.target.value })} placeholder="+92 300 0000000" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Address</Label>
                  <Input value={company.address || ""} onChange={(e) => setCompany({ ...company, address: e.target.value })} placeholder="Street, Area" />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input value={company.city || ""} onChange={(e) => setCompany({ ...company, city: e.target.value })} placeholder="Karachi" />
                </div>
                <div className="space-y-1">
                  <Label>Website</Label>
                  <Input value={company.website || ""} onChange={(e) => setCompany({ ...company, website: e.target.value })} placeholder="https://yourbusiness.com" />
                </div>
                <div className="space-y-1">
                  <Label>NTN (Tax Number)</Label>
                  <Input value={company.ntn || ""} onChange={(e) => setCompany({ ...company, ntn: e.target.value })} placeholder="1234567-8" />
                </div>
                <div className="space-y-1">
                  <Label>STRN (Sales Tax Reg. No.)</Label>
                  <Input value={company.strn || ""} onChange={(e) => setCompany({ ...company, strn: e.target.value })} placeholder="12-34-5678-901-12" />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={company.currency || "PKR"} onValueChange={(v) => setCompany({ ...company, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">PKR — Pakistani Rupee</SelectItem>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                      <SelectItem value="GBP">GBP — British Pound</SelectItem>
                      <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                      <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                      <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD — Australian Dollar</SelectItem>
                      <SelectItem value="CNY">CNY — Chinese Yuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Fiscal Year Start</Label>
                  <Select value={company.fiscalYearStart || "07-01"} onValueChange={(v) => setCompany({ ...company, fiscalYearStart: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FISCAL_YEARS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveCompany} disabled={saving} className="bg-nexabook-600 hover:bg-nexabook-700 text-white px-6">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Tab: Document Numbering ── */}
      {activeTab === "numbering" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="enterprise-card">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-base font-semibold text-nexabook-900">Document Prefixes</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: "invoicePrefix", label: "Sales Invoice", placeholder: "INV" },
                  { key: "orderPrefix", label: "Sale Order", placeholder: "SO" },
                  { key: "quotationPrefix", label: "Quotation", placeholder: "QT" },
                  { key: "purchasePrefix", label: "Purchase Order", placeholder: "PO" },
                  { key: "billPrefix", label: "Purchase Bill", placeholder: "PI" },
                  { key: "grnPrefix", label: "GRN", placeholder: "GRN" },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      value={(company as any)[f.key] || ""}
                      onChange={(e) => setCompany({ ...company, [f.key]: e.target.value.toUpperCase() })}
                      placeholder={f.placeholder}
                      className="uppercase font-mono"
                      maxLength={10}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-nexabook-100">
                <div className="space-y-1">
                  <Label className="text-xs">Number Padding (digits)</Label>
                  <Select
                    value={String(company.numberingPadding || 5)}
                    onValueChange={(v) => setCompany({ ...company, numberingPadding: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} digits (e.g. {String(1).padStart(n, "0")})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Include Year in Number</Label>
                  <Select
                    value={company.numberingIncludeYear ? "yes" : "no"}
                    onValueChange={(v) => setCompany({ ...company, numberingIncludeYear: v === "yes" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No (INV-00001)</SelectItem>
                      <SelectItem value="yes">Yes (INV-2026-00001)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-nexabook-50 rounded-lg px-4 py-2.5 text-xs text-nexabook-600 border border-nexabook-100">
                <span className="font-medium">Preview: </span>
                {company.invoicePrefix || "INV"}
                {company.numberingIncludeYear ? `-${new Date().getFullYear()}` : ""}
                -{String(1).padStart(company.numberingPadding || 5, "0")}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveCompany} disabled={saving} className="bg-nexabook-600 hover:bg-nexabook-700 text-white px-6">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Tab: User Management ── */}
      {activeTab === "users" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-nexabook-500">{users.length} users in your organization</p>
            {currentUser?.role !== "admin" && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">Admin access required to edit users</Badge>
            )}
          </div>

          <Card className="enterprise-card">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-nexabook-50 border-b border-nexabook-200">
                    {["Name", "Email", "Role", "Department", "Status", "Last Login", "Actions"].map((h) => (
                      <th key={h} className="py-3 px-4 text-left font-semibold text-nexabook-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-nexabook-400">No users found</td></tr>
                  ) : (
                    users.map((user, i) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className={`border-b border-nexabook-100 hover:bg-nexabook-50 ${!user.isActive ? "opacity-50" : ""}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-nexabook-200 flex items-center justify-center text-xs font-bold text-nexabook-700">
                              {user.fullName?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-nexabook-900">{user.fullName}</p>
                              {user.designation && <p className="text-xs text-nexabook-400">{user.designation}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-nexabook-600">{user.email}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs capitalize ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-700"}`}>{user.role}</Badge>
                        </td>
                        <td className="py-3 px-4 text-nexabook-500 text-xs">{user.department || "—"}</td>
                        <td className="py-3 px-4">
                          {user.isActive
                            ? <span className="flex items-center gap-1 text-green-600 text-xs"><UserCheck className="h-3.5 w-3.5" />Active</span>
                            : <span className="flex items-center gap-1 text-red-500 text-xs"><UserX className="h-3.5 w-3.5" />Inactive</span>}
                        </td>
                        <td className="py-3 px-4 text-nexabook-400 text-xs">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
                            : "Never"}
                        </td>
                        <td className="py-3 px-4">
                          {currentUser?.role === "admin" && user.id !== currentUser?.id && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-nexabook-500 hover:text-blue-700"
                                onClick={() => openEditUser(user)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon"
                                className={`h-7 w-7 ${user.isActive ? "text-nexabook-500 hover:text-red-600" : "text-nexabook-500 hover:text-green-600"}`}
                                onClick={() => handleToggleUser(user)}>
                                {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          )}
                          {user.id === currentUser?.id && (
                            <span className="text-xs text-nexabook-400 italic">You</span>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <strong>Note:</strong> To invite new users, share your Clerk-based signup link. New users who sign up will automatically be assigned to your organization with "staff" role. Admin can then change their role from here.
          </div>
        </motion.div>
      )}

      {/* ── Tab: My Profile ── */}
      {activeTab === "myprofile" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="enterprise-card max-w-xl">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-base font-semibold text-nexabook-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-nexabook-600" />
                My Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {currentUser && (
                <div className="flex items-center gap-3 p-3 bg-nexabook-50 rounded-lg border border-nexabook-100">
                  <div className="w-10 h-10 rounded-full bg-nexabook-200 flex items-center justify-center text-lg font-bold text-nexabook-700">
                    {currentUser.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-nexabook-900">{currentUser.fullName}</p>
                    <p className="text-xs text-nexabook-500">{currentUser.email}</p>
                    <Badge className={`text-xs capitalize mt-1 ${ROLE_COLORS[currentUser.role] || ""}`}>{currentUser.role}</Badge>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input value={myProfile.fullName} onChange={(e) => setMyProfile({ ...myProfile, fullName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={myProfile.phone} onChange={(e) => setMyProfile({ ...myProfile, phone: e.target.value })} placeholder="+92 300 0000000" />
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Input value={myProfile.department} onChange={(e) => setMyProfile({ ...myProfile, department: e.target.value })} placeholder="Accounts, Sales, etc." />
                </div>
                <div className="space-y-1">
                  <Label>Designation</Label>
                  <Input value={myProfile.designation} onChange={(e) => setMyProfile({ ...myProfile, designation: e.target.value })} placeholder="Manager, Accountant, etc." />
                </div>
              </div>

              <div className="text-xs text-nexabook-400 bg-nexabook-50 rounded p-2">
                Email and role can only be changed by an admin.
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-start">
            <Button onClick={saveMyProfile} disabled={saving} className="bg-nexabook-600 hover:bg-nexabook-700 text-white px-6">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Tab: Payment Reminders ── */}
      {activeTab === "reminders" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="enterprise-card max-w-2xl">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-base font-semibold text-nexabook-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-nexabook-600" />
                Automated Payment Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-900">Enable Reminders</p>
                  <p className="text-xs text-nexabook-500">Send SMS reminders to customers for overdue invoices</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer"
                    checked={reminder.isActive}
                    onChange={(e) => setReminder({ ...reminder, isActive: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-nexabook-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div className="border-t border-nexabook-100 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Remind Before (days)</Label>
                    <Input type="number" min={0} max={30}
                      value={reminder.reminderDaysBefore}
                      onChange={(e) => setReminder({ ...reminder, reminderDaysBefore: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-nexabook-400">Days before due date</p>
                  </div>
                  <div className="space-y-1">
                    <Label>On Due Date</Label>
                    <Select value={reminder.reminderOnDueDate ? "yes" : "no"}
                      onValueChange={(v) => setReminder({ ...reminder, reminderOnDueDate: v === "yes" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Send reminder on due date</SelectItem>
                        <SelectItem value="no">Skip on due date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Remind After (days)</Label>
                    <Input type="number" min={0} max={60}
                      value={reminder.reminderDaysAfter}
                      onChange={(e) => setReminder({ ...reminder, reminderDaysAfter: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-nexabook-400">Days after due date (overdue)</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Message Template</Label>
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-nexabook-200 bg-white px-3 py-2 text-sm font-mono text-nexabook-800 focus:outline-none focus:ring-2 focus:ring-nexabook-400 resize-y"
                    value={reminder.messageTemplate}
                    onChange={(e) => setReminder({ ...reminder, messageTemplate: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-nexabook-400">
                    <span><code>{'{customerName}'}</code> — Customer name</span>
                    <span><code>{'{businessName}'}</code> — Your business name</span>
                    <span><code>{'{invoiceNumber}'}</code> — Invoice number</span>
                    <span><code>{'{amount}'}</code> — Invoice amount</span>
                    <span><code>{'{dueDate}'}</code> — Due date</span>
                  </div>
                </div>

                <div className="bg-nexabook-50 rounded-lg p-3 border border-nexabook-100">
                  <p className="text-xs font-medium text-nexabook-700 mb-1">Preview:</p>
                  <p className="text-sm text-nexabook-600 whitespace-pre-wrap">
                    {reminder.messageTemplate
                      .replace(/{customerName}/g, "Ahmed Khan")
                      .replace(/{businessName}/g, "NexaBook")
                      .replace(/{invoiceNumber}/g, "INV-00001")
                      .replace(/{amount}/g, "Rs. 15,000")
                      .replace(/{dueDate}/g, new Date().toLocaleDateString("en-PK"))
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveReminder} disabled={saving} className="bg-nexabook-600 hover:bg-nexabook-700 text-white px-6">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Reminder Settings
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Edit User Dialog ── */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-nexabook-600" />
              Edit User — {editUser?.fullName}
            </DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={editUserForm.fullName} onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={editUserForm.phone || ""} onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input value={editUserForm.department || ""} onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Designation</Label>
              <Input value={editUserForm.designation || ""} onChange={(e) => setEditUserForm({ ...editUserForm, designation: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={editUserForm.role} onValueChange={(v) => setEditUserForm({ ...editUserForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={saveEditUser} disabled={saving} className="bg-nexabook-600 hover:bg-nexabook-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}