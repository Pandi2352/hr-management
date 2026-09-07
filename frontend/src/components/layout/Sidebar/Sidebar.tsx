import { Link, useLocation } from "react-router-dom";
import {
  MagnifyingGlass,
  AddressBook,
  CalendarCheck,
  IdentificationCard,
  ChatTeardropDots,
  TreeStructure,
  GearSix,
  SidebarSimple,
  SquaresFour,
  Buildings,
  CirclesThreePlus,
  Certificate,
  MapPinArea,
  Coins,
  UserList,
  UserGear,
  ShieldCheck,
  LockKey,
  ClockCounterClockwise,
  SignIn,
  UserPlus,
  ClockUser,
  Receipt,
  AirplaneTilt,
  SealCheck,
  CaretUpDown,
  type IconWeight,
} from "@phosphor-icons/react";
import { cn } from "../../../utils/cn";
import { Tooltip } from "../../ui/tooltip";
import { useAuth } from "../../../features/auth/context/AuthContext";
import { useCustomizer } from "../../../features/customizer";
import logoImg from "../../../assets/peopleos_logo.jpg";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuth();
  const { openCustomizer } = useCustomizer();

  // Far-left rail: quick jumps with modern cohesive icons
  const railItems = [
    { id: "search", icon: MagnifyingGlass, label: "Search Directory", href: "/employees" },
    { id: "contacts", icon: AddressBook, label: "Contacts Directory", href: "/contacts" },
    { id: "calendar", icon: CalendarCheck, label: "Attendance Calendar", href: "/attendance" },
    { id: "id-card", icon: IdentificationCard, label: "Employee Directory", href: "/employees" },
    { id: "chat", icon: ChatTeardropDots, label: "Approvals & Requests", href: "/approvals" },
    { id: "tree", icon: TreeStructure, label: "Organization Structure", href: "/organization/departments" },
  ];

  const workspaceItems = [
    { title: "Dashboard", icon: SquaresFour, href: "/", exact: true },
    { title: "Org Profile", icon: Buildings, href: "/organization/profile" },
    { title: "Departments", icon: CirclesThreePlus, href: "/organization/departments", exact: true },
    { title: "Hierarchy Tree", icon: TreeStructure, href: "/organization/departments/tree" },
    { title: "Designations", icon: Certificate, href: "/organization/designations" },
    { title: "Locations", icon: MapPinArea, href: "/organization/locations" },
    { title: "Cost Centers", icon: Coins, href: "/organization/cost-centers" },
    { title: "Employees", icon: UserList, href: "/employees" },
  ];

  const governanceItems = [
    { title: "Users Roster", icon: UserGear, href: "/security/users" },
    { title: "Roles & Permissions", icon: ShieldCheck, href: "/security/roles" },
    { title: "Security Policies", icon: LockKey, href: "/security/settings" },
    { title: "Audit Trail", icon: ClockCounterClockwise, href: "/audit/logs" },
    { title: "Login History", icon: SignIn, href: "/audit/login-history" },
  ];

  const operationsItems = [
    { title: "Contacts", icon: AddressBook, href: "/contacts" },
    { title: "Recruitment", icon: UserPlus, href: "/recruitment" },
    { title: "Attendance", icon: ClockUser, href: "/attendance" },
    { title: "Payroll", icon: Receipt, href: "/payroll" },
    { title: "Leaves", icon: AirplaneTilt, href: "/leave" },
    { title: "Approvals", icon: SealCheck, href: "/approvals", soon: true },
  ];

  const isItemActive = (href: string, exact?: boolean) =>
    exact ? currentPath === href : currentPath === href || currentPath.startsWith(`${href}/`);

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "Signed out";
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  const renderNavItem = (item: {
    title: string;
    icon: React.ComponentType<{ className?: string; weight?: IconWeight; size?: number | string }>;
    href: string;
    exact?: boolean;
    soon?: boolean;
  }) => {
    const active = isItemActive(item.href, item.exact);
    const Icon = item.icon;

    return (
      <Link
        key={item.title}
        to={item.href}
        onClick={onCloseMobile}
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-2 py-[5px] text-[12.5px] transition-colors",
          active
            ? "font-semibold"
            : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
        style={active ? { color: "var(--primary)" } : undefined}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105",
            active ? "text-[var(--primary)]" : "text-ink-3 group-hover:text-ink-2",
          )}
          weight={active ? "duotone" : "regular"}
        />
        <span className="truncate">{item.title}</span>
        {item.soon && (
          <span className="ml-auto shrink-0 rounded bg-surface-3 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-ink-3">
            Soon
          </span>
        )}
      </Link>
    );
  };

  const sectionLabel = (label: string) => (
    <span className="mb-1 block px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
      {label}
    </span>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex select-none border-r border-hairline bg-surface transition-all duration-200",
          collapsed ? "w-[52px]" : "w-[230px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* ============ 1. ICON RAIL ============ */}
        <div className="flex w-[52px] shrink-0 flex-col items-center justify-between border-r border-hairline bg-rail py-3">
          <div className="flex w-full flex-col items-center">
            <Link
              to="/"
              className="mb-4 flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-hairline transition-opacity hover:opacity-80 bg-slate-900 shadow-xs"
            >
              <img src="/branding/nexora_ai_logo.jpg" alt="Nexora Technologies" className="h-full w-full object-cover" />
            </Link>

            <nav className="flex w-full flex-col items-center gap-1.5">
              {railItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);

                return (
                  <Tooltip key={item.id} content={item.label} placement="right" delay={100}>
                    <Link
                      to={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                        active
                          ? "font-semibold"
                          : "text-ink-3 hover:bg-surface-2 hover:text-ink-2",
                      )}
                      style={active ? { color: "var(--primary)" } : undefined}
                    >
                      <Icon
                        className="h-[18px] w-[18px] transition-transform duration-150 group-hover:scale-105"
                        weight={active ? "duotone" : "regular"}
                      />
                    </Link>
                  </Tooltip>
                );
              })}
            </nav>
          </div>

          <div className="flex w-full flex-col items-center gap-1.5">
            <Tooltip content="Theme & Customization" placement="right" delay={100}>
              <button
                type="button"
                onClick={openCustomizer}
                className="group relative flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
                title="Customize Theme, Colors, Fonts & Layout"
              >
                <GearSix
                  className="h-[18px] w-[18px] animate-spin-slow transition-transform duration-500 ease-in-out group-hover:scale-115"
                  weight="duotone"
                />
              </button>
            </Tooltip>

            <Tooltip
              content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              placement="right"
              delay={100}
            >
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-2 cursor-pointer"
              >
                <SidebarSimple className="h-[18px] w-[18px]" weight="regular" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* ============ 2. NAV PANEL ============ */}
        {!collapsed && (
          <div className="flex w-[178px] shrink-0 flex-col overflow-hidden bg-surface">
            {/* Workspace & Organization switcher */}
            <div className="flex h-12 items-center gap-2 border-b border-hairline px-2.5">
              <div className="h-6 w-6 shrink-0 rounded-md overflow-hidden border border-hairline bg-slate-900 shadow-xs flex items-center justify-center">
                <img src="/branding/nexora_ai_logo.jpg" alt="Nexora Technologies" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-bold text-ink leading-tight">Nexora Technologies</div>
                <div className="truncate text-[10px] text-ink-3 font-medium">PeopleOS</div>
              </div>
              <CaretUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-3" weight="bold" />
            </div>

            {/* Scrollable nav */}
            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-2 py-3">
              <div>
                {sectionLabel("Workspace")}
                <div className="space-y-px">{workspaceItems.map(renderNavItem)}</div>
              </div>

              <div>
                {sectionLabel("Access Governance")}
                <div className="space-y-px">{governanceItems.map(renderNavItem)}</div>
              </div>

              <div>
                {sectionLabel("Operations")}
                <div className="space-y-px">{operationsItems.map(renderNavItem)}</div>
              </div>
            </div>

            {/* User row */}
            <Link
              to="/profile"
              onClick={onCloseMobile}
              className="flex items-center gap-2 border-t border-hairline px-2.5 py-2.5 transition-colors hover:bg-surface-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] text-[10px] font-semibold text-white shadow-xs">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              <span className="truncate text-[12px] font-medium text-ink-2">{displayName}</span>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
