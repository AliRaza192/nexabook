"use client";

import { useState } from "react";
import { Calendar, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportFilterBarProps {
  onFilterChange: (filters: ReportFilters) => void;
  showCategoryFilter?: boolean;
  showCustomerFilter?: boolean;
  showVendorFilter?: boolean;
  categories?: Array<{ id: string; name: string }>;
  customers?: Array<{ id: string; name: string }>;
  vendors?: Array<{ id: string; name: string }>;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  category?: string;
  customerId?: string;
  vendorId?: string;
}

export default function ReportFilterBar({
  onFilterChange,
  showCategoryFilter = false,
  showCustomerFilter = false,
  showVendorFilter = false,
  categories = [],
  customers = [],
  vendors = [],
}: ReportFilterBarProps) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [dateFrom, setDateFrom] = useState(
    startOfMonth.toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);
  const [category, setCategory] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [vendorId, setVendorId] = useState("all");

  const handleApplyFilters = () => {
    onFilterChange({
      dateFrom,
      dateTo,
      category: category === "all" ? undefined : category,
      customerId: customerId === "all" ? undefined : customerId,
      vendorId: vendorId === "all" ? undefined : vendorId,
    });
  };

  return (
    <Card className="enterprise-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-nexabook-600" />
          <span className="text-sm font-semibold text-nexabook-900">
            Report Filters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Date From */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-nexabook-700">
              From Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-nexabook-700">
              To Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>

          {/* Category Filter */}
          {showCategoryFilter && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Customer Filter */}
          {showCustomerFilter && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">
                Customer
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((cust) => (
                    <SelectItem key={cust.id} value={cust.id}>
                      {cust.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Vendor Filter */}
          {showVendorFilter && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">
                Vendor
              </Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="flex justify-end mt-3">
          <Button
            onClick={handleApplyFilters}
            className="bg-nexabook-900 hover:bg-nexabook-800 h-9"
          >
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
