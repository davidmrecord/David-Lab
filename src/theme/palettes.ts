export interface ColorPalette {
  name: string;
  // Core
  primary: string;
  primaryDark: string;
  primaryLight: string;
  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;
  // Text
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  // UI
  border: string;
  danger: string;
  warning: string;
  success: string;
  badge: string;
  badgeText: string;
}

export const PALETTES: Record<string, ColorPalette> = {
  Forest: {
    name: 'Forest',
    primary: '#2D6A4F',
    primaryDark: '#1B4332',
    primaryLight: '#52B788',
    background: '#F8F5F0',
    surface: '#FFFFFF',
    surfaceAlt: '#EEE9E2',
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textOnPrimary: '#FFFFFF',
    border: '#D5CFC7',
    danger: '#C0392B',
    warning: '#E67E22',
    success: '#27AE60',
    badge: '#E8F5E9',
    badgeText: '#2D6A4F',
  },
  River: {
    name: 'River',
    primary: '#2C5F7A',
    primaryDark: '#1A3D52',
    primaryLight: '#5B9BBD',
    background: '#F0F4F8',
    surface: '#FFFFFF',
    surfaceAlt: '#E2ECF4',
    text: '#1A1A2E',
    textSecondary: '#5A6A7A',
    textOnPrimary: '#FFFFFF',
    border: '#C8D8E8',
    danger: '#C0392B',
    warning: '#E67E22',
    success: '#27AE60',
    badge: '#E3F0F7',
    badgeText: '#2C5F7A',
  },
  Dusk: {
    name: 'Dusk',
    primary: '#C0703A',
    primaryDark: '#8C4E22',
    primaryLight: '#E0975C',
    background: '#FBF6F0',
    surface: '#FFFFFF',
    surfaceAlt: '#F4EDE3',
    text: '#2A1A0E',
    textSecondary: '#7A5A42',
    textOnPrimary: '#FFFFFF',
    border: '#E0CEBB',
    danger: '#B03020',
    warning: '#D4AC0D',
    success: '#2E7D52',
    badge: '#FDF0E8',
    badgeText: '#C0703A',
  },
  Desert: {
    name: 'Desert',
    primary: '#7A8C5C',
    primaryDark: '#566240',
    primaryLight: '#A8B882',
    background: '#F7F4EE',
    surface: '#FFFFFF',
    surfaceAlt: '#EDE9DF',
    text: '#2A2416',
    textSecondary: '#6B6248',
    textOnPrimary: '#FFFFFF',
    border: '#D8D0C0',
    danger: '#B83C2A',
    warning: '#C87A20',
    success: '#4A8C52',
    badge: '#EFF2E8',
    badgeText: '#7A8C5C',
  },
};

export const DEFAULT_PALETTE_NAME = 'Forest';
