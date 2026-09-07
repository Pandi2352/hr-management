import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { routeBreadcrumbMap } from "../../../config/navigation.config";

export function Breadcrumbs() {
  const location = useLocation();
  const currentPath = location.pathname;

  // Build breadcrumb trail based on configuration
  const breadcrumbs: { label: string; href: string; isLast: boolean }[] = [];

  const addPath = (path: string) => {
    const meta = routeBreadcrumbMap[path];
    if (meta) {
      if (meta.parent && meta.parent !== path) {
        addPath(meta.parent);
      }
      breadcrumbs.push({
        label: meta.title,
        href: path,
        isLast: path === currentPath,
      });
    } else {
      // Dynamic fallback for parameterized routes (e.g. /employees/:id)
      const segments = path.split("/").filter(Boolean);
      let cumulative = "";
      for (let i = 0; i < segments.length; i++) {
        cumulative += `/${segments[i]}`;
        const known = routeBreadcrumbMap[cumulative];
        breadcrumbs.push({
          label: known ? known.title : segments[i].charAt(0).toUpperCase() + segments[i].slice(1),
          href: cumulative,
          isLast: i === segments.length - 1,
        });
      }
    }
  };

  addPath(currentPath);

  if (breadcrumbs.length <= 1 && currentPath === "/") {
    return (
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Home className="h-3.5 w-3.5 text-indigo-600" />
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs">
      <Link
        to="/"
        className="flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {breadcrumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
          {crumb.isLast ? (
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.href}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
