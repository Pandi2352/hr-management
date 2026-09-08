import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  Building2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { NavGroup } from "./types";

export const sidebarConfig: NavGroup[] = [
  {
    groupLabel: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupLabel: "HR Operations",
    items: [
      {
        title: "Employees",
        href: "/employees",
        icon: Users,
      },
      {
        title: "Onboarding",
        href: "/lifecycle/onboarding",
        icon: UserCheck,
      },
      {
        title: "Attendance",
        href: "/attendance",
        icon: CalendarCheck,
      },
      {
        title: "Leave",
        href: "/leave",
        icon: CalendarDays,
        badge: "3 Pending",
        badgeVariant: "warning",
      },
      {
        title: "Approvals",
        href: "/approvals",
        icon: CheckSquare,
      },
    ],
  },
  {
    groupLabel: "Administration",
    items: [
      {
        title: "Organization",
        href: "/organization",
        icon: Building2,
      },
      {
        title: "Roles & Security",
        href: "/security",
        icon: ShieldCheck,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
