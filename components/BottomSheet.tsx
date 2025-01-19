import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

type BottomSheetProps = {
  setStatus: (status: boolean) => void;
  children: React.ReactNode;
  title?: string;
  visible: boolean;
  height?: number | string;
  titleStyle?: object;
  containerStyle?: object;
  backdropPressToClose?: boolean;
  radius?: number;
  onClose?: () => void;
};

const BottomSheet: React.FC<BottomSheetProps> = ({
  setStatus,
  children,
  title,
  visible,
  height = "50%",
  titleStyle,
  containerStyle,
  backdropPressToClose = true,
  radius = 20,
  onClose,
}) => {
  const { theme } = useTheme();
  const screenHeight = Dimensions.get("window").height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Handle visibility changes with animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, screenHeight, slideAnim]);

  // Close the bottom sheet
  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setStatus(false);
      if (onClose) onClose(); // Clear input field or execute callback
    });
  }, [screenHeight, setStatus, slideAnim, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={closeSheet}
      statusBarTranslucent={true}
    >
      <View style={[styles.overlay, { backgroundColor: theme.colors.backdrop }]}>
        {backdropPressToClose && (
          <Pressable
            style={styles.dismissArea}
            onPress={closeSheet}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close bottom sheet"
          />
        )}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY: slideAnim }],
              height,
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
            },
            containerStyle,
          ]}
        >
          {title && (
            <Text
              style={[
                styles.title,
                { color: theme.colors.onSurface },
                titleStyle,
              ]}
            >
              {title}
            </Text>
          )}
          <ScrollView
            style={styles.sheetContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {React.Children.map(children, (child) => (
              <View style={styles.optionContainer}>{child}</View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 15,
  },
  sheetContent: {
    paddingHorizontal: 20,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  optionContainer: {
    paddingVertical: 5,
    justifyContent: "center",
  },
});

export default BottomSheet;
