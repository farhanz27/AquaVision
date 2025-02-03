import { onValueCreated } from "firebase-functions/v2/database";
import * as admin from "firebase-admin";

admin.initializeApp({
  databaseURL: "https://final-year-project-5f26d-default-rtdb.asia-southeast1.firebasedatabase.app",
});

// Revised sensor thresholds
const SENSOR_THRESHOLDS = {
  ph: {
    danger: [0, 6.5, 9.0, 14],
    warning: [6.5, 7.0, 8.5, 9.0],
    safe: [7.0, 8.5],
  },
  tds: {
    danger: [0, 200, 1500, 3000],
    warning: [200, 300, 1000, 1500],
    safe: [300, 1000],
  },
  temperature: {
    danger: [0, 18, 32, 40],
    warning: [18, 20, 30, 32],
    safe: [20, 30],
  },
};

// Type Definitions
type SensorType = keyof typeof SENSOR_THRESHOLDS;
type SensorThresholds = { danger: number[]; warning: number[]; safe: number[] };

// Check thresholds
const checkThreshold = (sensorType: SensorType, value: number): "danger" | "warning" | "safe" => {
  const thresholds: SensorThresholds = SENSOR_THRESHOLDS[sensorType];

  // Iterate over the danger and warning ranges for all sensor types
  if (value < thresholds.danger[1] || value > thresholds.danger[2]) {
    return "danger";
  }
  if (value < thresholds.warning[1] || value > thresholds.warning[2]) {
    return "warning";
  }
  return "safe";
};

// Recommendations based on status
const getRecommendations = (sensorType: SensorType, status: "danger" | "warning"): string => {
  const recommendations = {
    ph: {
      danger: "Adjust pH using buffer solutions for acidity or alkaline-neutralizing agents for high pH.",
      warning: "Monitor pH levels and prepare corrective solutions to stabilize.",
    },
    tds: {
      danger: "Increase TDS by adding minerals or reduce high TDS with water changes and filtration.",
      warning: "Monitor and adjust TDS levels to stabilize within the optimal range.",
    },
    temperature: {
      danger: "Install appropriate heating or cooling systems to stabilize water temperature.",
      warning: "Monitor trends and activate climate control systems for intervention.",
    },
  };

  return recommendations[sensorType][status];
};

// Firebase Realtime Database trigger
export const monitorSensorData = onValueCreated(
  {
    region: "asia-southeast1",
    ref: "/devices/{deviceId}/sensors/{sensorType}/{timestamp}",
  },
  async (event) => {
    const deviceId = event.params?.deviceId || "";
    const sensorType: string = event.params?.sensorType || "";
    const value: unknown = event.data?.val();

    if (!deviceId || !(sensorType in SENSOR_THRESHOLDS) || typeof value !== "number") {
      console.error("Invalid data:", { deviceId, sensorType, value });
      return;
    }

    const typedSensor = sensorType as SensorType;
    const status = checkThreshold(typedSensor, value);

    if (status === "safe") return;

    const messageTitle =
      status === "danger" ? `❗ Critical Alert: ${typedSensor.toUpperCase()}` : `⚠️ Warning: ${typedSensor.toUpperCase()}`;
    const messageBody = `${typedSensor.toUpperCase()} level ${
      status === "danger" ? "has exceeded the optimal range" : "is approaching the unsafe limit"
    } at ${value}.\n\nRecommendation:\n${getRecommendations(typedSensor, status)}`;

    try {
      const deviceSnapshot = await admin.database().ref(`/devices/${deviceId}/userId`).once("value");
      const users = deviceSnapshot.val();

      if (!users) {
        console.error("No users found for device:", deviceId);
        return;
      }

      const notificationId = `notif_${Date.now()}`;
      const notification = {
        deviceId,
        title: messageTitle,
        body: messageBody,
        timestamp: new Date().toISOString(),
        readBy: Object.keys(users).reduce((acc, userId) => {
          acc[userId] = false;
          return acc;
        }, {} as Record<string, boolean>),
      };

      await admin.database().ref(`/notifications/${notificationId}`).set(notification);
      console.log("Notification saved:", notificationId);

      const message = {
        topic: `device-${deviceId}`,
        notification: {
          title: messageTitle,
          body: messageBody,
        },
        data: {
          sensorType: typedSensor,
          value: value.toString(),
          status,
          timestamp: new Date().toISOString(),
        },
      };

      await admin.messaging().send(message);
      console.log("FCM notification sent to device topic:", `device-${deviceId}`);
    } catch (error) {
      console.error("Error processing sensor data:", error);
    }
  }
);
