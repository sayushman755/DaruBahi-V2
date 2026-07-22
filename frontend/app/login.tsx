import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import Button from "@/src/components/Button";
import { colors, fonts, radius, spacing, type } from "@/src/theme/theme";

const HERO =
  "https://images.unsplash.com/photo-1671713682331-98086e7b9804?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

type Mode = "login" | "signup";

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (phone.trim().length < 10) {
      toast.show("Enter a valid 10-digit mobile number", "error");
      return;
    }
    if (password.length < 6) {
      toast.show("Password must be at least 6 characters", "error");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      toast.show("Passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const { is_new_user } =
        mode === "signup"
          ? await register(phone.trim(), password)
          : await login(phone.trim(), password);
      toast.show(mode === "signup" ? "Account created" : "Welcome back", "success");
      if (is_new_user) router.replace("/setup");
      else router.replace("/(tabs)");
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      <LinearGradient
        colors={["rgba(28,25,23,0.35)", "rgba(28,25,23,0.85)", "rgba(28,25,23,0.98)"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.brandWrap, { paddingTop: insets.top + 60 }]}>
            <Text style={styles.brand}>DaruBahi</Text>
            <Text style={styles.brandSub}>Hisaab Haathon Mein.</Text>
          </View>

          <View style={[styles.card, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.tabs}>
              <Pressable
                testID="tab-login"
                onPress={() => setMode("login")}
                style={[styles.tab, mode === "login" && styles.tabActive]}
              >
                <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>
                  Sign in
                </Text>
              </Pressable>
              <Pressable
                testID="tab-signup"
                onPress={() => setMode("signup")}
                style={[styles.tab, mode === "signup" && styles.tabActive]}
              >
                <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
                  Sign up
                </Text>
              </Pressable>
            </View>

            <Text style={styles.title}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signup"
                ? "Sign up with your mobile number and a password."
                : "Log in with your mobile number and password."}
            </Text>

            <Text style={styles.label}>Mobile number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.cc}>
                <Text style={styles.ccText}>+91</Text>
              </View>
              <TextInput
                testID="phone-input"
                style={styles.phoneInput}
                placeholder="98765 43210"
                placeholderTextColor={colors.onSurfaceMuted}
                keyboardType="number-pad"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
                maxLength={10}
                autoComplete="tel"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.pwRow}>
              <TextInput
                testID="password-input"
                style={styles.pwInput}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.onSurfaceMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoComplete={mode === "signup" ? "password-new" : "password"}
              />
              <Pressable
                testID="toggle-password"
                onPress={() => setShowPw((v) => !v)}
                hitSlop={12}
                style={styles.eye}
              >
                <Ionicons
                  name={showPw ? "eye-off" : "eye"}
                  size={20}
                  color={colors.onSurfaceMuted}
                />
              </Pressable>
            </View>

            {mode === "signup" && (
              <>
                <Text style={styles.label}>Confirm password</Text>
                <View style={styles.pwRow}>
                  <TextInput
                    testID="confirm-password-input"
                    style={styles.pwInput}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.onSurfaceMuted}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showPw}
                  />
                </View>
              </>
            )}

            <View style={{ height: spacing.lg }} />
            <Button
              testID={mode === "signup" ? "signup-button" : "login-button"}
              title={mode === "signup" ? "Create account" : "Sign in"}
              onPress={submit}
              loading={loading}
            />

            <Pressable
              testID="mode-switch"
              onPress={() => setMode(mode === "signup" ? "login" : "signup")}
              style={styles.switchRow}
              hitSlop={10}
            >
              <Text style={styles.switchText}>
                {mode === "signup"
                  ? "Already have an account? "
                  : "New to DaruBahi? "}
                <Text style={styles.switchLink}>
                  {mode === "signup" ? "Sign in" : "Sign up"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.inverse },
  brandWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  brand: { fontFamily: fonts.bold, fontSize: 44, color: "#fff", letterSpacing: -1 },
  brandSub: { fontFamily: fonts.medium, fontSize: type.lg, color: colors.brandSecondary, marginTop: 6 },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface3,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.surface2 },
  tabText: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurfaceMuted },
  tabTextActive: { color: colors.onSurface, fontFamily: fonts.semibold },
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: type.base,
    color: colors.onSurfaceMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: type.sm,
    color: colors.onSurface3,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  phoneRow: { flexDirection: "row", gap: spacing.sm },
  cc: {
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ccText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.semibold,
    fontSize: type.lg,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  pwRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingRight: spacing.md,
  },
  pwInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.medium,
    fontSize: type.lg,
    color: colors.onSurface,
  },
  eye: { padding: 4 },
  switchRow: { alignItems: "center", marginTop: spacing.lg },
  switchText: {
    fontFamily: fonts.regular,
    fontSize: type.base,
    color: colors.onSurfaceMuted,
  },
  switchLink: { fontFamily: fonts.semibold, color: colors.brand },
});
