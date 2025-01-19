import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";

const commonColors = {
  error: "#EF4444", // Vibrant red for errors
  warning: "#F59E0B", // Warm amber for warnings
  safe: "#3BB273", // Calm green for success
};

// Customized theme with both light and dark modes
export const customTheme = (isDarkMode: boolean) => ({
  ...(isDarkMode ? MD3DarkTheme : MD3LightTheme),
  colors: {
    ...(isDarkMode ? MD3DarkTheme.colors : MD3LightTheme.colors),
    primary: isDarkMode ? "#3B82F6" : "#60A5FA", // Blue for primary actions
    onPrimary: isDarkMode ? "#E0F2FE" : "#FFFFFF", // Text on primary
    background: isDarkMode ? "#0F172A" : "#E0F2FE", // App background
    surface: isDarkMode ? "#1E293B" : "#F8FAFC", // Card/surface background
    onSurface: isDarkMode ? "#93C5FD" : "#1E3A8A", // Text on surfaces
    text: isDarkMode ? "#BFDBFE" : "#2563EB", // Primary text
    textSecondary: isDarkMode ? "#60A5FA" : "#3B82F6", // Secondary text
    border: isDarkMode ? "#334155" : "#BFDBFE", // Dividers and borders
    outline: isDarkMode ? "#475569" : "#93C5FD", // Outlines
    ...commonColors,
  },
});
