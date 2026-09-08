import { useState, useEffect } from "react";
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
import { organizationApi } from "../../../features/organization/api/organization.api";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/**
 * Per-destination icon colours.
 *
 * Written out as literal class strings rather than built from the tint name —
 * Tailwind scans source text, so an interpolated `text-${tint}-600` is never
 * generated and the icon would fall back to inheriting.
 *
 * The 600/400 pair keeps every hue legible on both the light and dark rail
 * without changing weight; the active row is marked by its background and
 * label weight, not by recolouring the icon.
 */
const NAV_TINTS: Record<string, { icon: string }> = {
  indigo: { icon: 'text-indigo-600 dark:text-indigo-400' },
  violet: { icon: 'text-violet-600 dark:text-violet-400' },
  blue: { icon: 'text-blue-600 dark:text-blue-400' },
  sky: { icon: 'text-sky-600 dark:text-sky-400' },
  cyan: { icon: 'text-cyan-600 dark:text-cyan-400' },
  teal: { icon: 'text-teal-600 dark:text-teal-400' },
  emerald: { icon: 'text-emerald-600 dark:text-emerald-400' },
  amber: { icon: 'text-amber-600 dark:text-amber-400' },
  orange: { icon: 'text-orange-600 dark:text-orange-400' },
  rose: { icon: 'text-rose-600 dark:text-rose-400' },
  fuchsia: { icon: 'text-fuchsia-600 dark:text-fuchsia-400' },
};

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

  // Reactive branding states for real-time logo/name synchronization
  const [orgLogo, setOrgLogo] = useState<string>(
    () => localStorage.getItem("organization_logo") || "/branding/nexora_ai_logo.jpg"
  );
  const [orgName, setOrgName] = useState<string>(
    () => localStorage.getItem("organization_name") || "Nexora Technologies"
  );
  const [userAvatar, setUserAvatar] = useState<string | null | undefined>(
    () => user?.avatarUrl || localStorage.getItem("user_avatar")
  );

  useEffect(() => {
    if (user?.avatarUrl) {
      setUserAvatar(user.avatarUrl);
    }
    const handleUserUpdate = (e: any) => {
      if (e.detail?.avatarUrl) {
        setUserAvatar(e.detail.avatarUrl);
      }
    };
    window.addEventListener("user_profile_updated", handleUserUpdate);
    return () => window.removeEventListener("user_profile_updated", handleUserUpdate);
  }, [user?.avatarUrl]);

  useEffect(() => {
    // 1. Initial sync from server to ensure fresh profile data
    organizationApi
      .getProfile()
      .then((profile) => {
        if (profile) {
          const activeLogo = profile.logoUrl || "/branding/nexora_ai_logo.jpg";
          const activeName = profile.tradeName || profile.legalName || "Nexora Technologies";
          setOrgLogo(activeLogo);
          setOrgName(activeName);
          localStorage.setItem("organization_logo", activeLogo);
          localStorage.setItem("organization_name", activeName);
        }
      })
      .catch(() => {
        // Retain fallback quietly
      });

    // 2. Real-time event listener: updates immediately when logo or profile changes in OrganizationProfilePage
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ logoUrl?: string; name?: string }>;
      if (customEvent.detail?.logoUrl !== undefined) {
        setOrgLogo(customEvent.detail.logoUrl || "/branding/nexora_ai_logo.jpg");
      }
      if (customEvent.detail?.name) {
        setOrgName(customEvent.detail.name);
      }
    };

    window.addEventListener("organization_profile_updated", handleProfileUpdate);

    // 3. Multi-tab synchronization
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "organization_logo" && e.newValue) {
        setOrgLogo(e.newValue);
      }
      if (e.key === "organization_name" && e.newValue) {
        setOrgName(e.newValue);
      }
      if (e.key === "user_avatar" && e.newValue) {
        setUserAvatar(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("organization_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Far-left rail: quick jumps with modern cohesive icons
  const railItems = [
    { id: "search", icon: MagnifyingGlass, label: "Search Directory", href: "/employees", tint: "blue" },
    { id: "contacts", icon: AddressBook, label: "Contacts Directory", href: "/contacts", tint: "sky" },
    { id: "calendar", icon: CalendarCheck, label: "Attendance Calendar", href: "/attendance", tint: "teal" },
    { id: "id-card", icon: IdentificationCard, label: "Employee Directory", href: "/employees", tint: "violet" },
    { id: "chat", icon: ChatTeardropDots, label: "Approvals & Requests", href: "/approvals", tint: "rose" },
    { id: "tree", icon: TreeStructure, label: "Organization Structure", href: "/organization/departments", tint: "cyan" },
  ];

  /*
   * Each destination carries its own hue. The colour is a wayfinding aid, not
   * decoration: the same tint appears in the rail and the expanded list, so a
   * destination stays recognisable at a glance in either. Every row still
   * carries its label and its own icon shape, so colour is never the only cue.
   */
  const workspaceItems = [
    { title: "Dashboard", icon: SquaresFour, href: "/", exact: true, tint: "indigo" },
    { title: "Org Profile", icon: Buildings, href: "/organization/profile", tint: "violet" },
    { title: "Departments", icon: CirclesThreePlus, href: "/organization/departments", exact: true, tint: "sky" },
    { title: "Designations", icon: Certificate, href: "/organization/designations", tint: "teal" },
    { title: "Locations", icon: MapPinArea, href: "/organization/locations", tint: "emerald" },
    { title: "Cost Centers", icon: Coins, href: "/organization/cost-centers", tint: "amber" },
    { title: "Employees", icon: UserList, href: "/employees", tint: "blue" },
  ];

  const governanceItems = [
    { title: "Users Roster", icon: UserGear, href: "/security/users", tint: "violet" },
    { title: "Roles & Permissions", icon: ShieldCheck, href: "/security/roles", tint: "indigo" },
    { title: "Security Policies", icon: LockKey, href: "/security/settings", tint: "rose" },
    { title: "Audit Trail", icon: ClockCounterClockwise, href: "/audit/logs", tint: "orange" },
    { title: "Login History", icon: SignIn, href: "/audit/login-history", tint: "cyan" },
  ];

  const operationsItems = [
    { title: "Contacts", icon: AddressBook, href: "/contacts", tint: "sky" },
    { title: "Recruitment", icon: UserPlus, href: "/recruitment", tint: "fuchsia" },
    { title: "Attendance", icon: ClockUser, href: "/attendance", tint: "teal" },
    { title: "Payroll", icon: Receipt, href: "/payroll", tint: "emerald" },
    { title: "Leaves", icon: AirplaneTilt, href: "/leave", tint: "amber" },
    { title: "Approvals", icon: SealCheck, href: "/approvals", soon: true, tint: "rose" },
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
    tint?: string;
  }) => {
    const active = isItemActive(item.href, item.exact);
    const Icon = item.icon;
    const tone = NAV_TINTS[item.tint ?? "indigo"] ?? NAV_TINTS.indigo;

    return (
      <Link
        key={item.title}
        to={item.href}
        onClick={onCloseMobile}
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-2 py-[5px] text-[12.5px] transition-colors",
          active ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        {/* Colour lives on the icon stroke itself — no chip, no fill. The hue
            is what makes a destination recognisable before the label is read. */}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
            tone.icon,
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
              className="mb-4 flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-hairline transition-opacity hover:opacity-80 bg-slate-900"
            >
              <img
                src={orgLogo}
                alt={orgName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/branding/nexora_ai_logo.jpg";
                }}
                className="h-full w-full object-cover"
              />
            </Link>

            <nav className="flex w-full flex-col items-center gap-1.5">
              {railItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);
                const tone = NAV_TINTS[item.tint] ?? NAV_TINTS.indigo;

                return (
                  <Tooltip key={item.id} content={item.label} placement="right" delay={100}>
                    <Link
                      to={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "group flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                        active ? "bg-surface-2" : "hover:bg-surface-2",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] transition-transform duration-150 group-hover:scale-110",
                          tone.icon,
                        )}
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
            {/*
              Workspace & Organization switcher.

              No logo here: the rail already shows it a few pixels to the left
              at the same height, so a second copy read as a duplicate rather
              than as branding. The rail carries the mark, this carries the name.
            */}
            <div className="flex h-12 items-center gap-2 border-b border-hairline px-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-bold text-ink leading-tight">{orgName}</div>
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
              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--primary)] text-[10px] font-semibold text-white">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={displayName}
                    className="h-full w-full object-cover rounded-md"
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
