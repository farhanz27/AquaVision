import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";
import { useTheme } from "react-native-paper";
import changeNavigationBarColor from "react-native-navigation-bar-color";

export default function TabLayout() {
  const theme = useTheme();

  /* // Update navigation bar color
  useEffect(() => {
    // Change navigation bar color to match the theme's surface color
    const setNavigationBarColor = async () => {
      try {
        await changeNavigationBarColor(theme.colors.surface, theme.dark); // Use `theme.dark` to set light or dark icons
      } catch (error) {
        console.error("Failed to set navigation bar color:", error);
      }
    };
    setNavigationBarColor();
  }, [theme]); */

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  );
}
