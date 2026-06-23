import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { storage } from '@/services/storage';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  activeTheme: 'light' | 'dark';
  setThemePreference: (theme: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load theme from storage on mount
    storage.getItem('themePreference').then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemePreferenceState(savedTheme as ThemePreference);
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemePreference = async (theme: ThemePreference) => {
    setThemePreferenceState(theme);
    if (theme === 'system') {
      await storage.removeItem('themePreference');
    } else {
      await storage.setItem('themePreference', theme);
    }
  };

  const activeTheme = themePreference === 'system' 
    ? (deviceColorScheme === 'dark' ? 'dark' : 'light') 
    : themePreference;

  if (!isLoaded) return null; // Or a splash screen / empty view to avoid flicker

  return (
    <ThemeContext.Provider value={{ themePreference, activeTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
