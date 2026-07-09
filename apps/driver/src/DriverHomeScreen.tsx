import { Text, View } from "react-native";
import { driverHomeCopy } from "./DriverHomeScreen.copy";

export { driverHomeCopy };

export function DriverHomeScreen() {
  return (
    <View>
      <Text>{driverHomeCopy.title}</Text>
      <Text>{driverHomeCopy.subtitle}</Text>
    </View>
  );
}
