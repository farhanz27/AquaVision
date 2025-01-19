import messaging from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

// Event emitter to notify components about changes
const notificationListeners: ((notifications: any[]) => void)[] = [];

/**
 * Request notification permissions from the user.
 */
export async function requestNotificationPermission() {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log("Notification permissions granted.");
      return true;
    } else {
      Alert.alert(
        "Permissions Denied",
        "Notifications are disabled. Please enable them in your device settings."
      );
      return false;
    }
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    Alert.alert("Error", "An error occurred while requesting notification permissions.");
    return false;
  }
}

/**
 * Subscribe the device to a specific topic.
 * @param topic Topic name (e.g., 'sensor-alerts')
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
 * Handle foreground notifications.
 */
export function handleForegroundMessages() {
  try {
    messaging().onMessage(async (remoteMessage) => {
      console.log("Foreground message received:", remoteMessage);
      await saveNotification(remoteMessage);
      Alert.alert(
        remoteMessage.notification?.title || "Notification",
        remoteMessage.notification?.body || "You have a new message."
      );
    });
  } catch (error) {
    console.error("Error handling foreground messages:", error);
  }
}

/**
 * Handle background notifications.
 */
export function handleBackgroundMessages() {
  try {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("Background message received:", remoteMessage);
      await saveNotification(remoteMessage);
    });
  } catch (error) {
    console.error("Error handling background messages:", error);
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
