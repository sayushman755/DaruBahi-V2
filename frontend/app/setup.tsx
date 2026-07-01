import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { colors, fonts, radius, spacing, type, SHOP_TYPES } from "@/src/theme/theme";

export default function Setup() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setupShop } = useAuth();
  const toast = useToast();

  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [shopType, setShopType] = useState(SHOP_TYPES[0]);
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!shopName.trim() || !ownerName.trim()) {
      toast.show("Shop name and owner name are required", "error");
      return;
    }
    setLoading(true);
    try {
      await setupShop({
        shop_name: shopName,
        owner_name: ownerName,
        shop_type: shopType,
        address,
        license_number: license,
      });
      toast.show("Welcome to DaruBahi!", "success");
      router.replace("/(tabs)");
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Set up your shop</Text>
        <Text style={styles.subtitle}>This appears on your dashboard and reports.</Text>

        <Input testID="shop-name-input" label="Shop Name" placeholder="e.g. Sharma Wines" value={shopName} onChangeText={setShopName} />
        <Input testID="owner-name-input" label="Owner Name" placeholder="Your name" value={ownerName} onChangeText={setOwnerName} />

        <Text style={styles.label}>Shop Type</Text>
        <View style={styles.chips}>
          {SHOP_TYPES.map((t) => {
            const active = t === shopType;
            return (
              <Pressable
                key={t}
                testID={`shop-type-${t}`}
                onPress={() => setShopType(t)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input testID="address-input" label="Address (optional)" placeholder="Shop address" value={address} onChangeText={setAddress} />
        <Input testID="license-input" label="License Number (optional)" placeholder="e.g. FL-12345" value={license} onChangeText={setLicense} />

        <Button testID="finish-setup-button" title="Start Managing" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: type.base, color: colors.onSurfaceMuted, marginTop: 4, marginBottom: spacing.xl },
  label: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface3, marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipText: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface3 },
  chipTextActive: { color: colors.onBrandSoft, fontFamily: fonts.semibold },
});
