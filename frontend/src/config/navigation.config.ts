import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  Building2,
  Settings,
  ShieldCheck,
  User,
  Banknote,
  BookUser,
  type LucideIcon,
} from "lucide-react";

export interface NavItemConfig {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger" | "info";
  permission?: string;
  roles?: string[];
  exact?: boolean;
}

export interface NavGroupConfig {
  groupLabel: string;
  items: NavItemConfig[];
}

export const navigationConfig: NavGroupConfig[] = [
  {
    groupLabel: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: "My Profile",
        href: "/profile",
        icon: User,
        exact: true,
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
        permission: "employee.read",
      },
      {
        title: "Contacts",
        href: "/contacts",
        icon: BookUser,
        permission: "employee.read",
      },
      {
        title: "Recruitment",
        href: "/recruitment",
        icon: UserPlus,
        permission: "recruitment.read",
      },
      {
        title: "Attendance",
        href: "/attendance",
        icon: CalendarCheck,
        permission: "attendance.read",
      },
      {
        title: "Payroll",
        href: "/payroll",
        icon: Banknote,
        permission: "payroll.read",
      },
      {
        title: "Leaves",
        href: "/leave",
        icon: CalendarDays,
        badge: "3 Pending",
        badgeVariant: "warning",
        permission: "leave.read",
      },
      {
        title: "Holidays",
        href: "/holidays",
        icon: CalendarDays,
        permission: "holiday:read",
      },
      {
        title: "Approvals",
        href: "/approvals",
        icon: CheckSquare,
        permission: "approvals.read",
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
        roles: ["SUPER_ADMIN", "HR_ADMIN"],
      },
      {
        title: "Roles & Security",
        href: "/security",
        icon: ShieldCheck,
        roles: ["SUPER_ADMIN"],
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["SUPER_ADMIN", "HR_ADMIN"],
      },
    ],
  },
];

export interface BreadcrumbMeta {
  title: string;
  parent?: string;
}

export const routeBreadcrumbMap: Record<string, BreadcrumbMeta> = {
  "/": { title: "Dashboard" },
  "/profile": { title: "My Profile", parent: "/" },
  "/employees": { title: "Employees", parent: "/" },
  "/employees/new": { title: "Create Employee", parent: "/employees" },
  "/contacts": { title: "Contacts Directory", parent: "/" },
  "/recruitment": { title: "Recruitment", parent: "/" },
  "/attendance": { title: "Attendance", parent: "/" },
  "/attendance/calendar": { title: "Attendance Calendar", parent: "/attendance" },
  "/payroll": { title: "Payroll", parent: "/" },
  "/leave": { title: "Leaves", parent: "/" },
  "/leave/requests": { title: "Leave Requests", parent: "/leave" },
  "/holidays": { title: "Holidays", parent: "/" },
  "/holidays/manage": { title: "Manage Holidays", parent: "/holidays" },
  "/approvals": { title: "Approvals", parent: "/" },
  "/organization": { title: "Organization", parent: "/" },
  "/security": { title: "Roles & Security", parent: "/" },
  "/settings": { title: "Settings", parent: "/" },
};
