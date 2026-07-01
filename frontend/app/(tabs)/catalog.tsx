import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { formatMoney } from "@/src/utils/format";
import { colors, fonts, radius, shadow, spacing, type } from "@/src/theme/theme";

export default function Catalog() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [active, setActive] = useState("All");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([api("/categories"), api("/products")]);
      setCategories(["All", ...cats.categories]);
      setProducts(prods);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = active === "All" ? products : products.filter((p) => p.category === active);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Catalog</Text>
        <Pressable testID="catalog-add-button" onPress={() => router.push("/add-product")} style={styles.addBtn} hitSlop={8}>
          <Ionicons name="add" size={22} color={colors.onBrand} />
        </Pressable>
      </View>

      {/* Category chips row (sticky chrome) */}
      <View style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map((c) => {
            const isActive = c === active;
            return (
              <Pressable
                key={c}
                testID={`category-chip-${c}`}
                onPress={() => setActive(c)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="pricetags-outline" size={48} color={colors.borderStrong} />
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptySub}>Add your brands to build your catalog.</Text>
          <Pressable testID="empty-add-product" onPress={() => router.push("/add-product")} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Add Product</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const low = item.current_stock <= item.min_stock;
            return (
              <Pressable
                testID={`product-card-${item.id}`}
                onPress={() => router.push({ pathname: "/add-product", params: { id: item.id } })}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.catPill}><Text style={styles.catPillText}>{item.category}</Text></View>
                  <Text style={styles.brand}>{item.brand_name}</Text>
                  <Text style={styles.size}>{item.size} · Sells at {formatMoney(item.selling_price)}</Text>
                </View>
                <View style={styles.stockBox}>
                  <Text style={[styles.stockNum, low && { color: colors.error }]}>{item.current_stock}</Text>
                  <Text style={[styles.stockLabel, low && { color: colors.error }]}>{low ? "low stock" : "in stock"}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface },
  addBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  chipRowWrap: { height: 56, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, justifyContent: "center" },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: "center" },
  chip: {
    flexShrink: 0,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipText: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface3 },
  chipTextActive: { color: colors.onBrandSoft, fontFamily: fonts.semibold },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface, marginTop: spacing.md },
  emptySub: { fontFamily: fonts.regular, fontSize: type.base, color: colors.onSurfaceMuted, marginTop: 4, textAlign: "center" },
  emptyBtn: { marginTop: spacing.lg, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  emptyBtnText: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onBrand },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  catPill: { alignSelf: "flex-start", backgroundColor: colors.brandSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, marginBottom: 6 },
  catPillText: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.onBrandSoft },
  brand: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.onSurface },
  size: { fontFamily: fonts.regular, fontSize: type.base, color: colors.onSurfaceMuted, marginTop: 2 },
  stockBox: { alignItems: "center", minWidth: 64 },
  stockNum: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.success },
  stockLabel: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.success },
});
