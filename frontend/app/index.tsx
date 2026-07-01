import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, type } from "@/src/theme/theme";

export default function Index() {
  const { loading, authed, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!authed) {
      router.replace("/login");
    } else if (!user) {
      router.replace("/setup");
    } else {
      router.replace("/(tabs)");
    }
  }, [loading, authed, user, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <Text style={styles.logo}>DaruBahi</Text>
      <Text style={styles.tag}>Daaru + Bahi · the liquor ledger</Text>
      <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  logo: { fontFamily: fonts.bold, fontSize: 40, color: colors.brand, letterSpacing: -0.5 },
  tag: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurfaceMuted, marginTop: 6 },
});
