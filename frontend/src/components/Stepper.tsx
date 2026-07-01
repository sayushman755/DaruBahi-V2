import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius, type } from "@/src/theme/theme";

type Props = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  testID?: string;
};

export default function Stepper({ value, onChange, min = 0, max = 99999, testID }: Props) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) {
      Haptics.selectionAsync().catch(() => {});
      onChange(next);
    }
  };
  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        testID={testID ? `${testID}-minus` : undefined}
        onPress={() => step(-1)}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="remove" size={24} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.value} testID={testID ? `${testID}-value` : undefined}>{value}</Text>
      <Pressable
        testID={testID ? `${testID}-plus` : undefined}
        onPress={() => step(1)}
        style={({ pressed }) => [styles.btn, styles.plus, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="add" size={24} color={colors.onBrand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btn: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: { backgroundColor: colors.brand },
  value: {
    minWidth: 90,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: type["3xl"],
    color: colors.onSurface,
  },
});
