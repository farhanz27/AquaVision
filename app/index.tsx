import React, { useState, useEffect } from "react";
import { ActivityIndicator, StyleSheet, View, StatusBar } from "react-native";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function Index() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((authUser) => {
      try {
        setUser(authUser);

        if (authUser) {
          console.log("User authenticated. Redirecting to dashboard...");
          router.replace("/dashboard"); // Redirect to dashboard if authenticated
        } else {
          console.log("No user authenticated. Redirecting to login...");
          router.replace("/login"); // Redirect to login if not authenticated
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
      } finally {
        setInitializing(false); // Ensure the app doesn't hang in the loading state
      }
    });

    return unsubscribe; // Clean up the subscription on unmount
  }, [router]);

  if (initializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.background}
        />
      </View>
    );
  }

  // The screen handles redirection, so we return null
  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
