"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getOrgHierarchy,
  linkChildOrg,
  unlinkChildOrg,
  getAvailableOrgsForConsolidation,
} from "@/lib/actions/consolidation";
import { Building2, Link2, Unlink, Plus, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function ConsolidationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState<{
    current: any;
    root: any;
    children: any[];
  } | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [hierRes, availRes] = await Promise.all([
      getOrgHierarchy(),
      getAvailableOrgsForConsolidation(),
    ]);
    if (hierRes.success) setHierarchy(hierRes.data);
    else toast.error(hierRes.error);
    if (availRes.success) setAvailableOrgs(availRes.data);
    setLoading(false);
  }

  async function handleLink() {
    if (!selectedOrgId) return;
    setLinking(true);
    const res = await linkChildOrg(selectedOrgId);
    if (res.success) {
      toast.success(res.message);
      setLinkDialogOpen(false);
      setSelectedOrgId("");
      loadData();
    } else {
      toast.error(res.error);
    }
    setLinking(false);
  }

  async function handleUnlink(childOrgId: string) {
    const res = await unlinkChildOrg(childOrgId);
    if (res.success) {
      toast.success(res.message);
      loadData();
    } else {
      toast.error(res.error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Multi-Company Consolidation</h1>
          <p className="text-muted-foreground">
            Manage your company hierarchy for consolidated financial reporting
          </p>
        </div>
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Link Child Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Child Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {availableOrgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleLink} disabled={!selectedOrgId || linking} className="w-full">
                {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link Company
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {hierarchy && (
        <div className="space-y-4">
          {/* Root company */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{hierarchy.root.name}</CardTitle>
                <Badge variant="outline">Root Company</Badge>
              </div>
              <CardDescription>
                {hierarchy.root.currency} &middot; {hierarchy.root.city || "No city"}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Current company indicator */}
          {hierarchy.current.id !== hierarchy.root.id && (
            <div className="ml-8 pl-4 border-l-2 border-primary/30">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{hierarchy.current.name}</CardTitle>
                    <Badge>Current</Badge>
                  </div>
                  <CardDescription>
                    {hierarchy.current.currency} &middot; {hierarchy.current.city || "No city"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Child companies */}
          {hierarchy.children.length > 0 ? (
            <div className="ml-8 pl-4 border-l-2 border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Child Companies ({hierarchy.children.length})
              </h3>
              <div className="space-y-3">
                {hierarchy.children.map((child: any) => (
                  <Card key={child.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-base">{child.name}</CardTitle>
                          <Badge variant="secondary">{child.currency}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlink(child.id)}
                        >
                          <Unlink className="h-4 w-4 mr-1" />
                          Unlink
                        </Button>
                      </div>
                      <CardDescription>
                        {child.city || "No city"} &middot; {child.email || "No email"}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Link2 className="h-8 w-8 mx-auto mb-2" />
                <p>No child companies linked yet</p>
                <p className="text-sm">Link child companies to enable consolidated reporting</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
