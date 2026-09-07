import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { useSidebar } from "../../hooks/useSidebar";
import { cn } from "../../utils/cn";

export function MainLayout() {
  const {
    collapsed,
    toggleCollapsed,
    mobileOpen,
    toggleMobile,
    closeMobile,
  } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />
      {/* Content wrapper offset by fixed sidebar width on desktop */}
      <div
        className={cn(
          "flex flex-1 flex-col h-screen overflow-hidden transition-all duration-200",
          collapsed ? "lg:pl-[52px]" : "lg:pl-[230px]"
        )}
      >
        <Navbar onToggleMobileSidebar={toggleMobile} />
        <main className="flex-1 overflow-y-auto bg-canvas p-4 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
