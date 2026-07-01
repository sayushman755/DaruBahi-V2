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

export default function Sell() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
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
  const revenue = selected ? qty * selected.selling_price : 0;
  const profit = selected ? qty * (selected.selling_price - selected.cost_price) : 0;
  const maxQty = selected?.current_stock || 0;

  const save = async () => {
    if (!selected) { toast.show("Select a product", "error"); return; }
    if (qty < 1) { toast.show("Quantity must be at least 1", "error"); return; }
    setSaving(true);
    try {
      await api("/sales", { method: "POST", body: { product_id: selected.id, quantity: qty } });
      toast.show(`Sold ${qty} × ${selected.brand_name}`, "success");
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
        <Text style={styles.title}>Sell Bottle</Text>
        <Pressable testID="close-sell" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Add a product first before recording a sale.</Text>
          <Button title="Add Product" onPress={() => router.replace("/add-product")} style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Select Product</Text>
            {products.map((p) => {
              const active = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  testID={`sell-product-${p.id}`}
                  onPress={() => { setSelectedId(p.id); setQty(1); }}
                  style={[styles.product, active && styles.productActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pName, active && { color: "#fff" }]}>{p.brand_name} · {p.size}</Text>
                    <Text style={[styles.pMeta, active && { color: colors.brandSecondary }]}>{p.current_stock} in stock · {formatMoney(p.selling_price)}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                </Pressable>
              );
            })}
          </ScrollView>

          {selected && (
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={styles.qtyRow}>
                <Text style={styles.label}>Quantity</Text>
                <Stepper testID="sell-qty-stepper" value={qty} onChange={setQty} min={1} max={maxQty} />
              </View>
              <View style={styles.calcRow}>
                <View><Text style={styles.calcLabel}>Total Amount</Text><Text style={styles.calcValue}>{formatMoney(revenue)}</Text></View>
                <View style={{ alignItems: "flex-end" }}><Text style={styles.calcLabel}>Profit</Text><Text style={[styles.calcValue, { color: colors.success }]}>{formatMoney(profit)}</Text></View>
              </View>
              <Button testID="save-sale-button" title="Save Sale" onPress={save} loading={saving} disabled={maxQty === 0} />
              {maxQty === 0 && <Text style={styles.outOfStock}>Out of stock</Text>}
            </View>
          )}
        </>
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
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface2, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg },
  qtyRow: { alignItems: "center", marginBottom: spacing.md },
  calcRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  calcLabel: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted },
  calcValue: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface, marginTop: 2 },
  outOfStock: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.error, textAlign: "center", marginTop: spacing.sm },
});
