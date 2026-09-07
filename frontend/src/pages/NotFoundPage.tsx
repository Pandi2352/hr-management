import { Link } from "react-router-dom";
import { Compass, ArrowLeft, Home } from "lucide-react";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 mb-4 border border-indigo-100 dark:border-indigo-900/50">
        <Compass className="h-8 w-8" />
      </div>

      <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
        404 • Page Not Found
      </span>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
        Lost in PeopleOS?
      </h1>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
        The page you are looking for does not exist, has been moved, or is under scheduled maintenance.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
        <Link to="/">
          <Button variant="primary" size="sm" className="flex items-center gap-1.5 cursor-pointer">
            <Home className="h-3.5 w-3.5" />
            <span>Go to Dashboard</span>
          </Button>
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
}
