import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  CustomizerSettings,
  CustomizerContextValue,
  ThemeColorId,
  FontFamilyId,
  BorderRadiusOption,
  LayoutDensity,
  ThemeMode,
} from '../types/themeCustomizer.types';
import { THEME_COLORS, THEME_FONTS, DEFAULT_CUSTOMIZER_SETTINGS } from '../constants/customizerConstants';

const STORAGE_KEY = 'peopleos_theme_customizer';

const CustomizerContext = createContext<CustomizerContextValue | undefined>(undefined);

function getInitialSettings(): CustomizerSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CUSTOMIZER_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_CUSTOMIZER_SETTINGS;
}

export const CustomizerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<CustomizerSettings>(getInitialSettings);

  const applyCustomizerSettings = useCallback((cfg: CustomizerSettings) => {
    const root = document.documentElement;

    // 1. Theme Mode (light, dark, system)
    let isDark = false;
    if (cfg.mode === 'dark') {
      isDark = true;
    } else if (cfg.mode === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';

    // 2. Theme Colors
    const colorObj = THEME_COLORS.find((c) => c.id === cfg.color) || THEME_COLORS[0];
    root.style.setProperty('--primary', colorObj.primary);
    root.style.setProperty('--primary-hover', colorObj.hover);
    root.style.setProperty('--primary-active', colorObj.active);
    root.style.setProperty('--primary-light', colorObj.lightBg);
    root.style.setProperty('--primary-ring', colorObj.ring);
    root.setAttribute('data-theme-color', cfg.color);

    // 3. Fonts
    const fontObj = THEME_FONTS.find((f) => f.id === cfg.font) || THEME_FONTS[0];
    root.style.setProperty('--font-primary', fontObj.fontFamily);
    document.body.style.fontFamily = fontObj.fontFamily;
    root.setAttribute('data-font', cfg.font);

    // 4. Chrome Styles (Dark Sidebar, Dark Navbar)
    root.setAttribute('data-dark-sidebar', String(cfg.darkSidebar));
    root.setAttribute('data-dark-navbar', String(cfg.darkNavbar));

    // 5. Border Radius
    const radiusMap: Record<BorderRadiusOption, string> = {
      sharp: '0px',
      compact: '4px',
      standard: '8px',
      smooth: '12px',
      pill: '20px',
    };
    root.style.setProperty('--app-radius', radiusMap[cfg.radius] || '8px');
    root.setAttribute('data-radius', cfg.radius);

    // 6. Layout Density
    root.setAttribute('data-density', cfg.density);
  }, []);

  // Apply on mount and state change
  useEffect(() => {
    applyCustomizerSettings(settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings, applyCustomizerSettings]);

  // Listen to system preference changes if mode === 'system'
  useEffect(() => {
    if (settings.mode !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyCustomizerSettings(settings);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [settings, applyCustomizerSettings]);

  const openCustomizer = useCallback(() => setIsOpen(true), []);
  const closeCustomizer = useCallback(() => setIsOpen(false), []);
  const toggleCustomizer = useCallback(() => setIsOpen((prev) => !prev), []);

  const setColor = useCallback((color: ThemeColorId) => {
    setSettings((prev) => ({ ...prev, color }));
  }, []);

  const setFont = useCallback((font: FontFamilyId) => {
    setSettings((prev) => ({ ...prev, font }));
  }, []);

  const setDarkSidebar = useCallback((darkSidebar: boolean) => {
    setSettings((prev) => ({ ...prev, darkSidebar }));
  }, []);

  const setDarkNavbar = useCallback((darkNavbar: boolean) => {
    setSettings((prev) => ({ ...prev, darkNavbar }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setSettings((prev) => ({ ...prev, mode }));
  }, []);

  const setRadius = useCallback((radius: BorderRadiusOption) => {
    setSettings((prev) => ({ ...prev, radius }));
  }, []);

  const setDensity = useCallback((density: LayoutDensity) => {
    setSettings((prev) => ({ ...prev, density }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_CUSTOMIZER_SETTINGS);
  }, []);

  return (
    <CustomizerContext.Provider
      value={{
        isOpen,
        openCustomizer,
        closeCustomizer,
        toggleCustomizer,
        settings,
        setColor,
        setFont,
        setDarkSidebar,
        setDarkNavbar,
        setMode,
        setRadius,
        setDensity,
        resetToDefaults,
      }}
    >
      {children}
    </CustomizerContext.Provider>
  );
};

export function useCustomizer(): CustomizerContextValue {
  const context = useContext(CustomizerContext);
  if (!context) {
    throw new Error('useCustomizer must be used within a CustomizerProvider');
  }
  return context;
}
