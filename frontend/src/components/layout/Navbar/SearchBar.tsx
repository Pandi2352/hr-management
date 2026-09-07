import { useState } from "react";
import { Search, Command, X } from "lucide-react";

export function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="relative w-full max-w-xs md:max-w-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search employees, policies, teams..."
        className="w-full rounded-md border border-slate-300 bg-white hover:border-slate-400 py-1.5 pr-16 pl-9 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-violet-400 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:focus:border-violet-400"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1.5">
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <kbd className="hidden items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500 sm:inline-flex pointer-events-none">
          <Command className="h-3 w-3" /> K
        </kbd>
      </div>
    </div>
  );
}
