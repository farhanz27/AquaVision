import React, { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import auth from "@react-native-firebase/auth";
import database from "@react-native-firebase/database";
import { useTheme } from "react-native-paper";

export default function Register() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateInputs = () => {
    if (!username.trim() || !deviceId.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert("Error", "Invalid email format.");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return false;
    }

    return true;
  };

  const signUp = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const deviceSnapshot = await database().ref(`/devices/${deviceId}`).once("value");
      if (!deviceSnapshot.exists()) {
        Alert.alert("Error", "Invalid Device ID.");
        setLoading(false);
        return;
      }

      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const userId = userCredential.user.uid;

      // Update the users node
      await database().ref(`/users/${userId}`).set({
        username,
        email,
        devices: {
          [deviceId]: true,
        },
      });

      // Update the devices node
      await database().ref(`/devices/${deviceId}/userId/${userId}`).set(true);

      await userCredential.user.sendEmailVerification();
      Alert.alert("Success", "Account created! Please verify your email.");
      router.replace("/"); // Redirect to login
    } catch (e: any) {
      const errorMessage =
        e.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : e.code === "auth/weak-password"
          ? "Password should be at least 6 characters."
          : "An error occurred. Please try again.";
      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>Create Account</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                color: theme.colors.onSurface,
              },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={theme.colors.onSurfaceVariant}
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
            value={deviceId}
            onChangeText={setDeviceId}
            placeholder="Device ID"
            placeholderTextColor={theme.colors.onSurfaceVariant}
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
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={theme.colors.onSurfaceVariant}
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
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={signUp}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>Register</Text>
            </TouchableOpacity>
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
});
