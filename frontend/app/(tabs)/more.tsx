import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import { colors, fonts, radius, shadow, spacing, type } from "@/src/theme/theme";

function InfoRow({ icon, label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={18} color={colors.brand} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

export default function More() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.show("Logged out", "info");
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>More</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.owner_name || "S")[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.shopName}>{user?.shop_name}</Text>
          <Text style={styles.owner}>{user?.owner_name}</Text>
          <View style={styles.typePill}><Text style={styles.typePillText}>{user?.shop_type}</Text></View>
        </View>

        <Text style={styles.section}>Shop Details</Text>
        <View style={styles.card}>
          <InfoRow icon="call" label="Mobile" value={user?.phone} />
          <View style={styles.divider} />
          <InfoRow icon="location" label="Address" value={user?.address} />
          <View style={styles.divider} />
          <InfoRow icon="document-text" label="License Number" value={user?.license_number} />
        </View>

        <Pressable testID="logout-button" onPress={handleLogout} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.85 }]}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        <Text style={styles.footer}>DaruBahi · v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  profileCard: { alignItems: "center", backgroundColor: colors.surface2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, ...shadow },
  avatar: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 30, color: colors.onBrandSoft },
  shopName: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface, marginTop: spacing.md },
  owner: { fontFamily: fonts.regular, fontSize: type.base, color: colors.onSurfaceMuted, marginTop: 2 },
  typePill: { backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4, marginTop: spacing.md },
  typePillText: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.onBrandSoft },
  section: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.lg, gap: spacing.md },
  infoIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted },
  infoValue: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xl, paddingVertical: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.errorSoft, backgroundColor: colors.errorSoft },
  logoutText: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.error },
  footer: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted, textAlign: "center", marginTop: spacing.xl },
});
