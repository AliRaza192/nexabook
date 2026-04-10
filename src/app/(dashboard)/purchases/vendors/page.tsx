"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Loader2,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Eye,
  Pencil,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getVendors, createVendor, type VendorFormData } from "@/lib/actions/purchases";

interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  ntn: string | null;
  strn: string | null;
  address: string | null;
  openingBalance: string | null;
  balance: string | null;
  isActive: boolean;
  createdAt: Date;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  totalPayable: number;
}

// Stat card component
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  color: "blue" | "green" | "orange";
}) {
  const colorClasses = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={`border ${colors.border} hover:shadow-md transition-shadow`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-nexabook-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-nexabook-900">{value}</p>
              <p className="text-xs text-nexabook-500 mt-2">{description}</p>
            </div>
            <div className={`h-12 w-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${colors.icon}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Add Vendor Dialog
function AddVendorDialog({ open, onOpenChange, onVendorCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendorCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    phone: "",
    email: "",
    ntn: "",
    strn: "",
    address: "",
    openingBalance: "0",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Vendor name is required");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createVendor(formData);
      if (result.success) {
        alert("Vendor created successfully!");
        onVendorCreated();
        onOpenChange(false);
        setFormData({ name: "", phone: "", email: "", ntn: "", strn: "", address: "", openingBalance: "0" });
      } else {
        alert(result.error || "Failed to create vendor");
      }
    } catch (error) {
      alert("Failed to create vendor");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-nexabook-900">
              <UserPlus className="h-5 w-5 text-nexabook-600" />
              Add New Vendor
            </DialogTitle>
            <DialogDescription>
              Add a new vendor/supplier to your purchase management system.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label className="text-sm font-medium text-nexabook-700 mb-1 block">Vendor Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter vendor name"
                className="border-nexabook-200"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-nexabook-700 mb-1 block">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                className="border-nexabook-200"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-nexabook-700 mb-1 block">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
                className="border-nexabook-200"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-nexabook-700 mb-1 block">NTN</Label>
              <Input
                value={formData.ntn}
                onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                placeholder="National Tax Number"
                className="border-nexabook-200"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-nexabook-700 mb-1 block">STRN</Label>
              <Input
                value={formData.strn}
                onChange={(e) => setFormData({ ...formData, strn: e.target.value })}
                placeholder="Sales Tax Registration Number"
                className="border-nexabook-200"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-sm font-medium text-nexabook-700 mb-1 block">Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Vendor address"
                className="min-h-[80px] border-nexabook-200"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-sm font-medium text-nexabook-700 mb-1 block">Opening Balance (PKR)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.openingBalance}
                onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                placeholder="0.00"
                className="border-nexabook-200"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-nexabook-300 text-nexabook-700 hover:bg-nexabook-50">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><UserPlus className="mr-2 h-4 w-4" />Create Vendor</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main Vendors Page
export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const vendorsRes = await getVendors(searchQuery);
      if (vendorsRes.success && vendorsRes.data) {
        const vendorData = vendorsRes.data as Vendor[];
        setVendors(vendorData);

        // Calculate stats
        const totalVendors = vendorData.length;
        const activeVendors = vendorData.filter(v => v.isActive).length;
        const totalPayable = vendorData.reduce((sum, v) => sum + parseFloat(v.balance || '0'), 0);

        setStats({ totalVendors, activeVendors, totalPayable });
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [searchQuery]);

  const formatCurrency = (value: string | null) => {
    if (!value) return "Rs. 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  if (loading && !vendors.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-nexabook-900">Vendor Management</h1>
          <p className="text-nexabook-600 mt-1">
            Manage your vendors/suppliers and track outstanding balances.
          </p>
        </div>

        <Button onClick={() => setDialogOpen(true)} className="bg-nexabook-900 hover:bg-nexabook-800">
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Vendors"
            value={stats.totalVendors}
            icon={Users}
            description="All vendors"
            color="blue"
          />
          <StatCard
            title="Active Vendors"
            value={stats.activeVendors}
            icon={UserPlus}
            description="Currently active"
            color="green"
          />
          <StatCard
            title="Total Payable"
            value={formatCurrency(stats.totalPayable.toString())}
            icon={FileText}
            description="Outstanding balance"
            color="orange"
          />
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="search"
                placeholder="Search vendors by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-nexabook-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendors List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">
            Vendors ({vendors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No vendors found
              </h3>
              <p className="text-nexabook-600 mb-4">
                {searchQuery ? "Try adjusting your search" : "Add your first vendor to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setDialogOpen(true)} className="bg-nexabook-900 hover:bg-nexabook-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Vendor
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Vendor Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">NTN / STRN</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Balance</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor, index) => (
                    <motion.tr
                      key={vendor.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-nexabook-900">{vendor.name}</p>
                        {vendor.address && (
                          <p className="text-xs text-nexabook-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {vendor.address.substring(0, 40)}{vendor.address.length > 40 ? '...' : ''}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {vendor.phone && (
                          <p className="text-xs text-nexabook-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vendor.phone}
                          </p>
                        )}
                        {vendor.email && (
                          <p className="text-xs text-nexabook-600 flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" />
                            {vendor.email}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {vendor.ntn && <p className="text-xs text-nexabook-600">NTN: {vendor.ntn}</p>}
                        {vendor.strn && <p className="text-xs text-nexabook-600">STRN: {vendor.strn}</p>}
                        {!vendor.ntn && !vendor.strn && <span className="text-xs text-nexabook-400">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <p className={`text-sm font-semibold ${parseFloat(vendor.balance || '0') > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(vendor.balance)}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={vendor.isActive ? "success" : "outline"} className="text-xs">
                          {vendor.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-nexabook-100">
                            <Eye className="h-4 w-4 text-nexabook-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-nexabook-100">
                            <Pencil className="h-4 w-4 text-nexabook-600" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vendor Dialog */}
      <AddVendorDialog open={dialogOpen} onOpenChange={setDialogOpen} onVendorCreated={loadVendors} />
    </div>
  );
}
