import { createContext, useContext, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

export const ThemeContext = createContext({});

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.storyWorld?.colors) {
      document.documentElement.style.setProperty('--world-primary', user.storyWorld.colors.primary);
      document.documentElement.style.setProperty('--world-accent', user.storyWorld.colors.accent);
    } else {
      document.documentElement.style.setProperty('--world-primary', '#0f172a');
      document.documentElement.style.setProperty('--world-accent', '#1e293b');
    }
  }, [user]);

  return <ThemeContext.Provider value={{}}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
