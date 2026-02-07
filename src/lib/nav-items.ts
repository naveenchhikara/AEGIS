import {
  LayoutDashboard,
  FileText,
  Calendar,
  AlertCircle,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "compliance",
    label: "Compliance Registry",
    href: "/compliance",
    icon: FileText,
  },
  {
    id: "audit-plan",
    label: "Audit Plan",
    href: "/audit-plan",
    icon: Calendar,
  },
  {
    id: "findings",
    label: "Findings",
    href: "/findings",
    icon: AlertCircle,
  },
  {
    id: "board-report",
    label: "Board Report",
    href: "/board-report",
    icon: BarChart3,
  },
  {
    id: "auditee",
    label: "Auditee Portal",
    href: "/auditee",
    icon: Users,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

// NOTE: Auditee Portal and Settings are placeholder routes for future phases
// They will be implemented in later phases of the project
