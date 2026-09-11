import { Outlet } from "react-router-dom";
import { QuizJobWatcher } from "../../features/quiz/components/QuizJobWatcher";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { SpotlightRail } from "./SpotlightRail";
import { useSidebar } from "../../hooks/useSidebar";
import { useSpotlightRail } from "../../hooks/useSpotlightRail";
import { cn } from "../../utils/cn";

/**
 * The application shell.
 *
 * Three regions: the left sidebar, the content column, and the spotlight rail
 * on the right. The sidebar is fixed and the column offsets itself past it; the
 * spotlight rail is an ordinary flex child of the row beneath the navbar.
 *
 * That asymmetry is deliberate. The sidebar has to overlay on mobile, so it is
 * fixed and the offset is the price. The spotlight rail never overlays, and as
 * a fixed element it started at the top of the viewport — sitting alongside the
 * navbar and cutting the header line in half, with the content reserving a
 * hand-written gutter that went stale the moment the rail collapsed. In the
 * flow it lines up under the navbar and the layout does the spacing.
 */
export function MainLayout() {
  const {
    collapsed,
    toggleCollapsed,
    mobileOpen,
    toggleMobile,
    closeMobile,
  } = useSidebar();

  const spotlight = useSpotlightRail();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Mounted here, above the outlet, so a quiz being written in the
          background keeps reporting its progress wherever the person navigates.
          Renders nothing; its output is notifications. */}
      <QuizJobWatcher />

      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* Content column, offset past the fixed sidebar on desktop */}
      <div
        className={cn(
          "flex h-screen flex-1 flex-col overflow-hidden transition-all duration-200",
          collapsed ? "lg:pl-[52px]" : "lg:pl-[230px]"
        )}
      >
        {/* The navbar spans the full column, rail included */}
        <Navbar onToggleMobileSidebar={toggleMobile} />

        {/* `min-h-0` lets the scrolling pane shrink inside the flex column;
            without it the page grows past the viewport instead of scrolling. */}
        <div className="flex min-h-0 flex-1">
          <main className="content-scrollbar min-w-0 flex-1 overflow-y-auto bg-canvas p-4 sm:p-5">
            <Outlet />
          </main>

          <SpotlightRail
            collapsed={spotlight.collapsed}
            onToggleCollapsed={spotlight.toggleCollapsed}
            railClass={spotlight.railClass}
          />
        </div>
      </div>
    </div>
  );
}
