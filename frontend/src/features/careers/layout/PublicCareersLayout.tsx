import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SignIn, ArrowUpRight, Heart, Globe, Sparkle, Buildings, EnvelopeSimple, Phone } from '@phosphor-icons/react';
import { ThemeToggle } from '../../../components/layout/Navbar/ThemeToggle';
import { careersApi } from '../api/careers.api';
import type { PublicCompanyInfo } from '../types/careers.types';

export function PublicCareersLayout() {
  const [companyInfo, setCompanyInfo] = useState<PublicCompanyInfo | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    careersApi.getCompanyOverview().then(setCompanyInfo).catch(() => {});
  }, []);

  const companyName = companyInfo?.companyName || 'Nexora Technologies';
  const legalName = companyInfo?.legalName || 'Nexora Technologies Inc.';
  const corporateEmail = companyInfo?.corporateEmail || 'contact@nexoratech.com';
  const corporatePhone = companyInfo?.phone || '+1 (555) 789-2040';
  const logoUrl = companyInfo?.logoUrl || '/branding/nexora_ai_logo.jpg';

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/careers') {
      navigate('/careers');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const isContactActive = location.pathname === '/contact' || location.pathname === '/careers/contact';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-violet-500/20 selection:text-violet-600 transition-colors">
      {/* Top Banner - Sleek Dark Cybernetic Ribbon */}
      <div className="bg-slate-950 border-b border-slate-800/80 text-slate-300 text-[11px] font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-semibold">
          <Sparkle className="h-3 w-3 text-violet-400 animate-pulse" weight="fill" />
          Hiring
        </span>
        <span>Welcome to {companyName} — Actively hiring across global engineering & AI teams.</span>
        <button
          type="button"
          onClick={() => scrollToSection('open-roles')}
          className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer transition-colors"
        >
          View Openings &rarr;
        </button>
      </div>

      {/* Main Navbar - Deep Dark Obsidian with Quantum Cyan & Violet Laser Edge */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 text-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Company Name */}
          <Link to="/careers" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-md overflow-hidden border border-violet-500/40 bg-slate-900 group-hover:border-cyan-400/60 transition-colors flex items-center justify-center">
              <img
                src={logoUrl}
                alt={companyName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                {companyName}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Company & Careers
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-900/90 transition-colors cursor-pointer"
            >
              About Company
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('what-we-do')}
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-900/90 transition-colors cursor-pointer"
            >
              What We Do
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('perks')}
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-900/90 transition-colors cursor-pointer"
            >
              Culture & Perks
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('open-roles')}
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-900/90 transition-colors cursor-pointer"
            >
              Open Requirements
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('hubs')}
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-slate-900/90 transition-colors cursor-pointer"
            >
              Locations
            </button>
            <Link
              to="/contact"
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                isContactActive
                  ? 'text-cyan-300 bg-slate-900 border border-cyan-500/40'
                  : 'hover:text-white hover:bg-slate-900/90'
              }`}
            >
              Contact Us
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <Link
              to="/auth/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold border border-violet-500/40 bg-violet-950/50 text-violet-200 hover:bg-violet-900/60 hover:text-white hover:border-violet-400/70 transition-all"
            >
              <SignIn className="h-3.5 w-3.5 text-violet-400" weight="bold" />
              <span>Employee Portal</span>
            </Link>
          </div>
        </div>

        {/* Luminous Quantum Gradient Laser Accent Line */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-violet-500/40 via-cyan-400/40 to-transparent" />
      </header>

      {/* Main Page Body */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 mt-16">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="font-bold text-base text-slate-900 dark:text-white">
                  {legalName}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Pioneering next-generation enterprise AI, autonomous cloud platforms, and intelligent software engineering architectures worldwide.
              </p>

              <div className="space-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <EnvelopeSimple className="h-3.5 w-3.5 text-slate-400" />
                  <span>{corporateEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{corporatePhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>Remote-First • San Francisco • London • Singapore • Bengaluru</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                About Our Company
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('about')}
                    className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                  >
                    Company Story & Vision
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('what-we-do')}
                    className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                  >
                    What We Build & Deliver
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('perks')}
                    className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                  >
                    Culture & Employee Benefits
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('open-roles')}
                    className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer font-semibold text-violet-600 dark:text-violet-400"
                  >
                    Open Career Positions
                  </button>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors inline-flex items-center gap-1 font-semibold text-cyan-500 dark:text-cyan-400"
                  >
                    <span>Contact Us & Inquiries</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                Corporate Governance
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  <Link to="/auth/login" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1">
                    <span>Internal Staff Login</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </li>
                <li>
                  <span className="text-slate-400">Equal Opportunity & Inclusion</span>
                </li>
                <li>
                  <span className="text-slate-400">Data Privacy & Information Security</span>
                </li>
                <li>
                  <span className="text-slate-400">Ethics & Compliance Standards</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {legalName}. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Building the future of technology with <Heart className="h-3.5 w-3.5 text-rose-500" weight="fill" />
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
