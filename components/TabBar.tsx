import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "react-native-paper";

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();

  const icon: Record<string, (props: any) => JSX.Element> = {
    dashboard: (props: any) => <Ionicons name="home" size={20} {...props} />,
    analytics: (props: any) => <Ionicons name="analytics" size={20} {...props} />,
    notifications: (props: any) => <Ionicons name="notifications" size={20} {...props} />,
    settings: (props: any) => <Ionicons name="settings" size={20} {...props} />,
  };

  return (
    <View style={[styles.tabbar, { backgroundColor: theme.colors.surface }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabbarItem}
          >
            {icon[route.name]({
              color: isFocused ? theme.colors.primary : theme.colors.onSurface,
            })}
            <Text
              style={{
                color: isFocused ? theme.colors.primary : theme.colors.onSurface,
                fontSize: 12,
              }}
            >
              {typeof label === "string" ? label : ""}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    elevation: 4,
    borderTopColor: "transparent",
  },
  tabbarItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
});
