import { Link, useLocation } from "react-router-dom";
import { cn } from "../../../utils/cn";
import { Badge } from "../../ui/Badge";
import { Tooltip } from "../../ui/tooltip";
import type { NavItemConfig } from "../../../config/navigation.config";

interface SidebarItemProps {
  item: NavItemConfig;
  collapsed: boolean;
  onItemClick?: () => void;
}

export function SidebarItem({ item, collapsed, onItemClick }: SidebarItemProps) {
  const location = useLocation();

  // Route-aware matching: exact match for root `/`, prefix match for subpaths (e.g. `/employees/new`)
  const isActive = item.exact
    ? location.pathname === item.href
    : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

  const Icon = item.icon;

  const content = (
    <Link
      to={item.href}
      onClick={onItemClick}
      className={cn(
        "group flex items-center rounded-md text-xs font-medium transition-colors select-none",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
        isActive
          ? "bg-indigo-600 text-white font-semibold"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
        )}
      />
      {!collapsed && (
        <div className="flex flex-1 items-center justify-between overflow-hidden">
          <span className="truncate">{item.title}</span>
          {item.badge && (
            <Badge
              variant={isActive ? "default" : item.badgeVariant || "default"}
              size="sm"
              className={isActive ? "bg-white/20 text-white border-transparent" : ""}
            >
              {item.badge}
            </Badge>
          )}
        </div>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={item.title} placement="right" delay={100}>
        {content}
      </Tooltip>
    );
  }

  return content;
}
