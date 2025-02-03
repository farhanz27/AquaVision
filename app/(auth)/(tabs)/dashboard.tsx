import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet, Alert } from "react-native";
import { useTheme } from "react-native-paper";
import auth from "@react-native-firebase/auth";
import database from "@react-native-firebase/database";
import Icon from "react-native-vector-icons/MaterialIcons";

type SensorData = {
  value: number;
  timestamp: string;
};

type Prediction = {
  percentChange: number;
  trend: string;
};

const SENSOR_THRESHOLDS = {
  ph: {
    danger: [0, 6.0, 9.5, 14],
    warning: [6.0, 7.0, 8.0, 9.5],
    safe: [7.0, 8.0],
  },
  tds: {
    danger: [0, 200, 1500, 3000],
    warning: [200, 300, 1000, 1500],
    safe: [300, 1000],
  },
  temperature: {
    danger: [0, 10, 35, 40],
    warning: [10, 20, 30, 35],
    safe: [20, 30],
  },
};

// Helper to determine status colors
const getStatusColor = (theme: any, sensor: string, value: number) => {
  const thresholds = SENSOR_THRESHOLDS[sensor as keyof typeof SENSOR_THRESHOLDS];
  if (!thresholds) return theme.colors.safe;

  if (value < thresholds.danger[1] || value > thresholds.danger[2]) return theme.colors.error;
  if (value < thresholds.warning[1] || value > thresholds.warning[2]) return theme.colors.warning;
  return theme.colors.safe;
};

// Helper to get unit for each sensor
const getUnit = (sensor: string) => {
  switch (sensor) {
    case "ph":
      return "";
    case "tds":
      return "ppm";
    case "temperature":
      return "°C";
    default:
      return "";
  }
};

// Calculate simple moving average prediction
const calculatePrediction = (data: number[]): Prediction => {
  if (data.length < 2) return { percentChange: 0, trend: "stable" };

  const lastValue = data[data.length - 1];
  const secondLastValue = data[data.length - 2];
  const percentChange = ((lastValue - secondLastValue) / secondLastValue) * 100;

  return {
    percentChange,
    trend: percentChange > 0 ? "increase" : percentChange < 0 ? "decrease" : "stable",
  };
};

const SensorCard = ({ sensor, value, timestamp, prediction }: { sensor: string; value: number; timestamp: string; prediction: Prediction }) => {
  const theme = useTheme();
  const statusColor = getStatusColor(theme, sensor, value);
  const unit = getUnit(sensor);

  const getSensorDescription = (sensor: string) => {
    switch (sensor) {
      case "tds":
        return "Total Dissolved Solids";
      case "temperature":
        return "Temperature";
      case "ph":
        return "pH Level";
      default:
        return "";
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "increase") return "trending-up";
    if (trend === "decrease") return "trending-down";
    return "trending-neutral";
  };

  const getTrendMessage = (trend: string, percentChange: number) => {
    if (trend === "stable") return "Expected to be stable";
    return `Expected to ${trend} by ${Math.abs(percentChange).toFixed(1)}%`;
  };

  return (
    <View
      style={[
        styles.sensorCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <View style={styles.topSection}>
        <Icon
          name={sensor === "ph" ? "science" : sensor === "temperature" ? "thermostat" : "opacity"}
          size={32}
          color={theme.colors.primary}
          style={styles.sensorIcon}
        />
        <Text style={[styles.sensorTitle, { color: theme.colors.onSurface }]}>
          {getSensorDescription(sensor)}
        </Text>
      </View>

      <View style={[styles.circleContainer, { borderColor: statusColor }]}>
        <Text style={[styles.circleText, { color: theme.colors.onSurface }]}>
          {value.toFixed(1)} {unit}
        </Text>
      </View>

      <View style={styles.trendSection}>
        <Text style={[styles.predictionText, { color: theme.colors.onSurface }]}>
          {getTrendMessage(prediction.trend, prediction.percentChange)}
        </Text>
        <Icon name={getTrendIcon(prediction.trend)} size={20} color={theme.colors.onSurface} />
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const theme = useTheme();
  const [sensorData, setSensorData] = useState<Record<string, Record<string, SensorData[]>>>({});
  const [predictions, setPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [deviceIds, setDeviceIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchDeviceIds = async () => {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert("Error", "No user is signed in.");
        return;
      }

      try {
        const userSnapshot = await database().ref(`/users/${currentUser.uid}/devices`).once("value");
        const devices = userSnapshot.val();
        if (!devices) {
          Alert.alert("Error", "No devices found for this user.");
          return;
        }

        setDeviceIds(Object.keys(devices));
      } catch (error) {
        console.error("Error fetching devices:", error);
        Alert.alert("Error", "Failed to fetch device data.");
      }
    };

    fetchDeviceIds();
  }, []);

  useEffect(() => {
    const listeners: (() => void)[] = [];

    deviceIds.forEach((deviceId) => {
      const sensorRef = database().ref(`/devices/${deviceId}/sensors`);
      const listener = sensorRef.on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const latestData: Record<string, SensorData[]> = {};
          const predictionData: Record<string, Prediction> = {};

          Object.keys(data).forEach((sensor) => {
            const entries = data[sensor];
            const sensorValues: number[] = Object.values(entries).map((entry: any) => parseFloat(entry));
            const sensorTimestamps: string[] = Object.keys(entries);

            // Sort timestamps to find the latest entry
            const sortedTimestamps = sensorTimestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            const latestTimestamp = sortedTimestamps[0];
            const latestValue = entries[latestTimestamp];

            latestData[sensor] = [{ value: latestValue, timestamp: latestTimestamp }];

            predictionData[sensor] = calculatePrediction(sensorValues);
          });

          setSensorData((prev) => ({
            ...prev,
            [deviceId]: {
              ...(prev[deviceId] || {}),
              ...latestData,
            },
          }));

          setPredictions((prev) => ({
            ...prev,
            [deviceId]: {
              ...(prev[deviceId] || {}),
              ...predictionData,
            },
          }));
        }
      });

      listeners.push(() => sensorRef.off("value", listener));
    });

    return () => {
      listeners.forEach((unsub) => unsub());
    };
  }, [deviceIds]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {deviceIds.length ? (
        deviceIds.map((deviceId) =>
          Object.keys(sensorData[deviceId] || {}).map((sensor) => {
            const sensorValues = sensorData[deviceId]?.[sensor] || [];
            const latestSensor = sensorValues[sensorValues.length - 1];
            const prediction = predictions[deviceId]?.[sensor] || { percentChange: 0, trend: "stable" };

            return (
              <SensorCard
                key={`${deviceId}-${sensor}`}
                sensor={sensor}
                value={latestSensor.value}
                timestamp={latestSensor.timestamp}
                prediction={prediction}
              />
            );
          })
        )
      ) : (
        <Text style={[styles.loadingText, { color: theme.colors.primary }]}>Loading data...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  sensorCard: {
    flexDirection: "column",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    elevation: 4,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  sensorIcon: {
    marginRight: 10,
  },
  sensorTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  circleContainer: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  circleText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  trendSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  predictionText: {
    fontSize: 14,
    marginRight: 5,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 50,
  },
});
