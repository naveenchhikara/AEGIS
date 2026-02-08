import {
  LayoutDashboard,
  ShieldCheck,
  ClipboardList,
  Search,
  FileBarChart,
  UserCheck,
  Settings,
} from "@/lib/icons";

export const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    tKey: "dashboard",
  },
  {
    title: "Compliance Registry",
    href: "/compliance",
    icon: ShieldCheck,
    tKey: "complianceRegistry",
  },
  {
    title: "Audit Planning",
    href: "/audit-plans",
    icon: ClipboardList,
    tKey: "auditPlanning",
  },
  { title: "Findings", href: "/findings", icon: Search, tKey: "findings" },
  {
    title: "Board Report",
    href: "/reports",
    icon: FileBarChart,
    tKey: "boardReport",
  },
  {
    title: "Auditee Portal",
    href: "/auditee",
    icon: UserCheck,
    tKey: "auditeePortal",
  },
  { title: "Settings", href: "/settings", icon: Settings, tKey: "settings" },
] as const;
