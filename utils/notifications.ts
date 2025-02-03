import { Alert, Platform, PermissionsAndroid, Linking, AppRegistry } from "react-native";
import messaging from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Event listeners to notify components about notification updates
const notificationListeners: ((notifications: any[]) => void)[] = [];
let isHeadlessTaskRegistered = false;

/**
 * Request notification permission (Android-specific).
 * For iOS, Firebase Messaging handles this.
 */
export async function requestNotificationPermission() {
  if (Platform.OS === "android") {
    try {
      // Check if permission is already granted
      const isGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (isGranted) {
        console.log("Notification permission already granted.");
        return true;
      }

      // Request permission
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notification Permission",
          message:
            "This app needs access to notifications so you can stay updated.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );

      if (status === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Notification permission granted.");
        return true;
      } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          "Permission Required",
          "You have permanently denied notification permissions. Please enable them in your device settings."
        );
      } else {
        Alert.alert(
          "Permission Denied",
          "Notification permissions are required for updates. Please enable them in your device settings."
        );
      }

      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  console.log("Notification permissions are handled automatically on this platform.");
  return true;
}

/**
 * Subscribe the device to a specific topic.
 * @param topic Topic name (e.g., 'sensor-alerts').
 */
export async function subscribeToTopic(topic: string) {
  try {
    await messaging().subscribeToTopic(topic);
    console.log(`Successfully subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`Error subscribing to topic "${topic}":`, error);
  }
}

/**
 * Unsubscribe the device from a specific topic.
 * @param topic Topic name.
 */
export async function unsubscribeFromTopic(topic: string) {
  try {
    await messaging().unsubscribeFromTopic(topic);
    console.log(`Successfully unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error(`Error unsubscribing from topic "${topic}":`, error);
  }
}

/**
 * Save a notification to AsyncStorage and notify listeners.
 * @param notification The incoming notification object.
 */
export async function saveNotification(notification: any) {
  try {
    const storedNotifications = (await AsyncStorage.getItem("notifications")) || "[]";
    const notifications = JSON.parse(storedNotifications);

    notifications.unshift({
      id: Date.now().toString(),
      title: notification.notification?.title || "Notification",
      body: notification.notification?.body || "",
      timestamp: new Date().toLocaleString(),
    });

    await AsyncStorage.setItem("notifications", JSON.stringify(notifications));

    // Notify all listeners
    notificationListeners.forEach((listener) => listener(notifications));
  } catch (error) {
    console.error("Error saving notification:", error);
  }
}

/**
 * Retrieve all stored notifications from AsyncStorage.
 */
export async function getStoredNotifications() {
  try {
    const storedNotifications = (await AsyncStorage.getItem("notifications")) || "[]";
    return JSON.parse(storedNotifications);
  } catch (error) {
    console.error("Error retrieving stored notifications:", error);
    return [];
  }
}

/**
 * Handle foreground notifications.
 */
export function handleForegroundMessages() {
  messaging().onMessage(async (remoteMessage) => {
    console.log("Foreground message received:", remoteMessage);
    await saveNotification(remoteMessage);

    /* Alert.alert(
      remoteMessage.notification?.title || "Notification",
      remoteMessage.notification?.body || "You have a new message."
    ); */
  });
}

/**
 * Handle background notifications.
 */
export function handleBackgroundMessages() {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("Background message received:", remoteMessage);
    await saveNotification(remoteMessage);
  });

  if (!isHeadlessTaskRegistered) {
    AppRegistry.registerHeadlessTask(
      "ReactNativeFirebaseMessagingHeadlessTask",
      () => async (remoteMessage) => {
        console.log("Headless background message received:", remoteMessage);
        await saveNotification(remoteMessage);
        return Promise.resolve();
      }
    );
    isHeadlessTaskRegistered = true;
  }
}

/**
 * Register a listener to get real-time updates for notifications.
 * @param listener A callback function to handle notification updates.
 */
export function addNotificationListener(listener: (notifications: any[]) => void) {
  notificationListeners.push(listener);
}

/**
 * Remove a notification listener.
 * @param listener A callback function to remove from the listeners.
 */
export function removeNotificationListener(listener: (notifications: any[]) => void) {
  const index = notificationListeners.indexOf(listener);
  if (index !== -1) {
    notificationListeners.splice(index, 1);
  }
}

/**
 * Open the app's notification settings in the system settings.
 */
export function openAppNotificationSettings() {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:");
  } else {
    Linking.openSettings();
  }
}
