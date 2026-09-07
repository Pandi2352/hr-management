import { SidebarItem } from "./SidebarItem";
import type { NavGroupConfig } from "../../../config/navigation.config";

interface SidebarGroupProps {
  group: NavGroupConfig;
  collapsed: boolean;
  onItemClick?: () => void;
}

export function SidebarGroup({ group, collapsed, onItemClick }: SidebarGroupProps) {
  return (
    <div className="space-y-1">
      {group.groupLabel && !collapsed && (
        <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
          {group.groupLabel}
        </p>
      )}
      <div className="space-y-1 pt-1">
        {group.items.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}
