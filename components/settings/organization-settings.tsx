"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { PermissionWrapper } from "@/components/auth/permission-wrapper";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Check,
  ChevronDown,
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
  UserCog,
  UserMinus,
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  orgAPI,
  type OrgInvite,
  type OrgMembership,
  type OrgRole,
} from "@/lib/api/org-api";
import {
  fileManagementAPI,
  type SettingsPreset,
} from "@/lib/api/file-management-api";

type AppRole = OrgRole;

const VALID_ROLES = ["Super Admin", "Admin", "Data Steward"];

// ERP Options
const ERP_OPTIONS = [
  { value: "quickbooks", label: "QUICKBOOKS ONLINE" },
  { value: "zoho-books", label: "ZOHO BOOKS" },
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
  industry: "",
  gst: "",
  pan: "",
  contact_person: "",
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
    id: "members_view",
    name: "View Members",
    description: "View team members and pending invitations",
    superadmin: true,
    admin: true,
    dataSteward: true,
  },
  {
    id: "members_manage",
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
  permissionsByRole: Record<string, Record<string, boolean>> | undefined,
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
  const { logout, userRole: authUserRole, refreshPermissions } = useAuth();
  const currentUserRole = (authUserRole as AppRole) || "Data Steward";
  const [canViewMembersPermission, setCanViewMembersPermission] = useState(false);
  const [canManageMembersPermission, setCanManageMembersPermission] = useState(false);
  const [canManageSettingsPermission, setCanManageSettingsPermission] = useState(false);

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
    INITIAL_SERVICES_SETTINGS,
  );
  const [isSavingServices, setIsSavingServices] = useState(false);
  const [settingsPresets, setSettingsPresets] = useState<SettingsPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetDialogMode, setPresetDialogMode] =
    useState<"create" | "edit">("create");
  const [presetFormName, setPresetFormName] = useState("");
  const [presetFormConfig, setPresetFormConfig] = useState("{\n\n}");
  const [presetFormDefault, setPresetFormDefault] = useState(false);
  const [presetEditing, setPresetEditing] = useState<SettingsPreset | null>(
    null,
  );
  const [presetToDelete, setPresetToDelete] = useState<SettingsPreset | null>(
    null,
  );
  const [isDeletePresetOpen, setIsDeletePresetOpen] = useState(false);

  // Org context
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [, setMembersLoadError] = useState<string | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("Data Steward");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [showPendingInvites, setShowPendingInvites] = useState(false);
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
    setMembersLoadError(null);
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
    try {
      const me = await orgAPI.getMe();

      const nextOrgId = me.organization?.org_id || null;
      const nextUserId = me.membership?.user_id || null;
      const nextCanViewMembers =
        me?.role_permissions?.members_view === true ||
        me?.role_permissions?.members === true;
      const nextCanManageMembers =
        me?.role_permissions?.members_manage === true ||
        me?.role_permissions?.members === true;
      const nextCanManageSettings = me?.role_permissions?.settings === true;

      setOrgId(nextOrgId);
      setCurrentUserId(nextUserId);
      setCanViewMembersPermission(nextCanViewMembers);
      setCanManageMembersPermission(nextCanManageMembers);
      setCanManageSettingsPermission(nextCanManageSettings);
      setPermissions(mergePermissionsFromServer(me?.permissions_by_role));
      setMembersLoadError(null);

      setOrgSettings((prev) => ({
        ...prev,
        name: me.organization?.name || prev.name,
        email: me.organization?.email || prev.email,
        phone: me.organization?.phone || prev.phone,
        address: me.organization?.address || prev.address,
        industry: me.organization?.industry || prev.industry,
        gst: me.organization?.gst || prev.gst,
        pan: me.organization?.pan || prev.pan,
        contact_person: me.organization?.contact_person || prev.contact_person,
        subscriptionPlan:
          me.organization?.subscription_plan || prev.subscriptionPlan,
      }));
      setLogoDataUrl(
        me.organization?.logo_url || me.organization?.logo_data_url || "",
      );

      await Promise.all([
        nextCanViewMembers
          ? loadMembers().catch((e) => {
              console.warn("Could not load members:", e.message);
              setMembers([]);
              setMembersLoadError(e?.message || "Could not load members.");
            })
          : Promise.resolve().then(() => {
              setMembers([]);
              setInvites([]);
            }),
        // Load invites only if caller has explicit members permission.
        nextCanViewMembers
          ? loadInvites().catch((e) => console.warn("Could not load invites:", e.message))
          : Promise.resolve(),
        // If settings permission is denied, rely on /org/me snapshot above.
        nextCanManageSettings
          ? loadPermissions().catch((e) => console.warn("Could not load permissions:", e.message))
          : Promise.resolve(),
      ]);
      return me;
    } catch (err: any) {
      const message = err?.message || "";
      if (message.includes("Organization membership required")) {
        window.location.href = "/create-organization";
        return;
      }
      console.error("Failed to reload data", err);
      throw err;
    }
  };

  const loadSettingsPresets = async () => {
    setIsLoadingPresets(true);
    try {
      const response = await fileManagementAPI.getSettingsPresets();
      setSettingsPresets(response.presets || []);
    } catch (err) {
      console.error("Failed to load presets", err);
      toast({
        title: "Failed to load presets",
        description: "Could not load global settings presets.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const openCreatePresetDialog = () => {
    setPresetDialogMode("create");
    setPresetFormName("");
    setPresetFormConfig("{\n\n}");
    setPresetFormDefault(false);
    setPresetEditing(null);
    setIsPresetDialogOpen(true);
  };

  const openEditPresetDialog = (preset: SettingsPreset) => {
    setPresetDialogMode("edit");
    setPresetFormName(preset.preset_name || "");
    setPresetFormConfig(JSON.stringify(preset.config || {}, null, 2));
    setPresetFormDefault(Boolean(preset.is_default));
    setPresetEditing(preset);
    setIsPresetDialogOpen(true);
  };

  const handleSavePreset = async () => {
    if (!presetFormName.trim()) {
      toast({
        title: "Preset name required",
        description: "Please enter a preset name.",
        variant: "destructive",
      });
      return;
    }

    let parsedConfig: any = {};
    try {
      parsedConfig = presetFormConfig.trim()
        ? JSON.parse(presetFormConfig)
        : {};
    } catch (err) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON for the preset config.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPreset(true);
    try {
      if (presetDialogMode === "create") {
        await fileManagementAPI.createSettingsPreset({
          preset_name: presetFormName.trim(),
          config: parsedConfig,
          is_default: presetFormDefault,
        });
      } else if (presetEditing) {
        await fileManagementAPI.updateSettingsPreset(presetEditing.preset_id, {
          preset_name: presetFormName.trim(),
          config: parsedConfig,
          is_default: presetFormDefault,
        });
      }

      await loadSettingsPresets();
      setIsPresetDialogOpen(false);
      toast({
        title: "Preset saved",
        description:
          presetDialogMode === "create"
            ? "Preset created successfully."
            : "Preset updated successfully.",
      });
    } catch (err) {
      console.error("Failed to save preset", err);
      toast({
        title: "Save failed",
        description: "Could not save the preset.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!presetToDelete) return;

    setIsSavingPreset(true);
    try {
      await fileManagementAPI.deleteSettingsPreset(presetToDelete.preset_id);
      await loadSettingsPresets();
      toast({
        title: "Preset deleted",
        description: "Preset removed successfully.",
      });
      setIsDeletePresetOpen(false);
      setPresetToDelete(null);
    } catch (err) {
      console.error("Failed to delete preset", err);
      toast({
        title: "Delete failed",
        description: "Could not delete the preset.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleSetDefaultPreset = async (preset: SettingsPreset) => {
    setIsSavingPreset(true);
    try {
      await fileManagementAPI.updateSettingsPreset(preset.preset_id, {
        is_default: true,
      });
      await loadSettingsPresets();
      toast({
        title: "Default updated",
        description: `"${preset.preset_name}" is now the default preset.`,
      });
    } catch (err) {
      console.error("Failed to set default preset", err);
      toast({
        title: "Update failed",
        description: "Could not set default preset.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreset(false);
    }
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
          "Organization membership required",
        );
        toast({
          title: "Organization not ready",
          description: missingMembership
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

  useEffect(() => {
    if (activeTab === "services") {
      loadSettingsPresets();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!orgId) return;
    // Keep RBAC and member/invite state in sync when switching tabs.
    reloadOrgData().catch((err) =>
      console.warn("Could not refresh org data on tab switch:", err?.message || err),
    );
    // Intentionally driven by tab transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const allowedInviteRoles: AppRole[] = useMemo(() => {
    if (!canManageMembersPermission) {
      return [];
    }
    if (currentUserRole === "Super Admin") {
      return ["Super Admin", "Admin", "Data Steward"];
    }
    if (currentUserRole === "Admin") {
      return ["Admin", "Data Steward"];
    }
    if (currentUserRole === "Data Steward") {
      return ["Data Steward"];
    }
    return [];
  }, [currentUserRole, canManageMembersPermission]);

  // Combine members and invites for the unified table
  const allMembers = useMemo(() => {
    const activeMembers = members.map((m) => ({
      ...m,
      isInvite: false,
      displayId: m.id,
      displayName: m.name,
      displayEmail: m.email,
      displayStatus: m.status,
      displayRole: m.role,
      displayJoined: m.joinedAt || "-",
      displayLastLogin: m.lastLogin || "-",
      displayAvatar: m.avatar,
    }));

    // Deduplicate: Don't show an invite if the email is already in the active members list
    const activeEmails = new Set(members.map((m) => (m.email || "").toLowerCase()));

    // Also deduplicate between invites themselves (latest one wins)
    const uniqueInvitesMap = new Map<string, OrgInvite>();
    invites.forEach(inv => {
      const email = (inv.email || "").toLowerCase();
      if (!activeEmails.has(email)) {
        // Only keep the most recent invite for this email if multiple exist
        const existing = uniqueInvitesMap.get(email);
        if (!existing || (inv.created_at || "") > (existing.created_at || "")) {
          uniqueInvitesMap.set(email, inv);
        }
      }
    });

    const pendingInvites = Array.from(uniqueInvitesMap.values()).map((i) => ({
      id: i.invite_id,
      isInvite: true,
      displayId: i.invite_id,
      displayName: i.email.split("@")[0], // Placeholder name from email
      displayEmail: i.email,
      displayStatus: "Pending",
      displayRole: i.role,
      displayJoined: formatDateTime(i.created_at),
      displayLastLogin: "-",
      displayAvatar: "",
    }));

    return [...activeMembers, ...pendingInvites].sort((a, b) => {
      // Sort by Status (Active first)
      if (a.displayStatus === "Active" && b.displayStatus !== "Active") return -1;
      if (a.displayStatus !== "Active" && b.displayStatus === "Active") return 1;

      // Secondary sort by Name
      return a.displayName.localeCompare(b.displayName);
    });
  }, [members, invites]);

  const canManageOrganization = canManageSettingsPermission;
  const canInviteMembers = allowedInviteRoles.length > 0;
  const canChangeAllRoles = currentUserRole === "Super Admin";
  const canManageDataStewards = currentUserRole === "Admin";

  const inviteHelpText = useMemo(() => {
    if (!canManageMembersPermission) {
      return "You do not have permission to manage invitations.";
    }
    if (currentUserRole === "Super Admin") {
      return "You can invite anyone to any role.";
    }
    if (currentUserRole === "Admin") {
      return "You can invite Admins and Data Stewards.";
    }
    if (currentUserRole === "Data Steward") {
      return "You can invite other Data Stewards.";
    }
    return "Only Super Admins and Admins can manage team invitations.";
  }, [currentUserRole, canManageMembersPermission]);

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    if (!canManageMembersPermission) {
      toast({
        title: "Not allowed",
        description: "You do not have permission to manage invitations.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Revoke invitation for ${email}?`)) return;

    setRevokingInviteId(inviteId);
    try {
      await orgAPI.revokeInvite(inviteId);
      await loadInvites();
      toast({
        title: "Invite revoked",
        description: `Invitation for ${email} has been cancelled.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to revoke",
        description: err?.message || "Could not revoke the invite.",
        variant: "destructive",
      });
    } finally {
      setRevokingInviteId(null);
    }
  };

  // Handle organization settings change
  const handleOrgChange = (field: string, value: string) => {
    setOrgSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Save organization settings
  const handleSaveOrg = async () => {
    if (!canManageOrganization) {
      toast({
        title: "Not allowed",
        description:
          "You do not have permission to update organization settings.",
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
        industry: orgSettings.industry,
        gst: orgSettings.gst,
        pan: orgSettings.pan,
        contact_person: orgSettings.contact_person,
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
    role: "superadmin" | "admin" | "dataSteward",
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
      prev.map((p) => (p.id === permissionId ? { ...p, [role]: !p[role] } : p)),
    );
  };

  // Save permissions
  const handleSavePermissions = async () => {
    if (!canChangeAllRoles && !canManageDataStewards) {
      toast({
        title: "Not allowed",
        description:
          "Only Super Admins and Admins can save permission changes.",
      });
      return;
    }
    setIsSavingPermissions(true);
    try {
      const buildRolePermissions = (key: "admin" | "dataSteward") =>
        Object.fromEntries(permissions.map((p) => [p.id, Boolean(p[key])]));

      if (canChangeAllRoles) {
        await orgAPI.updateRolePermissions(
          "Admin",
          buildRolePermissions("admin"),
        );
      }
      // Both Super Admins and Admins can update Data Steward permissions.
      await orgAPI.updateRolePermissions(
        "Data Steward",
        buildRolePermissions("dataSteward"),
      );

      await reloadOrgData();
      await refreshPermissions();
      window.localStorage.setItem(
        "cleanflowai.permissionsUpdatedAt",
        String(Date.now()),
      );
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
    if (!canManageMembersPermission) {
      toast({
        title: "Not allowed",
        description: "You do not have permission to update member roles.",
        variant: "destructive",
      });
      return;
    }
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
          description:
            "Only the Super Admin can assign Admin or Super Admin roles.",
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
  const removeMember = async (memberId: string) => {
    if (!canManageMembersPermission) {
      toast({
        title: "Not allowed",
        description: "You do not have permission to remove members.",
        variant: "destructive",
      });
      return;
    }
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) {
      return;
    }

    if (currentUserRole !== "Super Admin") {
      toast({
        title: "Not allowed",
        description: "Only Super Admins can remove members.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to remove ${targetMember.name} (${targetMember.email}) from the organization? This action cannot be undone.`)) {
      return;
    }

    try {
      await orgAPI.removeMember(memberId);
      toast({
        title: "Member removed",
        description: `${targetMember.name} has been removed from the organization.`,
      });
      await loadMembers();
    } catch (err: any) {
      console.error("Failed to remove member", err);
      toast({
        title: "Remove failed",
        description: err?.message || "Could not remove the member.",
        variant: "destructive",
      });
    }
  };

  const handleInviteMember = () => {
    if (!canInviteMembers) {
      toast({
        title: "Not allowed",
        description: inviteHelpText,
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
        description: `${email} invited as ${inviteRole}.`,
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
        title: "Not allowed",
        description: "You do not have permission to update the organization logo.",
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
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
          <div className="p-8 pb-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Invite Team Member</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-[320px]">
                Enter the email address of the person you'd like to invite and select their role within the organization.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-8 pb-8 pt-4 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isSendingInvite}
                  className="h-11 rounded-xl focus-visible:ring-primary/20 transition-all border-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  Access Level
                </Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as AppRole)}
                  disabled={isSendingInvite}
                >
                  <SelectTrigger id="invite-role" className="h-11 rounded-xl focus:ring-primary/20">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {allowedInviteRoles.map((role) => (
                      <SelectItem key={role} value={role} className="rounded-lg">
                        <span className="font-medium">{role}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSubmitInvite}
                disabled={isSendingInvite || !inviteEmail.includes("@")}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm transition-all active:scale-95 group"
              >
                {isSendingInvite ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Invite...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Send Invitation
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 text-primary-foreground/80" />
                  </div>
                )}
              </Button>
            </div>
          </div>
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
        <PermissionWrapper
          permission={canManageSettingsPermission}
          permissionKey="settings"
          userRole={currentUserRole ?? undefined}
          message="You do not have permission to manage organization profile."
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Manage your organization's information and preferences
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
                <Button
                  onClick={handleSaveOrg}
                  disabled={isSavingOrg || !canManageOrganization}
                >
                  {isSavingOrg && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isSavingOrg ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </PermissionWrapper>
      </TabsContent>

      {/* Members Tab */}
      <TabsContent value="members" className="space-y-6">
        <PermissionWrapper
          permission={canViewMembersPermission}
          permissionKey="members_view"
          requiredRole={["Super Admin", "Admin", "Data Steward"]}
          userRole={currentUserRole ?? undefined}
          message="You do not have permission to view members."
        >
          <PermissionWrapper
            permission={canManageMembersPermission}
            permissionKey="members_manage"
            requiredRole={["Super Admin", "Admin", "Data Steward"]}
            userRole={currentUserRole ?? undefined}
            message="You do not have permission to manage members."
          >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Members & Roles
                </CardTitle>
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
                    <TableHead className="text-center">Role</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Joined</TableHead>
                    <TableHead className="text-center">Last Login</TableHead>
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
                  {!isLoadingOrg && allMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No team members or pending invites.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoadingOrg &&
                    allMembers.map((person) => {
                      const isSelf = Boolean(
                        currentUserId && person.displayId === currentUserId,
                      );
                      const isInvite = person.isInvite;

                      return (
                        <TableRow key={person.displayId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9 border border-border/50">
                                {person.displayAvatar ? (
                                  <AvatarImage src={person.displayAvatar} />
                                ) : null}
                                <AvatarFallback className={`${isInvite ? 'bg-indigo-50 text-indigo-600 font-bold' : 'bg-primary/10 text-primary'} text-xs`}>
                                  {person.displayName
                                    .split(" ")
                                    .map((n) => n?.[0])
                                    .filter(Boolean)
                                    .join("")
                                    .toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium flex items-center gap-2 text-sm sm:text-base">
                                  {person.displayName}
                                  {isSelf && (
                                    <Badge variant="outline" className="text-[10px] h-4">
                                      You
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                                  {person.displayEmail}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <Badge variant={getRoleBadgeVariant(person.displayRole)} className="text-[10px] h-5 min-w-[100px] justify-center">
                                {person.displayRole}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <Badge
                                variant={isInvite ? "secondary" : getStatusBadgeVariant(person.displayStatus)}
                                className={cn(
                                  "text-[10px] h-5 px-3 min-w-[80px] justify-center",
                                  person.displayStatus === "Active" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                                  isInvite && "bg-indigo-50 text-indigo-700 border-indigo-100"
                                )}
                              >
                                {person.displayStatus}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs text-center">
                            {person.displayJoined}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs text-center">
                            {person.displayLastLogin}
                          </TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={isSelf || !canManageMembersPermission}
                                    title={
                                      isSelf
                                        ? "You cannot change your own role here."
                                        : !canManageMembersPermission
                                          ? "You do not have permission to manage members."
                                          : undefined
                                    }
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[180px]">
                                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-bold px-2 py-1.5">Actions</DropdownMenuLabel>

                                  {isInvite ? (
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2 cursor-pointer"
                                      onClick={() => handleRevokeInvite(person.displayId, person.displayEmail)}
                                    >
                                      {revokingInviteId === person.displayId ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <X className="w-3.5 h-3.5" />
                                      )}
                                      Revoke Invite
                                    </DropdownMenuItem>
                                  ) : (
                                    <>
                                      {canChangeAllRoles ? (
                                        <>
                                          {person.displayRole === "Super Admin" ? (
                                            <DropdownMenuItem disabled className="text-xs italic">
                                              Super Admin is fixed
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuSub>
                                              <DropdownMenuSubTrigger className="gap-2">
                                                <UserCog className="w-3.5 h-3.5" />
                                                Change Role
                                              </DropdownMenuSubTrigger>
                                              <DropdownMenuPortal>
                                                <DropdownMenuSubContent className="w-[140px]">
                                                  {VALID_ROLES.filter((r: string) => r !== person.displayRole).map((role: string) => (
                                                    <DropdownMenuItem
                                                      key={role}
                                                      className="cursor-pointer"
                                                      onClick={() => updateMemberRole(person.displayId, role as AppRole)}
                                                    >
                                                      {role}
                                                    </DropdownMenuItem>
                                                  ))}
                                                </DropdownMenuSubContent>
                                              </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                          )}
                                        </>
                                      ) : (
                                        canManageDataStewards && person.displayRole === "Data Steward" && (
                                          <DropdownMenuItem disabled className="text-xs italic">
                                            Admin cannot demote
                                          </DropdownMenuItem>
                                        )
                                      )}

                                      {currentUserRole === "Super Admin" && person.displayRole !== "Super Admin" && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2 cursor-pointer"
                                            onClick={() => removeMember(person.displayId)}
                                          >
                                            <UserMinus className="w-3.5 h-3.5" />
                                            Remove Member
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </>
                                  )}
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
          </PermissionWrapper>
        </PermissionWrapper>
      </TabsContent>

      {/* Permissions Tab */}
      <TabsContent value="permissions" className="space-y-6">
        <PermissionWrapper
          requiredRole={["Super Admin", "Admin"]}
          userRole={currentUserRole ?? undefined}
          message="Only Super Admins and Admins can modify role permissions."
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Permissions
              </CardTitle>
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
                            disabled={
                              !canChangeAllRoles && !canManageDataStewards
                            }
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
                  disabled={
                    isSavingPermissions ||
                    (!canChangeAllRoles && !canManageDataStewards)
                  }
                >
                  {isSavingPermissions && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isSavingPermissions ? "Saving..." : "Save Permissions"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </PermissionWrapper>
      </TabsContent>

      {/* Services Tab */}
      <TabsContent value="services" className="space-y-6">
        <PermissionWrapper
          permission={canManageSettingsPermission}
          permissionKey="settings"
          userRole={currentUserRole ?? undefined}
          message="You do not have permission to manage connected services."
        >
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
                            e.target.value,
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
                            e.target.value,
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

          {/* Global Settings Presets */}
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Global Settings Presets
                </CardTitle>
                <CardDescription>
                  Manage global DQ settings presets used across files and workflows.
                </CardDescription>
              </div>
              <Button onClick={openCreatePresetDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                New Preset
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingPresets ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading presets...
                </div>
              ) : settingsPresets.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No presets yet. Create a new preset to define global defaults.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preset Name</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settingsPresets.map((preset) => (
                      <TableRow key={preset.preset_id}>
                        <TableCell className="font-medium">
                          {preset.preset_name}
                        </TableCell>
                        <TableCell>
                          {preset.is_default ? (
                            <Badge variant="secondary">Default</Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultPreset(preset)}
                              disabled={isSavingPreset}
                            >
                              Set Default
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {preset.updated_at
                            ? new Date(preset.updated_at).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPresetDialog(preset)}
                            disabled={isSavingPreset}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setPresetToDelete(preset);
                              setIsDeletePresetOpen(true);
                            }}
                            disabled={isSavingPreset}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {presetDialogMode === "create" ? "Create Preset" : "Edit Preset"}
                </DialogTitle>
                <DialogDescription>
                  Define global DQ settings to reuse across workflows.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Preset Name</Label>
                  <Input
                    value={presetFormName}
                    onChange={(e) => setPresetFormName(e.target.value)}
                    placeholder="e.g. Default DQ Rules"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preset Config (JSON)</Label>
                  <Textarea
                    value={presetFormConfig}
                    onChange={(e) => setPresetFormConfig(e.target.value)}
                    className="min-h-[220px] font-mono text-xs"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={presetFormDefault}
                    onCheckedChange={setPresetFormDefault}
                  />
                  <Label>Set as default preset</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsPresetDialogOpen(false)}
                  disabled={isSavingPreset}
                >
                  Cancel
                </Button>
                <Button onClick={handleSavePreset} disabled={isSavingPreset}>
                  {isSavingPreset && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {presetDialogMode === "create" ? "Create" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeletePresetOpen} onOpenChange={setIsDeletePresetOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete preset?</AlertDialogTitle>
                <AlertDialogDescription>
                  {presetToDelete
                    ? `Delete preset "${presetToDelete.preset_name}"? This cannot be undone.`
                    : "This action cannot be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSavingPreset}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeletePreset}
                  disabled={isSavingPreset}
                >
                  {isSavingPreset ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </PermissionWrapper>
      </TabsContent >
    </Tabs >
  );
}
