import React, { useContext } from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "react-native-paper";
import { NotificationsContext } from "@/context/NotificationsContext";
import { KeyboardAvoidingView } from "react-native";

export default function TabLayout() {
  const theme = useTheme();
  const { unreadCount } = useContext(NotificationsContext);

  const getTabBarIcon = (name: string, focused: boolean, color: string) => {
    const iconName = focused ? `${name}-sharp` : `${name}-outline`;
    return (
      <Ionicons
        name={iconName as React.ComponentProps<typeof Ionicons>["name"]}
        color={color}
        size={24}
      />
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        tabBarStyle: {
          position: "absolute", 
          flexDirection: 'row',
          borderTopWidth: 0, 
          backgroundColor: theme.colors.surface,
        },
        tabBarActiveTintColor: theme.colors.primary, // Active tab color
        tabBarInactiveTintColor: theme.colors.onSurface, // Inactive tab color
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => getTabBarIcon("home", focused, color),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, focused }) => getTabBarIcon("analytics", focused, color),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused }) => getTabBarIcon("notifications", focused, color),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => getTabBarIcon("settings", focused, color),
        }}
      />
    </Tabs>
  );
}
