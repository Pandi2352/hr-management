export type ThemeColorId =
  | 'violet'
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'purple'
  | 'teal'
  | 'slate';

export interface ThemeColorOption {
  id: ThemeColorId;
  name: string;
  primary: string;
  hover: string;
  active: string;
  lightBg: string;
  ring: string;
  badgeClass: string;
}

export type FontFamilyId =
  | 'Inter'
  | 'Plus Jakarta Sans'
  | 'Outfit'
  | 'Roboto'
  | 'Poppins';

export interface FontFamilyOption {
  id: FontFamilyId;
  name: string;
  fontFamily: string;
  description: string;
  sample: string;
}

export type BorderRadiusOption = 'sharp' | 'compact' | 'standard' | 'smooth' | 'pill';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface CustomizerSettings {
  color: ThemeColorId;
  font: FontFamilyId;
  darkSidebar: boolean;
  darkNavbar: boolean;
  mode: ThemeMode;
  radius: BorderRadiusOption;
  density: LayoutDensity;
}

export interface CustomizerContextValue {
  isOpen: boolean;
  openCustomizer: () => void;
  closeCustomizer: () => void;
  toggleCustomizer: () => void;
  settings: CustomizerSettings;
  setColor: (color: ThemeColorId) => void;
  setFont: (font: FontFamilyId) => void;
  setDarkSidebar: (val: boolean) => void;
  setDarkNavbar: (val: boolean) => void;
  setMode: (mode: ThemeMode) => void;
  setRadius: (radius: BorderRadiusOption) => void;
  setDensity: (density: LayoutDensity) => void;
  resetToDefaults: () => void;
}
