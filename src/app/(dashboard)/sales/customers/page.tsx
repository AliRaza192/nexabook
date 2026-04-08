"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Loader2,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Building2,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getCustomers,
  createCustomer,
  type CustomerFormData,
} from "@/lib/actions/sales";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  ntn: string | null;
  strn: string | null;
  balance: string | null;
  creditLimit: string | null;
  isActive: boolean;
  createdAt: Date;
}

// New Customer Form Component
function NewCustomerForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: CustomerFormData) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    ntn: "",
    strn: "",
    openingBalance: "0",
    creditLimit: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter customer name"
            required
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Email</label>
          <Input
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="customer@example.com"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Phone</label>
          <Input
            value={formData.phone || ""}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+92-XXX-XXXXXXX"
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">City</label>
          <Input
            value={formData.city || ""}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="e.g., Karachi"
          />
        </div>

        {/* NTN */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">NTN</label>
          <Input
            value={formData.ntn || ""}
            onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
            placeholder="National Tax Number"
          />
        </div>

        {/* STRN */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">STRN</label>
          <Input
            value={formData.strn || ""}
            onChange={(e) => setFormData({ ...formData, strn: e.target.value })}
            placeholder="Sales Tax Registration Number"
          />
        </div>

        {/* Opening Balance */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Opening Balance</label>
          <Input
            type="number"
            step="0.01"
            value={formData.openingBalance || "0"}
            onChange={(e) =>
              setFormData({ ...formData, openingBalance: e.target.value })
            }
            placeholder="0.00"
          />
        </div>

        {/* Credit Limit */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Credit Limit</label>
          <Input
            type="number"
            step="0.01"
            value={formData.creditLimit || ""}
            onChange={(e) =>
              setFormData({ ...formData, creditLimit: e.target.value })
            }
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-nexabook-900">Address</label>
        <textarea
          value={formData.address || ""}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Full address"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-nexabook-500"
        />
      </div>

      {/* Submit Button */}
      <DialogFooter>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Customer...
            </>
          ) : (
            "Create Customer"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Main Customers Page
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load customers
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const result = await getCustomers(searchQuery);
      if (result.success && result.data) {
        setCustomers(result.data as Customer[]);
      }
    } catch (error) {
      console.error("Failed to load customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  // Handle create customer
  const handleCreateCustomer = async (data: CustomerFormData) => {
    setSubmitting(true);
    try {
      const result = await createCustomer(data);
      if (result.success) {
        setDialogOpen(false);
        await loadCustomers();
      } else {
        alert(result.error || "Failed to create customer");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (value: string | null) => {
    if (!value) return "Rs. 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  if (loading && !customers.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-nexabook-900">Customer Management</h1>
          <p className="text-nexabook-600 mt-1">
            Manage your customers, view balances, and track tax details.
          </p>
        </div>

        {/* New Customer Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-nexabook-900 hover:bg-nexabook-800">
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Fill in the customer details below. All fields except name are optional.
              </DialogDescription>
            </DialogHeader>
            <NewCustomerForm
              onSubmit={handleCreateCustomer}
              loading={submitting}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
            <Input
              type="search"
              placeholder="Search by name, email, phone, or NTN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">
            Customers ({customers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No customers found
              </h3>
              <p className="text-nexabook-600 mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Get started by adding your first customer"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Tax Details
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Balance
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-nexabook-900 text-sm">
                              {customer.name}
                            </p>
                            {customer.city && (
                              <div className="flex items-center gap-1 text-xs text-nexabook-500">
                                <MapPin className="h-3 w-3" />
                                {customer.city}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-nexabook-600">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-nexabook-600">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{customer.phone}</span>
                            </div>
                          )}
                          {!customer.email && !customer.phone && (
                            <span className="text-xs text-nexabook-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm space-y-1">
                          {customer.ntn && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-nexabook-500" />
                              <Badge variant="outline" className="text-xs">
                                NTN: {customer.ntn}
                              </Badge>
                            </div>
                          )}
                          {customer.strn && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-nexabook-500" />
                              <Badge variant="outline" className="text-xs">
                                STRN: {customer.strn}
                              </Badge>
                            </div>
                          )}
                          {!customer.ntn && !customer.strn && (
                            <span className="text-xs text-nexabook-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p
                            className={`font-semibold ${
                              customer.balance && parseFloat(customer.balance) > 0
                                ? "text-orange-600"
                                : "text-nexabook-900"
                            }`}
                          >
                            {formatCurrency(customer.balance)}
                          </p>
                          {customer.creditLimit && (
                            <p className="text-xs text-nexabook-500">
                              Limit: {formatCurrency(customer.creditLimit)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={customer.isActive ? "success" : "destructive"}
                          className="text-xs"
                        >
                          {customer.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
