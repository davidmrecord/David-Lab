// Static fallback — Forest palette constants.
// Used ONLY in App.tsx before ThemeProvider mounts.
// Do NOT import this into any screen file — use useTheme() instead.

export const COLORS = {
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
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
};

export const FONT = {
  regular: 400 as const,
  medium: 500 as const,
  semibold: 600 as const,
  bold: 700 as const,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
};
