import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import auth from "@react-native-firebase/auth";
import database from "@react-native-firebase/database";
import { LineChart } from "react-native-gifted-charts";
import { useTheme } from "react-native-paper";
import BottomSheet from "@/components/BottomSheet";

export default function AnalyticsScreen() {
  const theme = useTheme();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState<Record<
    string,
    {
      dataPoints: { value: number; label: string }[];
      summary: { min: number; max: number; avg: number };
    }
  >>({
    ph: { dataPoints: [], summary: { min: 0, max: 0, avg: 0 } },
    temperature: { dataPoints: [], summary: { min: 0, max: 0, avg: 0 } },
    tds: { dataPoints: [], summary: { min: 0, max: 0, avg: 0 } },
  });
  const [activeFilter, setActiveFilter] = useState<"month" | "year" | null>(null);


  const MONTHS = [
    { label: "January", value: 0 },
    { label: "February", value: 1 },
    { label: "March", value: 2 },
    { label: "April", value: 3 },
    { label: "May", value: 4 },
    { label: "June", value: 5 },
    { label: "July", value: 6 },
    { label: "August", value: 7 },
    { label: "September", value: 8 },
    { label: "October", value: 9 },
    { label: "November", value: 10 },
    { label: "December", value: 11 },
  ];

  const YEARS = [
    { label: "2024", value: 2024 },
    { label: "2025", value: 2025 },
  ];

  const handleFilterSelect = (value: number) => {
    if (activeFilter === "month") setMonth(value);
    else if (activeFilter === "year") setYear(value);
    setActiveFilter(null);
  };

  useEffect(() => {
    const fetchDeviceIds = async () => {
      const currentUser = auth().currentUser;

      if (!currentUser) {
        Alert.alert("Error", "No user is signed in.");
        setLoading(false);
        return;
      }

      try {
        const userId = currentUser.uid;
        const userSnapshot = await database().ref(`/users/${userId}/devices`).once("value");
        const devices = userSnapshot.val();

        if (!devices) {
          Alert.alert("Error", "No devices found for this user.");
          setLoading(false);
          return;
        }

        setDeviceIds(Object.keys(devices));
      } catch (error) {
        Alert.alert("Error", "Failed to fetch device IDs.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceIds();
  }, []);

  useEffect(() => {
    if (!deviceIds.length) return;

    const listeners: (() => void)[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const newSensorData = { ...sensorData };

    deviceIds.forEach((deviceId) => {
      const deviceRef = database().ref(`/devices/${deviceId}/sensors`);

      const listener = deviceRef.on("value", (snapshot) => {
        const data = snapshot.val();

        if (data) {
          Object.keys(data).forEach((sensor) => {
            const rawData = data[sensor];
            const dailyData: Record<number, number[]> = {};

            Object.keys(rawData).forEach((timestamp) => {
              const date = new Date(timestamp);
              const entryYear = date.getFullYear();
              const entryMonth = date.getMonth();
              const entryDay = date.getDate();

              if (entryYear === year && entryMonth === month) {
                if (!dailyData[entryDay]) {
                  dailyData[entryDay] = [];
                }
                dailyData[entryDay].push(parseFloat(rawData[timestamp]));
              }
            });

            const chartData = [];
            const allValues = [];
            for (let day = 1; day <= daysInMonth; day++) {
              const values = dailyData[day] || [];
              const average =
                values.length > 0
                  ? values.reduce((sum, val) => sum + val, 0) / values.length
                  : 0;

              chartData.push({ value: average || 0, label: day.toString() });
              allValues.push(...values);
            }

            const min = Math.min(...allValues);
            const max = Math.max(...allValues);
            const avg =
              allValues.length > 0
                ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length
                : 0;

            newSensorData[sensor] = {
              dataPoints: chartData,
              summary: { min, max, avg },
            };
          });

          setSensorData({ ...newSensorData });
        }
      });

      listeners.push(() => deviceRef.off("value", listener));
    });

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, [deviceIds, month, year]);

  const renderChart = useCallback(
    ({ item }: { item: { title: string; data: { value: number; label: string }[]; summary: any } }) => {
      const validatedData = item.data.map((point) => ({
        value: typeof point.value === "number" ? point.value : 0,
        label: typeof point.label === "string" ? point.label : "",
      }));

      // Find the maximum value from the dataset
      const maxValue = Math.max(...validatedData.map((item) => item.value));

      // Ensure the Y-axis max value is 10 units above the maximum data point
      const chartMaxValue = Math.ceil(maxValue + 10);
  
      return (
        <View
          style={[
            styles.chartContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            <LineChart
              data={validatedData}
              width={Math.max(600, validatedData.length * 41)}
              height={180}
              noOfSections={4}
              initialSpacing={20}
              endSpacing={40}
              spacing={40}
              areaChart
              //focusEnabled
              showTextOnFocus
              color={theme.colors.primary}
              startFillColor={theme.colors.primary}
              endFillColor={theme.colors.primary}
              startOpacity={0.4}
              endOpacity={0.2}
              dataPointsColor={theme.colors.primary}
              dataPointsShape="circle"
              dataPointsRadius={5}
              xAxisLabelTextStyle={{ color: theme.colors.onSurface, fontSize: 12 }}
              yAxisTextStyle={{ color: theme.colors.onSurface, fontSize: 12 }}
              maxValue={chartMaxValue}
              pointerConfig={{
                pointerStripUptoDataPoint: true,
                pointerStripColor: theme.colors.primary,
                pointerStripWidth: 1,
                strokeDashArray: [5, 5],
                pointerColor: theme.colors.onSurface,
                radius: 5,
                pointerLabelWidth: 70,
                pointerLabelHeight: 45,
                //shiftPointerLabelY: -15,
                //shiftPointerLabelX: -25,
                persistPointer: true,
                //activatePointersInstantlyOnTouch: true,
                //activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: { value: number; label: string }[]) => {
                  return (
                    <View
                      style={{
                        height: 40,
                        width: 70,
                        backgroundColor: theme.colors.surface,
                        borderRadius: 5,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 8,
                        borderColor: theme.colors.outline,
                        borderWidth: 2,
                      }}
                    >
                      {items.map((item, index) => (
                        <View key={index} style={{ alignItems: 'center' }}>
                          <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 }}>
                            {item.value.toFixed(3)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                },
              }}
            />
          </ScrollView>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.onSurface }]}>Min</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                {isFinite(item.summary.min) ? item.summary.min.toFixed(2) : "0.00"}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.onSurface }]}>Max</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                {isFinite(item.summary.max) ? item.summary.max.toFixed(2) : "0.00"}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.onSurface }]}>Avg</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                {isFinite(item.summary.avg) ? item.summary.avg.toFixed(2) : "0.00"}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [theme]
  );
  

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.filterContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Filter</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
            onPress={() => setActiveFilter("month")}
          >
            <Text style={[styles.filterButtonText, { color: theme.colors.primary }]}>
              {MONTHS.find((m) => m.value === month)?.label || "Month"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
            onPress={() => setActiveFilter("year")}
          >
            <Text style={[styles.filterButtonText, { color: theme.colors.primary }]}>
              {YEARS.find((y) => y.value === year)?.label || "Year"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={[
          { title: "Temperature (°C)", data: sensorData.temperature.dataPoints, summary: sensorData.temperature.summary },
          { title: "pH Level", data: sensorData.ph.dataPoints, summary: sensorData.ph.summary },
          { title: "Total Dissolved Solids (ppm)", data: sensorData.tds.dataPoints, summary: sensorData.tds.summary },
        ]}
        keyExtractor={(item) => item.title}
        renderItem={renderChart}
        contentContainerStyle={styles.listContent}
      />
      {activeFilter && (
        <BottomSheet
          visible={!!activeFilter}
          setStatus={() => setActiveFilter(null)}
          title={activeFilter === "month" ? "Select Month" : "Select Year"}
        >
          {(activeFilter === "month" ? MONTHS : YEARS).map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleFilterSelect(option.value)}
            >
              <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </BottomSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 40,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 40,
  },
  filterContainer: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    marginBottom: 14,
    elevation: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  filterButton: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
    flex: 1,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  chartContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  option: {
    padding: 15,
  },
  optionText: {
    fontSize: 16,
  },
});
