import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger" | "info";
}

export interface NavGroup {
  groupLabel?: string;
  items: NavItem[];
}
