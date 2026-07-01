import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing, shadow, type } from "@/src/theme/theme";

type ToastType = "success" | "error" | "info";
type ToastState = { show: (msg: string, type?: ToastType) => void };

const ToastContext = createContext<ToastState>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const show = useCallback(
    (m: string, t: ToastType = "info") => {
      setMsg(m);
      setType(t);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 220, useNativeDriver: true }),
        ]).start();
      }, 2600);
    },
    [opacity, translateY]
  );

  const bg = type === "success" ? colors.success : type === "error" ? colors.error : colors.inverse;
  const icon = type === "success" ? "checkmark-circle" : type === "error" ? "alert-circle" : "information-circle";

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.wrap, { top: insets.top + spacing.sm, opacity, transform: [{ translateY }] }]}
      >
        {msg ? (
          <View style={[styles.toast, { backgroundColor: bg }]} testID="toast">
            <Ionicons name={icon as any} size={20} color="#fff" />
            <Text style={styles.text}>{msg}</Text>
          </View>
        ) : null}
      </Animated.View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center", zIndex: 9999 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...shadow,
  },
  text: { color: "#fff", fontFamily: fonts.semibold, fontSize: type.base, flexShrink: 1 },
});
