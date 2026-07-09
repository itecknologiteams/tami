import { Text, View } from "react-native";
import { riderHomeCopy } from "./HomeScreen.copy";

export { riderHomeCopy };

export function HomeScreen() {
  return (
    <View>
      <Text>{riderHomeCopy.title}</Text>
      <Text>{riderHomeCopy.subtitle}</Text>
    </View>
  );
}
