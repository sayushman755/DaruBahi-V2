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

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [normalizedPhone, setNormalizedPhone] = useState("");

  const handleSend = async () => {
    if (phone.trim().length < 10) {
      toast.show("Enter a valid 10-digit mobile number", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(phone.trim());
      setNormalizedPhone(res.phone);
      setStep("otp");
      if (res.dev_mode && res.dev_otp) {
        toast.show(`Dev OTP: ${res.dev_otp}`, "info");
        setOtp(res.dev_otp);
      } else {
        toast.show("OTP sent to your phone", "success");
      }
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.trim().length < 4) {
      toast.show("Enter the OTP code", "error");
      return;
    }
    setLoading(true);
    try {
      const { is_new_user } = await verifyOtp(normalizedPhone, otp.trim());
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
            {step === "phone" ? (
              <>
                <Text style={styles.title}>Login / Sign up</Text>
                <Text style={styles.subtitle}>Enter your mobile number to continue</Text>
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
                  />
                </View>
                <Button testID="send-otp-button" title="Send OTP" onPress={handleSend} loading={loading} />
              </>
            ) : (
              <>
                <Pressable
                  testID="back-to-phone-button"
                  onPress={() => setStep("phone")}
                  style={styles.backRow}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.brand} />
                  <Text style={styles.backText}>Change number</Text>
                </Pressable>
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>Code sent to {normalizedPhone}</Text>
                <TextInput
                  testID="otp-input"
                  style={styles.otpInput}
                  placeholder="0000"
                  placeholderTextColor={colors.onSurfaceMuted}
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
                  maxLength={6}
                />
                <Button testID="verify-otp-button" title="Verify & Continue" onPress={handleVerify} loading={loading} />
                <Pressable testID="resend-otp-button" onPress={handleSend} style={styles.resend} hitSlop={10}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </Pressable>
              </>
            )}
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
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: type.base, color: colors.onSurfaceMuted, marginTop: 4, marginBottom: spacing.xl },
  phoneRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
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
    fontSize: type.xl,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  otpInput: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 16,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 32,
    letterSpacing: 12,
    color: colors.onSurface,
    marginBottom: spacing.xl,
  },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  backText: { fontFamily: fonts.medium, fontSize: type.base, color: colors.brand },
  resend: { alignItems: "center", marginTop: spacing.lg },
  resendText: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.brand },
});
