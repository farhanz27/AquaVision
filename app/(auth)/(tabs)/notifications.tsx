import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import database from "@react-native-firebase/database";
import auth from "@react-native-firebase/auth";
import BottomSheet from "@/components/BottomSheet";

type Notification = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  readBy: { [userId: string]: boolean };
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const currentUserId = auth().currentUser?.uid;

  // Fetch notifications from Firebase in real-time
  useEffect(() => {
    const notificationsRef = database().ref("/notifications");
    const onValueChange = notificationsRef.on("value", (snapshot) => {
      const data = snapshot.val() || {};
      const fetchedNotifications = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      setNotifications(fetchedNotifications);
    });

    return () => notificationsRef.off("value", onValueChange);
  }, []);

  // Mark a notification as read
  const markAsRead = useCallback(
    async (id: string) => {
      if (!currentUserId) return;
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.readBy?.[currentUserId]) {
        await database()
          .ref(`/notifications/${id}/readBy/${currentUserId}`)
          .set(true);
      }
    },
    [notifications, currentUserId]
  );

  // Delete a notification
  const deleteNotification = useCallback(
    async (id: string) => {
      Alert.alert(
        "Delete Notification",
        "Are you sure you want to delete this notification?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await database().ref(`/notifications/${id}`).remove();
              setNotifications((prev) => prev.filter((n) => n.id !== id));
            },
          },
        ]
      );
    },
    []
  );

  const openBottomSheet = useCallback(
    (notification: Notification) => {
      setSelectedNotification(notification);
      setBottomSheetVisible(true);
      markAsRead(notification.id);
    },
    [markAsRead]
  );

  const closeBottomSheet = () => {
    setSelectedNotification(null);
    setBottomSheetVisible(false);
  };

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => {
      const isRead = currentUserId ? item.readBy?.[currentUserId] : undefined;
      return (
        <View
          style={[
            styles.notificationCard,
            {
              backgroundColor: isRead
                ? theme.colors.surface
                : theme.colors.primaryContainer,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => openBottomSheet(item)}
            style={{ flex: 1 }}
            accessibilityLabel={`Notification ${item.title}`}
          >
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: isRead ? theme.colors.onSurface : theme.colors.onPrimaryContainer,
                },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.notificationBody,
                { color: theme.colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {item.body}
            </Text>
            <Text style={[styles.notificationTime, { color: theme.colors.onSurfaceVariant }]}>
              {item.timestamp}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteNotification(item.id)}
            style={styles.deleteButton}
            accessibilityLabel={`Delete notification ${item.title}`}
          >
            <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      );
    },
    [theme, currentUserId, openBottomSheet, deleteNotification]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderNotification}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="bell-outline"
            size={47}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={[styles.noNotifications, { color: theme.colors.onSurfaceVariant }]}>
            No notifications available.
          </Text>
        </View>
      )}

      {/* Bottom Sheet for Expanded Notification View */}
      <BottomSheet
        setStatus={setBottomSheetVisible}
        visible={bottomSheetVisible}
        title={selectedNotification?.title}
        onClose={closeBottomSheet}
        //height="50%"
      >
        <Text style={[styles.bottomSheetBody, { color: theme.colors.onSurfaceVariant }]}>
          {selectedNotification?.body}
        </Text>
        <Text style={[styles.bottomSheetTime, { color: theme.colors.onSurfaceVariant }]}>
          {selectedNotification?.timestamp}
        </Text>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 20,
    marginBottom: 35
  },
  listContent: {
    paddingHorizontal: 10,
  },
  notificationCard: {
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    elevation: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  notificationBody: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    marginTop: 6,
  },
  noNotifications: {
    fontSize: 16,
    marginTop: 20,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    marginLeft: 15,
  },
  bottomSheetBody: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  bottomSheetTime: {
    fontSize: 14,
    color: "#888",
  },
});
