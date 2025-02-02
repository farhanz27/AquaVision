import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  Switch,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import auth from "@react-native-firebase/auth";
import messaging from "@react-native-firebase/messaging";
import database from "@react-native-firebase/database";
import { useTheme } from "@/context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CustomBackground } from '@/components/CustomSheetBackground';
import BackHandlerComponent from "@/components/BackHandler";
import BottomSheet, { 
  BottomSheetBackdropProps, 
  BottomSheetBackdrop, 
  BottomSheetView, 
  useBottomSheetSpringConfigs 
} from "@gorhom/bottom-sheet";

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [profile, setProfile] = useState({
    username: "Guest",
    email: "",
    devices: {},
  });
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [modalType, setModalType] = useState<"username" | "email">("username");
  const bottomSheetRef = useRef<BottomSheet>(null);
  const textInputRef = useRef<TextInput>(null);
  const snapPoints = useMemo(() => ["80%"], []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const user = auth().currentUser;

  const handleBackPress = () => {
    if (sheetOpen) {
      bottomSheetRef.current?.close(); // Close the bottom sheet
      return true; // Prevent the default back button action
    }
    return false; // Allow the default back button action
  };

  useEffect(() => {
    const userId = user?.uid;

    if (!userId) {
      Alert.alert("Error", "No user is signed in.");
      return;
    }

    const userRef = database().ref(`/users/${userId}`);

    const fetchUserProfile = userRef.on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfile({
          username: data.username || "Guest",
          email: user.email || "N/A",
          devices: data.devices || {},
        });
      } else {
        Alert.alert("Error", "User profile not found.");
      }
    });

    const fetchNotificationPreference = async () => {
      try {
        const enabled = await messaging().hasPermission();
        setNotificationsEnabled(enabled === messaging.AuthorizationStatus.AUTHORIZED);
      } catch {
        setNotificationsEnabled(false);
      }
    };

    fetchNotificationPreference();

    return () => userRef.off("value", fetchUserProfile);
  }, [user]);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await auth().signOut();
              router.replace("/"); // Redirect to login screen after sign-out
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleToggleNotifications = async (value: boolean) => {
    setToggleLoading(true);
    try {
      if (value) {
        const permission = await messaging().requestPermission();
        if (
          permission === messaging.AuthorizationStatus.AUTHORIZED ||
          permission === messaging.AuthorizationStatus.PROVISIONAL
        ) {
          const fcmToken = await messaging().getToken();
          console.log("FCM Token:", fcmToken);
        } else {
          Alert.alert("Permission Denied", "Notifications are disabled.");
          setNotificationsEnabled(false);
        }
      } else {
        console.log("Notifications disabled.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update notification preferences.");
    } finally {
      setNotificationsEnabled(value);
      setToggleLoading(false);
    }
  };

  const handleEditPress = (type: "username" | "email") => {
    setModalType(type);
    bottomSheetRef.current?.expand();
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 300); // Ensure focus after animation
  };

  const handleSave = async () => {
    Keyboard.dismiss(); // Dismiss the keyboard when saving

    if (modalType === "username" && !newUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty.");
      return;
    }

    if (modalType === "email" && !newEmail.trim()) {
      Alert.alert("Error", "Email cannot be empty.");
      return;
    }

    setLoading(true);

    try {
      if (modalType === "username") {
        const userId = user?.uid;
        if (!userId) throw new Error("User is not authenticated.");
        await database().ref(`/users/${userId}`).update({ username: newUsername });
        setProfile((prev) => ({ ...prev, username: newUsername }));
        setNewUsername("");
      } else if (modalType === "email") {
        await user?.updateEmail(newEmail);
        setProfile((prev) => ({ ...prev, email: newEmail }));
        setNewEmail("");
      }
      bottomSheetRef.current?.close();
      Alert.alert("Success", `${modalType === "username" ? "Username" : "Email"} has been updated.`);
    } catch (error) {
      Alert.alert("Error", `Failed to update ${modalType}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Keyboard.dismiss(); // Dismiss the keyboard
    bottomSheetRef.current?.close();
  };

  const handleSheetChanges = useCallback((index: number) => {
    if (index <= 0) { // When the sheet is closed or collapsed
      setNewUsername("");
      setNewEmail("");
      Keyboard.dismiss(); // Dismiss the keyboard when the sheet collapses or closes
    } else {
      setSheetOpen(index > 0);
    }
    console.log("handleSheetChange", index);
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        onPress={() => {
          Keyboard.dismiss(); // Dismiss the keyboard when the backdrop is pressed
        }}
      />
    ),
    []
  );

  const springConfigs = useBottomSheetSpringConfigs({
    damping: 80,
    overshootClamping: true,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 0.1,
    stiffness: 600,
  });

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.profileContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>My Profile</Text>
        <View style={[styles.infoRow, styles.rowSpacing]}>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Username: {profile.username}
          </Text>
          <TouchableOpacity onPress={() => handleEditPress("username")}>
            <Icon name="edit" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.infoRow, styles.rowSpacing]}>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Email: {profile.email}
          </Text>
          <TouchableOpacity onPress={() => handleEditPress("email")}>
            <Icon name="edit" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.infoRow, styles.rowSpacing]}>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Device: {Object.keys(profile.devices).join(", ") || "None"}
          </Text>
        </View>
      </View>
      <View style={styles.optionsContainer}>
        <View style={[styles.optionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.toggleContainer}>
            <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>
              Push Notifications
            </Text>
            {toggleLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                thumbColor={notificationsEnabled ? theme.colors.primary : "#f4f3f4"}
                trackColor={{ false: "#767577", true: theme.colors.primary }}
              />
            )}
          </View>
        </View>
        <View style={[styles.optionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.toggleContainer}>
            <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              thumbColor={isDarkMode ? theme.colors.primary : "#f4f3f4"}
              trackColor={{ false: "#767577", true: theme.colors.primary }}
            />
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
        onPress={handleSignOut}
      >
        <Text style={[styles.logoutText, { color: theme.colors.onError }]}>Sign Out</Text>
      </TouchableOpacity>
      <BackHandlerComponent
        onBackPress={handleBackPress}
        condition={sheetOpen} // Only active when the sheet is open
      />
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        animationConfigs={springConfigs}
        backgroundComponent={CustomBackground}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView style={[styles.bottomSheetContent]}>
          <Text
            style={[
              styles.bottomSheetTitle,
              { color: theme.colors.onSurface },
            ]}
          >
            Change {modalType === "username" ? "Username" : "Email"}
          </Text>
          <TextInput
            ref={textInputRef}
            style={[
              styles.inputNoBorder,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.onSurface,
              },
            ]}
            placeholder={`Enter new ${modalType}`}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={modalType === "username" ? newUsername : newEmail}
            onChangeText={modalType === "username" ? setNewUsername : setNewEmail}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.error },
              ]}
              onPress={handleCancel}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: theme.colors.onError },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: theme.colors.onPrimary },
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  profileContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowSpacing: {
    marginBottom: 20,
  },
  optionsContainer: {
    marginTop: 10,
  },
  optionCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    elevation: 4,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "500",
  },
  bottomSheetContent: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputNoBorder: {
    width: "100%",
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
