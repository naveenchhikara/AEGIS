import {
  LayoutDashboard,
  ShieldCheck,
  ClipboardList,
  Search,
  FileBarChart,
  UserCheck,
  Settings,
  Users,
  Clock,
} from "@/lib/icons";
import type { Permission, Role } from "./permissions";

/**
 * Navigation item structure for sidebar.
 */
export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tKey: string;
  requiredPermission: Permission;
}

/**
 * All navigation items with their required permissions.
 *
 * Dashboard permissions are role-specific:
 * - dashboard:auditor → Auditors see auditor-specific dashboard
 * - dashboard:manager → Audit managers see manager-specific dashboard
 * - dashboard:cae → CAE sees CAE-specific dashboard
 * - dashboard:cco → CCO sees CCO-specific dashboard
 * - dashboard:ceo → CEO sees CEO-specific dashboard
 */
export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    tKey: "dashboard",
    requiredPermission: "dashboard:auditor", // Fallback, will be dynamically replaced
  },
  {
    title: "Compliance Registry",
    href: "/compliance",
    icon: ShieldCheck,
    tKey: "complianceRegistry",
    requiredPermission: "compliance:read",
  },
  {
    title: "Audit Planning",
    href: "/audit-plans",
    icon: ClipboardList,
    tKey: "auditPlanning",
    requiredPermission: "audit_plan:read",
  },
  {
    title: "Findings",
    href: "/findings",
    icon: Search,
    tKey: "findings",
    requiredPermission: "observation:read",
  },
  {
    title: "Board Report",
    href: "/reports",
    icon: FileBarChart,
    tKey: "boardReport",
    requiredPermission: "report:read",
  },
  {
    title: "Auditee Portal",
    href: "/auditee",
    icon: UserCheck,
    tKey: "auditeePortal",
    requiredPermission: "observation:read", // Auditees can read their assigned observations
  },
  {
    title: "Audit Trail",
    href: "/audit-trail",
    icon: Clock,
    tKey: "auditTrail",
    requiredPermission: "audit_trail:read",
  },
  {
    title: "Admin",
    href: "/admin/users",
    icon: Users,
    tKey: "admin",
    requiredPermission: "admin:manage_users",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    tKey: "settings",
    requiredPermission: "admin:manage_settings",
  },
];

/**
 * Filter navigation items by user's roles.
 *
 * Returns union of all nav items that the user has permission to access.
 * For multi-role users, they see all items from all their roles.
 *
 * Example:
 * - User with [CAE] → sees admin, audit trail, reports, etc.
 * - User with [AUDITOR, AUDIT_MANAGER] → sees both auditor and manager nav items
 * - User with [BOARD_OBSERVER] → sees nothing (empty permissions, graceful handling)
 *
 * @param roles - Array of roles held by the user
 * @returns Filtered array of nav items user can access
 */
export function filterNavByRoles(roles: Role[]): NavItem[] {
  const permissions = new Set<Permission>();

  // Collect all permissions from all user's roles
  for (const role of roles) {
    for (const perm of getPermissionsForRole(role)) {
      permissions.add(perm);
    }
  }

  // Filter nav items: user needs at least one permission that matches nav item's requirement
  return navItems.filter((item) => {
    // Special case: Dashboard has multiple role-specific permissions
    if (item.title === "Dashboard") {
      return (
        permissions.has("dashboard:auditor") ||
        permissions.has("dashboard:manager") ||
        permissions.has("dashboard:cae") ||
        permissions.has("dashboard:cco") ||
        permissions.has("dashboard:ceo")
      );
    }

    return permissions.has(item.requiredPermission);
  });
}

/**
 * Get all permissions for a specific role.
 * Helper for filterNavByRoles.
 *
 * Note: In production, this should import from permissions.ts's ROLE_PERMISSIONS
 * to avoid duplication. For now, defined inline to avoid circular import.
 */
function getPermissionsForRole(role: Role): Permission[] {
  const rolePermissions: Record<Role, Permission[]> = {
    AUDITOR: [
      "observation:create",
      "observation:read",
      "compliance:read",
      "audit_plan:read",
      "dashboard:auditor",
    ],
    AUDIT_MANAGER: [
      "observation:read",
      "observation:review",
      "observation:close_low_medium",
      "audit_plan:create",
      "audit_plan:manage",
      "compliance:read",
      "compliance:update",
      "report:read",
      "dashboard:manager",
    ],
    CAE: [
      "observation:read",
      "observation:approve",
      "observation:close_high_critical",
      "audit_plan:read",
      "audit_plan:manage",
      "compliance:read",
      "compliance:update",
      "compliance:mark_na",
      "report:read",
      "report:generate",
      "report:add_commentary",
      "audit_trail:read",
      "admin:manage_users",
      "admin:manage_roles",
      "admin:manage_settings",
      "dashboard:cae",
    ],
    CCO: [
      "compliance:read",
      "compliance:update",
      "observation:read",
      "report:read",
      "dashboard:cco",
    ],
    CEO: [
      "dashboard:ceo",
      "report:read",
      "observation:read",
      "compliance:read",
    ],
    AUDITEE: ["observation:read"],
    BOARD_OBSERVER: [],
  };

  return rolePermissions[role] || [];
}
