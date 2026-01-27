"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Check,
  Edit,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
  Cog,
  Database,
  ShieldCheck,
  Sparkles,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { orgAPI, type OrgInvite, type OrgMembership, type OrgRole } from "@/lib/api/org-api";

type AppRole = OrgRole;

const ROLE_STORAGE_KEY = "cleanflowai.currentRole";

const normalizeRole = (value: string | null | undefined): AppRole => {
  if (value === "Admin") {
    return "Admin";
  }
  if (value === "Data Steward") {
    return "Data Steward";
  }
  return "Super Admin";
};

// ERP Options
const ERP_OPTIONS = [
  { value: "quickbooks", label: "QUICKBOOKS ONLINE" },
  { value: "oracle", label: "ORACLE FUSION" },
  { value: "sap", label: "SAP" },
  { value: "dynamics", label: "MICROSOFT DYNAMICS" },
  { value: "netsuite", label: "NETSUITE" },
  { value: "workday", label: "WORKDAY" },
  { value: "infor-m3", label: "INFOR M3" },
  { value: "infor-ln", label: "INFOR LN" },
  { value: "epicor", label: "EPICOR KINETIC" },
  { value: "qad", label: "QAD" },
  { value: "ifs", label: "IFS CLOUD" },
  { value: "sage", label: "SAGE INTACCT" },
  { value: "custom", label: "CUSTOM" },
];

// Initial organization settings
const INITIAL_ORG_SETTINGS = {
  name: "",
  email: "",
  phone: "",
  address: "",
  subscriptionPlan: "standard",
};

// Initial services settings
const INITIAL_SERVICES_SETTINGS = {
  defaultInputErp: "quickbooks",
  defaultExportErp: "quickbooks",
  customInputErpName: "",
  customExportErpName: "",
  dataTransformEnabled: true,
  dataQualityEnabled: true,
  cleanDataShieldEnabled: false,
  preferredFormat: "csv",
};

// Initial members data (loaded from backend)
const INITIAL_MEMBERS: Array<{
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: string;
  avatar: string;
  joinedAt?: string;
  lastLogin?: string;
}> = [];

// Initial permissions configuration
const INITIAL_PERMISSIONS = [
  {
    id: "files",
    name: "File Management",
    description: "Upload, download, and manage files",
    superadmin: true,
    admin: true,
    dataSteward: true,
  },
  {
    id: "transform",
    name: "Data Transformation",
    description: "Run and configure data transformations",
    superadmin: true,
    admin: true,
    dataSteward: true,
  },
  {
    id: "export",
    name: "Export Data",
    description: "Export transformed data to various formats",
    superadmin: true,
    admin: true,
    dataSteward: true,
  },
  {
    id: "members",
    name: "Manage Members",
    description: "Invite, remove, and manage team members",
    superadmin: true,
    admin: true,
    dataSteward: false,
  },
  {
    id: "billing",
    name: "Billing & Subscription",
    description: "View and manage billing information",
    superadmin: true,
    admin: false,
    dataSteward: false,
  },
  {
    id: "settings",
    name: "Organization Settings",
    description: "Modify organization details and preferences",
    superadmin: true,
    admin: true,
    dataSteward: false,
  },
  {
    id: "api",
    name: "API Access",
    description: "Generate and manage API keys",
    superadmin: true,
    admin: true,
    dataSteward: false,
  },
  {
    id: "audit",
    name: "Audit Logs",
    description: "View activity and audit logs",
    superadmin: true,
    admin: true,
    dataSteward: false,
  },
];

type PermissionRow = (typeof INITIAL_PERMISSIONS)[number];

const formatStatus = (status?: string) => {
  const value = (status || "").toUpperCase();
  if (value === "ACTIVE") return "Active";
  if (value === "PENDING") return "Pending";
  if (value === "INACTIVE") return "Inactive";
  return status || "Unknown";
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const deriveNameFromEmail = (email?: string, userId?: string) => {
  if (email && email.includes("@")) {
    return email.split("@")[0];
  }
  if (userId) {
    return userId.slice(0, 8);
  }
  return "Member";
};

const mergePermissionsFromServer = (
  permissionsByRole: Record<string, Record<string, boolean>> | undefined
): PermissionRow[] => {
  const superAdminPerms = permissionsByRole?.["Super Admin"] || {};
  const adminPerms = permissionsByRole?.["Admin"] || {};
  const dataStewardPerms = permissionsByRole?.["Data Steward"] || {};

  return INITIAL_PERMISSIONS.map((row) => ({
    ...row,
    superadmin:
      typeof superAdminPerms[row.id] === "boolean"
        ? superAdminPerms[row.id]
        : row.superadmin,
    admin:
      typeof adminPerms[row.id] === "boolean" ? adminPerms[row.id] : row.admin,
    dataSteward:
      typeof dataStewardPerms[row.id] === "boolean"
        ? dataStewardPerms[row.id]
        : row.dataSteward,
  }));
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "Super Admin":
      return "destructive";
    case "Admin":
      return "secondary";
    case "Data Steward":
      return "outline";
    default:
      return "outline";
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch ((status || "").toLowerCase()) {
    case "Active":
    case "active":
      return "default";
    case "Pending":
    case "pending":
      return "secondary";
    case "Inactive":
    case "inactive":
      return "outline";
    default:
      return "outline";
  }
};

export function OrganizationSettings() {
  const [activeTab, setActiveTab] = useState("organization");
  const { toast } = useToast();

  // Current user role (for RBAC in this demo UI)
  const [currentUserRole, setCurrentUserRole] = useState<AppRole>("Super Admin");
  useEffect(() => {
    try {
      const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
      setCurrentUserRole(normalizeRole(storedRole));
    } catch {
      setCurrentUserRole("Super Admin");
    }
  }, []);

  // Organization settings state
  const [orgSettings, setOrgSettings] = useState(INITIAL_ORG_SETTINGS);
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Members state
  const [members, setMembers] = useState(INITIAL_MEMBERS);

  // Permissions state
  const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Services settings state
  const [servicesSettings, setServicesSettings] = useState(
    INITIAL_SERVICES_SETTINGS
  );
  const [isSavingServices, setIsSavingServices] = useState(false);

  // Org context
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("Data Steward");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const mapMemberToRow = (member: OrgMembership) => {
    const email = member.email || "";
    return {
      id: member.user_id,
      name: deriveNameFromEmail(email, member.user_id),
      email,
      role: member.role,
      status: formatStatus(member.status),
      avatar: "",
      joinedAt: formatDateTime(member.created_at),
      lastLogin: formatDateTime(member.updated_at),
    };
  };

  const loadMembers = async () => {
    const response = await orgAPI.listMembers();
    const items = (response.members || []).map(mapMemberToRow);
    setMembers(items);
  };

  const loadInvites = async () => {
    try {
      const response = await orgAPI.listInvites();
      setInvites(response.invites || []);
    } catch (err) {
      console.error("Failed to load invites", err);
    }
  };

  const loadPermissions = async () => {
    const response = await orgAPI.listPermissions();
    setPermissions(mergePermissionsFromServer(response.permissions_by_role));
  };

  const reloadOrgData = async () => {
    const me = await orgAPI.getMe();

    const nextOrgId = me.organization?.org_id || null;
    const nextUserId = me.membership?.user_id || null;
    const nextRole = me.membership?.role || "Super Admin";

    setOrgId(nextOrgId);
    setCurrentUserId(nextUserId);
    setCurrentUserRole(nextRole);
    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    } catch {}

    setOrgSettings((prev) => ({
      ...prev,
      name: me.organization?.name || prev.name,
      email: me.organization?.email || prev.email,
      phone: me.organization?.phone || prev.phone,
      address: me.organization?.address || prev.address,
      subscriptionPlan:
        me.organization?.subscription_plan || prev.subscriptionPlan,
    }));
    setLogoDataUrl(
      me.organization?.logo_url || me.organization?.logo_data_url || ""
    );

    await Promise.all([loadMembers(), loadInvites(), loadPermissions()]);
    return me;
  };

  useEffect(() => {
    let isMounted = true;
    const loadOrgData = async () => {
      setIsLoadingOrg(true);
      try {
        const me = await reloadOrgData();
        if (!isMounted) return;
      } catch (err: any) {
        console.error("Failed to load org context", err);
        const message = err?.message || "Could not load organization data.";
        const missingMembership = message.includes(
          "Organization membership required"
        );
        toast({
          title: "Organization not ready",
          description:
            missingMembership
              ? "You are not in an organization yet. Register your organization first."
              : message,
        });
        if (missingMembership) {
          window.location.href = "/create-organization";
        }
      } finally {
        if (isMounted) setIsLoadingOrg(false);
      }
    };

    loadOrgData();
    return () => {
      isMounted = false;
    };
    // We intentionally run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canManageOrganization = currentUserRole === "Super Admin";
  const canInviteMembers = currentUserRole === "Super Admin" || currentUserRole === "Admin";
  const canChangeAllRoles = currentUserRole === "Super Admin";
  const canManageDataStewards = currentUserRole === "Admin";
  const allowedInviteRoles: AppRole[] = canChangeAllRoles
    ? ["Admin", "Data Steward"]
    : ["Data Steward"];

  const inviteHelpText = useMemo(() => {
    if (currentUserRole === "Super Admin") {
      return "You can invite Admins and Data Stewards.";
    }
    if (currentUserRole === "Admin") {
      return "You can invite Data Stewards only.";
    }
    return "Only Super Admins and Admins can invite members.";
  }, [currentUserRole]);

  // Handle organization settings change
  const handleOrgChange = (field: string, value: string) => {
    setOrgSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Save organization settings
  const handleSaveOrg = async () => {
    if (!canManageOrganization) {
      toast({
        title: "Super Admin Only",
        description: "Only the Super Admin can register or update organization settings.",
      });
      return;
    }
    const name = orgSettings.name.trim();
    const email = orgSettings.email.trim();
    const phone = orgSettings.phone.trim();
    const address = orgSettings.address.trim();

    if (!name || !email || !phone || !address) {
      toast({
        title: "Organization details required",
        description:
          "Enter organization name, email, contact number, and address before registering.",
      });
      return;
    }

    setIsSavingOrg(true);
    try {
      await orgAPI.registerOrg({
        name,
        email,
        phone,
        address,
        subscriptionPlan: orgSettings.subscriptionPlan,
      });
      await reloadOrgData();
      toast({
        title: orgId ? "Organization updated" : "Organization registered",
        description: orgId
          ? "Your organization details were updated successfully."
          : "Your organization details were saved and you are the Super Admin.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err?.message || "Could not register the organization.",
      });
    } finally {
      setIsSavingOrg(false);
    }
  };

  // Toggle permission
  const togglePermission = (
    permissionId: string,
    role: "superadmin" | "admin" | "dataSteward"
  ) => {
    // RBAC: Super Admin can change all permissions. Admin can change Data Steward permissions only.
    const isAllowed =
      canChangeAllRoles || (canManageDataStewards && role === "dataSteward");

    if (!isAllowed) {
      toast({
        title: "Not allowed",
        description:
          "Only the Super Admin can change Admin permissions. Admins can change Data Steward permissions.",
      });
      return;
    }

    setPermissions((prev) =>
      prev.map((p) => (p.id === permissionId ? { ...p, [role]: !p[role] } : p))
    );
  };

  // Save permissions
  const handleSavePermissions = async () => {
    if (!canChangeAllRoles && !canManageDataStewards) {
      toast({
        title: "Not allowed",
        description: "Only Super Admins and Admins can save permission changes.",
      });
      return;
    }
    setIsSavingPermissions(true);
    try {
      const buildRolePermissions = (key: "admin" | "dataSteward") =>
        Object.fromEntries(permissions.map((p) => [p.id, Boolean(p[key])]));

      if (canChangeAllRoles) {
        await orgAPI.updateRolePermissions("Admin", buildRolePermissions("admin"));
      }
      // Both Super Admins and Admins can update Data Steward permissions.
      await orgAPI.updateRolePermissions(
        "Data Steward",
        buildRolePermissions("dataSteward")
      );

      await reloadOrgData();
      toast({
        title: "Permissions saved",
        description: "Role permissions have been updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save permissions",
        description: err?.message || "Could not update role permissions.",
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Update member role
  const updateMemberRole = async (memberId: string, newRole: AppRole) => {
    if (currentUserId && memberId === currentUserId) {
      toast({
        title: "Not allowed",
        description: "You cannot change your own role here.",
      });
      return;
    }

    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) {
      return;
    }

    const targetRole = targetMember.role;

    // RBAC:
    // - Super Admin can change any non-owner role.
    // - Admin can only manage Data Stewards and cannot promote to Admin/Super Admin.
    if (!canChangeAllRoles) {
      const canAdminManageThisMember =
        canManageDataStewards && targetRole === "Data Steward";

      if (!canAdminManageThisMember) {
        toast({
          title: "Not allowed",
          description: "Admins can only manage Data Stewards.",
        });
        return;
      }

      if (newRole !== "Data Steward") {
        toast({
          title: "Not allowed",
          description: "Only the Super Admin can assign Admin or Super Admin roles.",
        });
        return;
      }
    }

    try {
      await orgAPI.updateMemberRole(memberId, newRole);
      await reloadOrgData();
      toast({
        title: "Role updated",
        description: "Member role has been updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to update role",
        description: err?.message || "Could not update the member role.",
      });
    }
  };

  // Remove member
  const removeMember = (memberId: string) => {
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) {
      return;
    }

    if (!canChangeAllRoles) {
      const canAdminRemove =
        canManageDataStewards && targetMember.role === "Data Steward";
      if (!canAdminRemove) {
        toast({
          title: "Not allowed",
          description: "Admins can only remove Data Stewards.",
        });
          return;
      }
    }

    toast({
      title: "Not implemented",
      description:
        "Member removal is not implemented in the backend yet. Use role changes instead.",
    });
  };

  const handleInviteMember = () => {
    if (!canInviteMembers) {
      toast({
        title: "Not allowed",
        description: "Only Super Admins and Admins can invite members.",
      });
      return;
    }
    setInviteEmail("");
    setInviteRole(allowedInviteRoles[allowedInviteRoles.length - 1]);
    setIsInviteDialogOpen(true);
  };

  const handleSubmitInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter a valid email address to send the invite.",
      });
      return;
    }
    if (!allowedInviteRoles.includes(inviteRole)) {
      toast({
        title: "Invalid role",
        description: `Allowed roles: ${allowedInviteRoles.join(", ")}`,
      });
      return;
    }

    setIsSendingInvite(true);
    try {
      const result = await orgAPI.createInvite(email, inviteRole);
      await loadInvites();
      toast({
        title: "Invite created",
        description:
          result?.email_sent === false
            ? "Invite saved, but email was not sent. Check SES setup."
            : `${email} invited as ${inviteRole}.`,
      });
      setIsInviteDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Failed to invite",
        description: err?.message || "Could not create invite.",
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleLogoUploadClick = () => {
    if (!canManageOrganization) {
      toast({
        title: "Super Admin Only",
        description: "Only the Super Admin can update the organization logo.",
      });
      return;
    }
    logoInputRef.current?.click();
  };

  const handleLogoSelected = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = String(reader.result || "");
      if (!result.startsWith("data:image/")) {
        toast({
          title: "Invalid file",
          description: "Please choose an image file.",
        });
        return;
      }
      try {
        const response = await orgAPI.uploadLogo(result);
        setLogoDataUrl(response?.logo_url || result);
        toast({
          title: "Logo updated",
          description: "Your organization logo was saved.",
        });
      } catch (err: any) {
        toast({
          title: "Logo upload failed",
          description: err?.message || "Could not upload the logo.",
        });
      } finally {
        if (logoInputRef.current) {
          logoInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      toast({
        title: "Logo upload failed",
        description: "Could not read the selected file.",
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle services settings change
  const handleServicesChange = (field: string, value: string | boolean) => {
    setServicesSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Save services settings
  const handleSaveServices = async () => {
    setIsSavingServices(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSavingServices(false);
    toast({
      title: "Services saved",
      description: "Service settings have been updated successfully.",
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={isSendingInvite}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as AppRole)}
                disabled={isSendingInvite}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {allowedInviteRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              disabled={isSendingInvite}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitInvite} disabled={isSendingInvite}>
              {isSendingInvite ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Centered Tabs Header */}
      <div className="flex justify-center pt-2 pb-4 overflow-x-auto">
        <TabsList className="inline-flex h-10 sm:h-12 items-center justify-center rounded-xl bg-muted p-1 sm:p-1.5 gap-1">
          <TabsTrigger
            value="organization"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 sm:px-6 py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Organization</span>
            <span className="sm:hidden">Org</span>
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 sm:px-6 py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Users className="w-4 h-4" />
            <span>Members</span>
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 sm:px-6 py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Permissions</span>
            <span className="sm:hidden">Perms</span>
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 sm:px-6 py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Cog className="w-4 h-4" />
            <span>Services</span>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Organization Settings Tab */}
      <TabsContent value="organization" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Manage your organization's basic information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-muted-foreground/30 overflow-hidden">
                {logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoDataUrl}
                    alt="Organization logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Organization Logo</h4>
                <p className="text-sm text-muted-foreground">
                  Upload a logo for your organization
                </p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoSelected(e.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogoUploadClick}
                  disabled={!canManageOrganization}
                >
                  Upload Logo
                </Button>
              </div>
            </div>

            <Separator />

            {/* Organization Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Infiniqon"
                  value={orgSettings.name}
                  onChange={(e) => handleOrgChange("name", e.target.value)}
                  disabled={!canManageOrganization}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="org-email"
                    className="pl-10"
                    placeholder="contact@infiniqon.com"
                    value={orgSettings.email}
                    onChange={(e) => handleOrgChange("email", e.target.value)}
                    disabled={!canManageOrganization}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-phone">Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="org-phone"
                    className="pl-10"
                    placeholder="+91 63 4567 8900"
                    value={orgSettings.phone}
                    onChange={(e) => handleOrgChange("phone", e.target.value)}
                    disabled={!canManageOrganization}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="org-address"
                    className="pl-10"
                    placeholder="Ekkaduthangal, Chennai, Tamil Nadu"
                    value={orgSettings.address}
                    onChange={(e) => handleOrgChange("address", e.target.value)}
                    disabled={!canManageOrganization}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Subscription Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={orgSettings.subscriptionPlan}
                  onValueChange={(value) =>
                    handleOrgChange("subscriptionPlan", value)
                  }
                  disabled={!canManageOrganization}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSaveOrg} disabled={isSavingOrg || !canManageOrganization}>
                {isSavingOrg && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isSavingOrg ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Members Tab */}
      <TabsContent value="members" className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage your team members and their roles
              </CardDescription>
            </div>
            <Button
              className="flex items-center gap-2"
              onClick={handleInviteMember}
              disabled={!canInviteMembers}
              title={inviteHelpText}
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingOrg && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      Loading members...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoadingOrg && members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No members yet. Use “Invite Member” to add your team.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoadingOrg &&
                  members.map((member) => {
                    const isSelf = Boolean(currentUserId && member.id === currentUserId);
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {member.name}
                                {isSelf && (
                                  <Badge variant="outline" className="text-xs">
                                    You
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(member.status)}
                            className={
                              member.status === "Active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                : ""
                            }
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.joinedAt || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {member.lastLogin || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isSelf}
                                title={isSelf ? "You cannot change your own role here." : undefined}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <>
                                {canChangeAllRoles && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMemberRole(member.id, "Super Admin")
                                      }
                                    >
                                      Make Super Admin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMemberRole(member.id, "Admin")
                                      }
                                    >
                                      Make Admin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMemberRole(member.id, "Data Steward")
                                      }
                                    >
                                      Make Data Steward
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canManageDataStewards &&
                                  member.role === "Data Steward" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateMemberRole(member.id, "Data Steward")
                                      }
                                    >
                                      Keep Data Steward
                                    </DropdownMenuItem>
                                  )}
                                {!canChangeAllRoles &&
                                  !(canManageDataStewards && member.role === "Data Steward") && (
                                    <DropdownMenuItem disabled>
                                      Only Super Admin can change this role
                                    </DropdownMenuItem>
                                  )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => removeMember(member.id)}
                                  disabled={
                                    isSelf ||
                                    (!canChangeAllRoles &&
                                      !(canManageDataStewards && member.role === "Data Steward"))
                                  }
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Permissions Tab */}
      <TabsContent value="permissions" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Role Permissions
            </CardTitle>
            <CardDescription>
              Configure what each role can access and do within the
              organization. Click to toggle permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Permission</TableHead>
                  {/* <TableHead className="text-center">Owner</TableHead> */}
                  <TableHead className="text-center">Super Admin</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead className="text-center">Data Stewards</TableHead>
                  {/* <TableHead className="text-center">Viewer</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{permission.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </TableCell>
                    {/* <TableCell className="text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center cursor-not-allowed opacity-70">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                    </TableCell> */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            togglePermission(permission.id, "superadmin")
                          }
                          disabled
                          title="Super Admin permissions are fixed"
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {permission.superadmin ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <X className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            togglePermission(permission.id, "admin")
                          }
                          disabled={!canChangeAllRoles}
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-80"
                        >
                          {permission.admin ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <X className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            togglePermission(permission.id, "dataSteward")
                          }
                          disabled={!canChangeAllRoles && !canManageDataStewards}
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-80"
                        >
                          {permission.dataSteward ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <X className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-6" />

            <div className="flex justify-end">
              <Button
                onClick={handleSavePermissions}
                disabled={isSavingPermissions || (!canChangeAllRoles && !canManageDataStewards)}
              >
                {isSavingPermissions && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isSavingPermissions ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Services Tab */}
      <TabsContent value="services" className="space-y-6">
        {/* ERP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Configure default input and export systems for your data
              processing workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Default Input ERP */}
              <div className="space-y-3">
                <Label>Import</Label>
                <p className="text-sm text-muted-foreground">
                  Select the default source for data imports
                </p>
                <Select
                  value={servicesSettings.defaultInputErp}
                  onValueChange={(value) =>
                    handleServicesChange("defaultInputErp", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select input ERP" />
                  </SelectTrigger>
                  <SelectContent>
                    {ERP_OPTIONS.map((erp) => (
                      <SelectItem key={erp.value} value={erp.value}>
                        {erp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {servicesSettings.defaultInputErp === "custom" && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                    <Input
                      placeholder="Enter custom ERP name"
                      value={servicesSettings.customInputErpName}
                      onChange={(e) =>
                        handleServicesChange(
                          "customInputErpName",
                          e.target.value
                        )
                      }
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" className="shrink-0">
                      <Plus className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {/* Default Export ERP */}
              <div className="space-y-3">
                <Label>Export</Label>
                <p className="text-sm text-muted-foreground">
                  Select the default source for data exports
                </p>
                <Select
                  value={servicesSettings.defaultExportErp}
                  onValueChange={(value) =>
                    handleServicesChange("defaultExportErp", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select export ERP" />
                  </SelectTrigger>
                  <SelectContent>
                    {ERP_OPTIONS.map((erp) => (
                      <SelectItem key={erp.value} value={erp.value}>
                        {erp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {servicesSettings.defaultExportErp === "custom" && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                    <Input
                      placeholder="Enter custom ERP name"
                      value={servicesSettings.customExportErpName}
                      onChange={(e) =>
                        handleServicesChange(
                          "customExportErpName",
                          e.target.value
                        )
                      }
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" className="shrink-0">
                      <Plus className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {/* Data Format */}
              <div className="space-y-3">
                <Label>Data Format</Label>
                <p className="text-sm text-muted-foreground">
                  Select the preferred data format
                </p>
                <Select
                  value={servicesSettings.preferredFormat}
                  onValueChange={(value) =>
                    handleServicesChange("preferredFormat", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="sql">SQL</SelectItem>
                    <SelectItem value="parquet">Parquet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="w-5 h-5" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Data Transform */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-sm sm:text-base">
                    Data Transform
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Transform and normalize data between different ERP formats
                  </p>
                </div>
              </div>
              <Switch
                checked={servicesSettings.dataTransformEnabled}
                onCheckedChange={(checked) =>
                  handleServicesChange("dataTransformEnabled", checked)
                }
                className="shrink-0"
              />
            </div>

            {/* Data Quality */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg shrink-0">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-sm sm:text-base">
                    Data Quality
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Validate, clean, and fix data quality issues automatically
                  </p>
                </div>
              </div>
              <Switch
                checked={servicesSettings.dataQualityEnabled}
                onCheckedChange={(checked) =>
                  handleServicesChange("dataQualityEnabled", checked)
                }
                className="shrink-0"
              />
            </div>

            {/* CleanDataShield */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg shrink-0">
                  <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm sm:text-base">
                      CleanDataShield™
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      Premium
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Distributed Proxy & Privacy Layer — Work with AI without
                    giving away your data
                  </p>
                </div>
              </div>
              <Switch
                checked={servicesSettings.cleanDataShieldEnabled}
                onCheckedChange={(checked) =>
                  handleServicesChange("cleanDataShieldEnabled", checked)
                }
                className="shrink-0"
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSaveServices} disabled={isSavingServices}>
                {isSavingServices && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isSavingServices ? "Saving..." : "Save Services"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
