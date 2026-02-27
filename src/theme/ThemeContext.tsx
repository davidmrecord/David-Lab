import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ColorPalette, DEFAULT_PALETTE_NAME, PALETTES } from './palettes';
import { getSetting, setSetting } from '../db/database';

interface ThemeContextValue {
  colors: ColorPalette;
  themeName: string;
  setTheme: (name: string) => void;
  avatarUri: string | null;
  setAvatarUri: (uri: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: PALETTES[DEFAULT_PALETTE_NAME],
  themeName: DEFAULT_PALETTE_NAME,
  setTheme: () => {},
  avatarUri: null,
  setAvatarUri: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState(DEFAULT_PALETTE_NAME);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    getSetting('theme').then(saved => {
      if (saved && PALETTES[saved]) setThemeName(saved);
    });
    getSetting('avatar_uri').then(saved => setAvatarUri(saved || null));
  }, []);

  const setTheme = useCallback((name: string) => {
    if (!PALETTES[name]) return;
    setThemeName(name);
    setSetting('theme', name);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: PALETTES[themeName], themeName, setTheme, avatarUri, setAvatarUri }),
    [themeName, setTheme, avatarUri]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
