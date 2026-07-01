import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useToast } from "@/src/components/Toast";
import Button from "@/src/components/Button";
import Stepper from "@/src/components/Stepper";
import { formatMoney } from "@/src/utils/format";
import { colors, fonts, radius, spacing, type } from "@/src/theme/theme";

export default function DailyEntry() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [added, setAdded] = useState(0);
  const [sold, setSold] = useState(0);
  const [damaged, setDamaged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api("/products");
      setProducts(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const selected = useMemo(() => products.find((p) => p.id === selectedId), [products, selectedId]);
  const opening = selected?.current_stock || 0;
  const closing = opening + added - sold - damaged;
  const invalid = !selected || closing < 0;

  const reset = () => { setAdded(0); setSold(0); setDamaged(0); };

  const save = async () => {
    if (invalid) { toast.show("Check quantities — stock cannot go negative", "error"); return; }
    setSaving(true);
    try {
      await api("/stock-entries", { method: "POST", body: { product_id: selected!.id, stock_added: added, sold_quantity: sold, damaged_quantity: damaged } });
      toast.show("Daily entry saved", "success");
      router.back();
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Daily Entry</Text>
        <Pressable testID="close-daily-entry" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Add a product first.</Text>
          <Button title="Add Product" onPress={() => router.replace("/add-product")} style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Select Product</Text>
          {products.map((p) => {
            const active = p.id === selectedId;
            return (
              <Pressable
                key={p.id}
                testID={`entry-product-${p.id}`}
                onPress={() => { setSelectedId(p.id); reset(); }}
                style={[styles.product, active && styles.productActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pName, active && { color: "#fff" }]}>{p.brand_name} · {p.size}</Text>
                  <Text style={[styles.pMeta, active && { color: colors.brandSecondary }]}>Opening stock: {p.current_stock}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
              </Pressable>
            );
          })}

          {selected && (
            <>
              <View style={[styles.closingBox, closing < 0 && styles.closingNeg]}>
                <Text style={styles.closingLabel}>Remaining (Closing) Stock</Text>
                <Text style={[styles.closingValue, closing < 0 && { color: colors.error }]}>{closing}</Text>
                <Text style={styles.formula}>Opening {opening} + Added {added} − Sold {sold} − Damaged {damaged}</Text>
              </View>

              <View style={styles.stepBlock}><Text style={styles.stepLabel}>New Stock Added</Text><Stepper testID="added-stepper" value={added} onChange={setAdded} /></View>
              <View style={styles.stepBlock}><Text style={styles.stepLabel}>Quantity Sold</Text><Stepper testID="sold-stepper" value={sold} onChange={setSold} max={opening + added} /></View>
              <View style={styles.stepBlock}><Text style={styles.stepLabel}>Damaged / Broken</Text><Stepper testID="damaged-stepper" value={damaged} onChange={setDamaged} max={opening + added} /></View>

              {sold > 0 && (
                <Text style={styles.saleNote}>This will record a sale of {formatMoney(sold * selected.selling_price)} (profit {formatMoney(sold * (selected.selling_price - selected.cost_price))}).</Text>
              )}

              <Button testID="save-entry-button" title="Save Daily Entry" onPress={save} loading={saving} disabled={invalid} style={{ marginTop: spacing.md }} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  empty: { fontFamily: fonts.regular, fontSize: type.base, color: colors.onSurfaceMuted, textAlign: "center" },
  label: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface3, marginBottom: spacing.md },
  product: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.sm },
  productActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pName: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
  pMeta: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  closingBox: { backgroundColor: colors.brandSoft, borderRadius: radius.lg, padding: spacing.lg, marginVertical: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.brandSecondary },
  closingNeg: { backgroundColor: colors.errorSoft, borderColor: colors.error },
  closingLabel: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onBrandSoft },
  closingValue: { fontFamily: fonts.bold, fontSize: 44, color: colors.brandDark, marginTop: 4 },
  formula: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onBrandSoft, marginTop: 4 },
  stepBlock: { backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, alignItems: "center" },
  stepLabel: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface, marginBottom: spacing.md },
  saleNote: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted, marginBottom: spacing.md },
});
