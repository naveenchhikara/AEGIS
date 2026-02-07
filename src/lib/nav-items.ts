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
  },
  {
    title: "Compliance Registry",
    href: "/compliance",
    icon: ShieldCheck,
  },
  {
    title: "Audit Planning",
    href: "/audit-plans",
    icon: ClipboardList,
  },
  {
    title: "Findings",
    href: "/findings",
    icon: Search,
  },
  {
    title: "Board Report",
    href: "/reports",
    icon: FileBarChart,
  },
  {
    title: "Auditee Portal",
    href: "/auditee",
    icon: UserCheck,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;
