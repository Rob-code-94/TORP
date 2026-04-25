import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AdminTheme = 'dark' | 'light';

interface AdminThemeContextValue {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'torp.admin.theme';

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function readStoredTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export const AdminThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AdminTheme>(() => readStoredTheme());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo<AdminThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  );

  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
};

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error('useAdminTheme must be used inside AdminThemeProvider');
  }
  return ctx;
}
