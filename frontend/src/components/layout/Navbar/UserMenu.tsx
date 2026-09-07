import { Link } from "react-router-dom";
import { User, LogOut, Shield, ChevronDown } from "lucide-react";
import { Dropdown } from "../../ui/Dropdown";
import { useAuth } from "../../../features/auth/context/AuthContext";
import { useLogout } from "../../../features/auth/hooks/useLogout";
import { LogoutDialog } from "../../../features/auth/components/LogoutDialog";

export function UserMenu() {
  const { user } = useAuth();
  const { isDialogOpen, isLoggingOut, openLogoutDialog, closeLogoutDialog, confirmLogout } =
    useLogout();

  const displayName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName}` : "User");
  const displayEmail = user?.email || "user@peopleos.internal";
  const displayRole = user?.roles?.[0] ? user.roles[0].replace("_", " ") : "Administrator";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <Dropdown
        trigger={
          <div className="flex items-center gap-2 rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--primary)] font-semibold text-xs text-white shadow-xs">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="hidden text-left sm:block">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  {displayName}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 capitalize whitespace-nowrap leading-none mt-0.5">
                {displayRole.toLowerCase()}
              </p>
            </div>
          </div>
        }
        className="w-56 p-1.5"
      >
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">{displayName}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{displayEmail}</p>
        </div>
        <div className="py-1">
          <Link
            to="/profile"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            <User className="h-4 w-4 text-slate-400" />
            My Profile
          </Link>
          <button className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
            <Shield className="h-4 w-4 text-slate-400" />
            Role Permissions
          </button>
        </div>
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={openLogoutDialog}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            Sign Out
          </button>
        </div>
      </Dropdown>

      {/* Accessible Logout Confirmation Dialog */}
      <LogoutDialog
        isOpen={isDialogOpen}
        isLoading={isLoggingOut}
        onConfirm={confirmLogout}
        onCancel={closeLogoutDialog}
      />
    </>
  );
}
