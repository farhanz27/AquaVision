import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MD3Theme } from "react-native-paper";
import { customTheme } from "@/constants/Colors";

type ThemeContextType = {
  theme: MD3Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");

  useEffect(() => {
    // Load the theme preference from AsyncStorage
    const loadThemePreference = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem("themePreference");
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === "dark");
        }
      } catch (error) {
        console.error("Failed to load theme preference", error);
      }
    };

    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem("themePreference", newMode ? "dark" : "light");
    } catch (error) {
      console.error("Failed to save theme preference", error);
    }
  };

  const theme = useMemo(() => customTheme(isDarkMode), [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
