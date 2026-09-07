import { Outlet } from "react-router-dom";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import logoImg from "../../assets/peopleos_logo.jpg";
import bgImg from "../../assets/hrm_login_bg.jpg";

export function AuthLayout() {
  return (
    <main className="relative flex min-h-screen w-full selection:bg-violet-600 selection:text-white bg-slate-950 overflow-hidden">
      {/* Full-bleed Architectural High-Resolution Background - 100% Crisp, Vibrant Violet Theme */}
      <img
        src={bgImg}
        alt="PeopleOS Architectural Background"
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
      />

      {/* Subtle directional dark gradient vignette so the image is vivid, high-contrast, with zero gray haze */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-slate-950/80 pointer-events-none" />

      {/* Full-Screen Two-Column Split Grid */}
      <div className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Big Logo Showcase & Enterprise Vision (7 cols) */}
        <div className="lg:col-span-7 hidden lg:flex flex-col justify-between p-12 xl:p-16 text-white">
          {/* Top Big Logo Brand Area */}
          <div>
            <div className="flex items-center gap-5">
              <img
                src={logoImg}
                alt="PeopleOS Brand Identity"
                className="h-20 w-20 xl:h-24 xl:w-24 rounded-md object-cover border border-violet-400/40 shadow-xl shadow-violet-950/50"
              />
              <div className="flex flex-col">
                <span className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                  People<span className="text-violet-400">OS</span>
                </span>
                <span className="text-xs xl:text-sm tracking-widest text-violet-200/80 uppercase font-semibold mt-1">
                  The Workforce Operating System
                </span>
              </div>
            </div>

            {/* Strategic Manifesto */}
            <div className="mt-14 xl:mt-20 max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-md border border-violet-500/30 bg-violet-950/60 px-3.5 py-1 text-xs font-semibold text-violet-300 backdrop-blur-md shadow-sm">
                <ShieldCheck className="h-4 w-4 text-violet-400" />
                <span>Enterprise Workforce Management Suite</span>
              </div>

              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
                Architected for unified global workforce operations.
              </h1>

              <p className="text-sm xl:text-base text-slate-300 leading-relaxed pt-2">
                Unifying organizational hierarchy, employee life-cycle records, automated shift rostering, attendance verification, and multi-tier approval chains on a resilient cloud backbone.
              </p>

              {/* Three Value Highlights */}
              <div className="pt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-200 font-medium">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600/30 text-violet-300 border border-violet-500/30 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span>Instant Organization Hierarchy & Reporting Tree Synchronization</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200 font-medium">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600/30 text-violet-300 border border-violet-500/30 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span>Strict Role-Based Access Control & Cryptographic Session Security</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-200 font-medium">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600/30 text-violet-300 border border-violet-500/30 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span>Automated Multi-tier Manager Leave & Regularization Governance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="pt-8 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2 font-medium text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Global Enterprise Gateway Active
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Lock className="h-3.5 w-3.5 text-violet-400" />
              TLS 1.3 256-bit Encrypted
            </span>
            <span>© 2026 PeopleOS Inc.</span>
          </div>
        </div>

        {/* Right Column: Floating Elevated Login Card Container (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-12 xl:p-16">
          {/* Mobile Big Logo */}
          <div className="flex items-center gap-4 lg:hidden mb-8 w-full max-w-md">
            <img
              src={logoImg}
              alt="PeopleOS Brand Identity"
              className="h-14 w-14 rounded-md object-cover border border-violet-400/40 shadow-lg"
            />
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                People<span className="text-violet-400">OS</span>
              </span>
              <p className="text-[10px] tracking-wider text-violet-200/80 uppercase font-semibold">
                Workforce Operating System
              </p>
            </div>
          </div>

          {/* Floating Elevated Card - Crisp rounded-md per design requirement */}
          <div className="w-full max-w-md rounded-md bg-white dark:bg-slate-900 shadow-2xl shadow-slate-950/50 p-8 sm:p-10 border border-slate-200/80 dark:border-slate-800 transition-all">
            <Outlet />
          </div>
        </div>

      </div>
    </main>
  );
}


