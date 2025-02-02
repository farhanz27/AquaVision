import React, { useEffect } from "react";
import { BackHandler } from "react-native";

interface BackHandlerProps {
  onBackPress: () => boolean; // Callback function to handle the back press
  condition?: boolean;       // Optional condition to control when the handler is active
}

const BackHandlerComponent: React.FC<BackHandlerProps> = ({ onBackPress, condition = true }) => {
  useEffect(() => {
    if (!condition) return;

    const handleBackPress = () => {
      return onBackPress(); // Invoke the provided callback
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", handleBackPress);

    return () => backHandler.remove(); // Cleanup the listener
  }, [onBackPress, condition]);

  return null; // This component doesn't render anything
};

export default BackHandlerComponent;
