import React, { useEffect } from 'react';
import {
  X,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  Check,
  Palette,
  Type,
  Layout,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useCustomizer } from '../context/CustomizerContext';
import { THEME_COLORS, THEME_FONTS } from '../constants/customizerConstants';
import type {
  ThemeColorId,
  FontFamilyId,
  BorderRadiusOption,
  LayoutDensity,
  ThemeMode,
} from '../types/themeCustomizer.types';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';

export const ThemeCustomizerDrawer: React.FC = () => {
  const {
    isOpen,
    closeCustomizer,
    settings,
    setColor,
    setFont,
    setDarkSidebar,
    setDarkNavbar,
    setMode,
    setRadius,
    setDensity,
    resetToDefaults,
  } = useCustomizer();

  const toast = useToast();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCustomizer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCustomizer]);

  if (!isOpen) return null;

  const handleReset = () => {
    resetToDefaults();
    toast.info('Theme and layout settings restored to defaults', 'Settings Reset');
  };

  const modeOptions: { id: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Laptop },
  ];

  const radiusOptions: { id: BorderRadiusOption; label: string; px: string }[] = [
    { id: 'sharp', label: 'Sharp', px: '0px' },
    { id: 'compact', label: 'Compact', px: '4px' },
    { id: 'standard', label: 'Standard', px: '8px' },
    { id: 'smooth', label: 'Smooth', px: '12px' },
    { id: 'pill', label: 'Pill', px: '20px' },
  ];

  const densityOptions: { id: LayoutDensity; label: string; desc: string }[] = [
    { id: 'compact', label: 'Compact', desc: 'Dense tables & lists' },
    { id: 'comfortable', label: 'Comfortable', desc: 'Standard balanced spacing' },
    { id: 'spacious', label: 'Spacious', desc: 'Relaxed reading space' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeCustomizer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className="fixed inset-y-0 right-0 flex max-w-full pl-6"
        aria-label="Theme Customizer"
      >
        <div className="w-screen max-w-md bg-white dark:bg-[#111114] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300 transform">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-xs transition-colors"
                style={{
                  backgroundColor:
                    THEME_COLORS.find((c) => c.id === settings.color)?.primary || '#7c3aed',
                }}
              >
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                  Theme Customizer
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Personalize your visual workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Reset all to defaults"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeCustomizer}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 text-xs">
            {/* 1. Appearance Mode */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Color Scheme</span>
                </label>
                <span className="text-[10px] text-slate-400 capitalize">{settings.mode} mode</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {modeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = settings.mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMode(opt.id)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer',
                        isSelected
                          ? 'border-violet-500/80 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-600 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400')} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Theme Colors (10 Curated Colors) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-slate-400" />
                  <span>Primary Theme Color</span>
                </label>
                <span className="text-[10px] font-medium text-slate-400 uppercase">
                  {THEME_COLORS.find((c) => c.id === settings.color)?.name}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                {THEME_COLORS.map((col) => {
                  const isSelected = settings.color === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setColor(col.id as ThemeColorId)}
                      title={col.name}
                      className={cn(
                        'group relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-150 cursor-pointer',
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 shadow-xs ring-1 ring-slate-900/10 dark:ring-white/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      <span
                        className="h-6 w-6 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
                        style={{ backgroundColor: col.primary }}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />}
                      </span>
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-1 truncate w-full text-center">
                        {col.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Typography Fonts (5 Fonts) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-slate-400" />
                  <span>Typography Font</span>
                </label>
                <span className="text-[10px] text-slate-400">{settings.font}</span>
              </div>

              <div className="space-y-2">
                {THEME_FONTS.map((font) => {
                  const isSelected = settings.font === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setFont(font.id as FontFamilyId)}
                      className={cn(
                        'w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer',
                        isSelected
                          ? 'border-violet-500/80 bg-violet-50/70 text-violet-900 dark:bg-violet-950/30 dark:text-violet-200 dark:border-violet-600 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold truncate"
                            style={{ fontFamily: font.fontFamily }}
                          >
                            {font.name}
                          </span>
                          {font.id === 'Inter' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              Default
                            </span>
                          )}
                        </div>
                        <p
                          className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5"
                          style={{ fontFamily: font.fontFamily }}
                        >
                          {font.sample} • {font.description}
                        </p>
                      </div>

                      <div className="ml-3 shrink-0">
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border flex items-center justify-center',
                            isSelected
                              ? 'border-violet-600 bg-violet-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          )}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Chrome Styles (Dark Sidebar & Dark Navbar) */}
            <div className="space-y-2.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layout className="h-3.5 w-3.5 text-slate-400" />
                <span>Workspace Chrome Styling</span>
              </label>

              <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3">
                {/* Dark Sidebar Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Dark Sidebar</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Keep navigation sidebar dark in both light and dark mode
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.darkSidebar}
                    onClick={() => setDarkSidebar(!settings.darkSidebar)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      settings.darkSidebar ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
                        settings.darkSidebar ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-1" />

                {/* Dark Navbar Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Dark Navbar</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Apply obsidian dark finish to the top header navbar
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.darkNavbar}
                    onClick={() => setDarkNavbar(!settings.darkNavbar)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      settings.darkNavbar ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
                        settings.darkNavbar ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Border Radius */}
            <div className="space-y-2.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-slate-400" />
                <span>Corner Roundedness</span>
              </label>

              <div className="grid grid-cols-5 gap-1.5">
                {radiusOptions.map((r) => {
                  const isSelected = settings.radius === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRadius(r.id)}
                      className={cn(
                        'flex flex-col items-center justify-center py-2 px-1 rounded-md border text-center transition-all cursor-pointer',
                        isSelected
                          ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-500 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <span className="text-[11px]">{r.label}</span>
                      <span className="text-[9px] text-slate-400">{r.px}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Layout Density */}
            <div className="space-y-2.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200">
                Layout Density
              </label>
              <div className="grid grid-cols-3 gap-2">
                {densityOptions.map((d) => {
                  const isSelected = settings.density === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDensity(d.id)}
                      className={cn(
                        'flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer',
                        isSelected
                          ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-500 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <span className="text-xs">{d.label}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeCustomizer();
                toast.success('Theme preferences saved and active', 'Preferences Saved');
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
              style={{
                backgroundColor:
                  THEME_COLORS.find((c) => c.id === settings.color)?.primary || '#7c3aed',
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Apply & Done</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
