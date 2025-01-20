import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import auth from "@react-native-firebase/auth";
import database from "@react-native-firebase/database";
import {
  requestNotificationPermission,
  subscribeToTopic,
  handleForegroundMessages,
  handleBackgroundMessages,
} from "@/utils/notifications"; // Import FCM utilities
import { useTheme } from "react-native-paper";

export default function Login() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Login function
  const signIn = async () => {
    setLoading(true);
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (user.emailVerified) {
        console.log("Email verified. Fetching user data...");
        const userSnapshot = await database().ref(`/users/${user.uid}`).once("value");
        if (!userSnapshot.exists()) {
          throw new Error("User data not found. Please contact support.");
        }

        const userData = userSnapshot.val();
        console.log("User data fetched:", userData);

        // Request notification permission and initialize FCM
        await initializeFCM(user.uid, userData.devices);

        // Navigate to the dashboard
        router.replace("/dashboard");
      } else {
        await auth().signOut();
        Alert.alert("Email Not Verified", "Please verify your email before logging in.");
      }
    } catch (error: any) {
      const errorMessage =
        error.code === "auth/wrong-password"
          ? "Incorrect password. Please try again."
          : error.code === "auth/user-not-found"
          ? "No user found with this email. Please sign up."
          : "An error occurred. Please try again.";
      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // FCM initialization
  const initializeFCM = async (userId: string, devices: Record<string, boolean>) => {
    try {
      const permissionGranted = await requestNotificationPermission();
      if (!permissionGranted) {
        console.warn("Notification permission not granted.");
        Alert.alert(
          "Notification Permission",
          "Enable notifications for a better experience in the app."
        );
        return;
      }

      // Subscribe to user-specific topic
      await subscribeToTopic(`user-${userId}`);
      console.log(`Subscribed to topic: user-${userId}`);

      // Subscribe to device-specific topics
      for (const deviceId in devices) {
        await subscribeToTopic(`device-${deviceId}`);
        console.log(`Subscribed to topic: device-${deviceId}`);
      }

      // Initialize message handling
      handleForegroundMessages();
      handleBackgroundMessages();
      console.log("FCM initialized successfully.");
    } catch (error) {
      console.error("Error initializing FCM:", error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>AquaVision</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          secureTextEntry
          editable={!loading}
        />
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={signIn}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.signupButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => router.push("/register")}
            >
              <Text style={[styles.signupButtonText, { color: theme.colors.primary }]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  keyboard: {
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  signupButton: {
    borderWidth: 1,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
