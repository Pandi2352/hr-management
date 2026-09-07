import { Menu } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { SearchBar } from "./SearchBar";
import { Notification } from "./Notification";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { Spinner } from "../../ui/Spinner";
import { useGlobalLoading } from "../../../hooks/useGlobalLoading";

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export function Navbar({ onToggleMobileSidebar }: NavbarProps) {
  const isGlobalLoading = useGlobalLoading();

  return (
    <header className="sticky top-0 z-30 flex h-12 w-full shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface px-3 sm:px-4">
      {/* In-flight API activity bar */}
      {isGlobalLoading && (
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-surface-3">
          <div className="h-full w-full animate-pulse bg-violet-500" />
        </div>
      )}

      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onToggleMobileSidebar}
          aria-label="Toggle mobile menu"
          className="cursor-pointer rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Breadcrumbs />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {isGlobalLoading && (
          <div className="mr-1 hidden items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-2 sm:flex">
            <Spinner size="xs" variant="violet" />
            <span>Syncing</span>
          </div>
        )}

        <SearchBar />
        <ThemeToggle />
        <Notification />
        <div className="mx-1 h-5 w-px bg-hairline" />
        <UserMenu />
      </div>
    </header>
  );
}
