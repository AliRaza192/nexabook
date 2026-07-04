"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  MapPin,
  Globe,
  Mail,
  Phone,
  BadgeCheck,
  Loader2,
  Search,
  Building2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSalesTeam, updateSalesTeamMember } from "@/lib/actions/sales";

interface TeamMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  department: string | null;
  designation: string | null;
  territory: string | null;
  region: string | null;
  isActive: boolean;
}

export default function SalesTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ territory: string; region: string }>({
    territory: "",
    region: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    setLoading(true);
    const res = await getSalesTeam();
    if (res.success && res.data) {
      setMembers(res.data as TeamMember[]);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to load team" });
    }
    setLoading(false);
  };

  const startEditing = (member: TeamMember) => {
    setEditingId(member.id);
    setEditData({
      territory: member.territory || "",
      region: member.region || "",
    });
  };

  const handleSave = async (memberId: string) => {
    setSaving(true);
    const res = await updateSalesTeamMember(memberId, editData);
    if (res.success) {
      setMessage({ type: "success", text: "Team member updated" });
      setEditingId(null);
      loadTeam();
    } else {
      setMessage({ type: "error", text: res.error || "Failed to update" });
    }
    setSaving(false);
  };

  const filteredMembers = members.filter((m) =>
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.territory || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.region || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: "bg-red-100 text-red-700",
      manager: "bg-blue-100 text-blue-700",
      staff: "bg-gray-100 text-gray-700",
      accountant: "bg-green-100 text-green-700",
    };
    return variants[role] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-nexabook-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-nexabook-900">Sales Team</h1>
            <p className="text-nexabook-600 mt-1">
              Manage territories and regions for your sales team
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team..."
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>

        {/* Notification */}
        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No team members found
              </h3>
              <p className="text-nexabook-600">
                {searchQuery ? "Try adjusting your search" : "Invite team members from Settings → Team"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-nexabook-600 to-nexabook-800 flex items-center justify-center text-white font-bold text-lg">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {member.fullName}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-0.5">
                            <Badge className={roleBadge(member.role)}>
                              {member.role}
                            </Badge>
                            {member.designation && (
                              <span className="text-xs">{member.designation}</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      {member.isActive && (
                        <BadgeCheck className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Contact */}
                    <div className="space-y-1 text-sm">
                      {member.email && (
                        <div className="flex items-center gap-2 text-nexabook-600">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2 text-nexabook-600">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.department && (
                        <div className="flex items-center gap-2 text-nexabook-600">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{member.department}</span>
                        </div>
                      )}
                    </div>

                    {/* Division line */}
                    <div className="border-t pt-3" />

                    {/* Territory / Region */}
                    {editingId === member.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-nexabook-700 mb-1 block">
                            Territory
                          </label>
                          <Input
                            value={editData.territory}
                            onChange={(e) =>
                              setEditData({ ...editData, territory: e.target.value })
                            }
                            placeholder="e.g., North Zone"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-nexabook-700 mb-1 block">
                            Region
                          </label>
                          <Input
                            value={editData.region}
                            onChange={(e) =>
                              setEditData({ ...editData, region: e.target.value })
                            }
                            placeholder="e.g., Punjab"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(member.id)}
                            disabled={saving}
                            className="flex-1"
                          >
                            {saving ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className="bg-nexabook-100 rounded-lg p-3 cursor-pointer hover:bg-nexabook-200 transition-colors"
                          onClick={() => startEditing(member)}
                        >
                          <div className="flex items-center gap-1.5 text-xs text-nexabook-500 mb-1">
                            <Globe className="h-3 w-3" />
                            Territory
                          </div>
                          <p className="text-sm font-medium text-nexabook-900">
                            {member.territory || "—"}
                          </p>
                        </div>
                        <div
                          className="bg-nexabook-100 rounded-lg p-3 cursor-pointer hover:bg-nexabook-200 transition-colors"
                          onClick={() => startEditing(member)}
                        >
                          <div className="flex items-center gap-1.5 text-xs text-nexabook-500 mb-1">
                            <MapPin className="h-3 w-3" />
                            Region
                          </div>
                          <p className="text-sm font-medium text-nexabook-900">
                            {member.region || "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
