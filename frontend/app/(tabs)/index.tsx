import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { formatMoney, prettyTime } from "@/src/utils/format";
import { colors, fonts, radius, shadow, spacing, type } from "@/src/theme/theme";

const TEXTURE =
  "https://images.unsplash.com/photo-1525783826280-5a6e928544c3?crop=entropy&cs=srgb&fm=jpg&q=85&w=800";

type Dash = any;

function QuickAction({ icon, label, sub, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={colors.brand} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </Pressable>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("/dashboard");
      setData(d);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>{user?.shop_name || "My Shop"}</Text>
          <Text style={styles.shopType}>{user?.shop_type}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.owner_name || "S")[0].toUpperCase()}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { overflow: "hidden" }]}>
              <Image source={{ uri: TEXTURE }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={styles.summaryScrim} />
              <Text style={styles.summaryLabel}>Today Sale</Text>
              <Text style={styles.summaryValue}>{formatMoney(data?.today_revenue || 0)}</Text>
              <Text style={styles.summaryMeta}>{data?.bottles_today || 0} bottles sold</Text>
            </View>
            <View style={[styles.summaryCard, styles.profitCard]}>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceMuted }]}>Today Profit</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{formatMoney(data?.today_profit || 0)}</Text>
              <Text style={[styles.summaryMeta, { color: colors.onSurfaceMuted }]}>This month {formatMoney(data?.month_profit || 0)}</Text>
            </View>
          </View>

          {/* Month strip */}
          <View style={styles.monthStrip}>
            <View style={styles.monthItem}>
              <Text style={styles.monthLabel}>Month Sale</Text>
              <Text style={styles.monthValue}>{formatMoney(data?.month_revenue || 0)}</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthItem}>
              <Text style={styles.monthLabel}>Products</Text>
              <Text style={styles.monthValue}>{data?.product_count || 0}</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthItem}>
              <Text style={styles.monthLabel}>Low Stock</Text>
              <Text style={[styles.monthValue, (data?.low_stock_count || 0) > 0 && { color: colors.error }]}>{data?.low_stock_count || 0}</Text>
            </View>
          </View>

          {/* Quick actions */}
          <Text style={styles.section}>Daily Work</Text>
          <View style={styles.actionsGrid}>
            <QuickAction testID="action-sell" icon="cart" label="Sell Bottle" sub="Record a sale" onPress={() => router.push("/sell")} />
            <QuickAction testID="action-daily-entry" icon="clipboard" label="Daily Entry" sub="Update stock" onPress={() => router.push("/daily-entry")} />
            <QuickAction testID="action-add-product" icon="add-circle" label="Add Product" sub="New brand" onPress={() => router.push("/add-product")} />
            <QuickAction testID="action-reports" icon="bar-chart" label="Reports" sub="Day & month" onPress={() => router.push("/(tabs)/reports")} />
          </View>

          {/* Low stock */}
          {data?.low_stock?.length > 0 && (
            <>
              <Text style={styles.section}>Low Stock Alert</Text>
              {data.low_stock.map((p: any) => (
                <View key={p.id} style={styles.lowRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{p.brand_name}</Text>
                    <Text style={styles.rowMeta}>{p.size} · {p.category}</Text>
                  </View>
                  <View style={styles.lowBadge}><Text style={styles.lowBadgeText}>{p.current_stock} left</Text></View>
                </View>
              ))}
            </>
          )}

          {/* Top sellers */}
          <Text style={styles.section}>Top Sellers</Text>
          {data?.top_sellers?.length ? (
            data.top_sellers.map((t: any, i: number) => (
              <View key={i} style={styles.row}>
                <Text style={styles.rank}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{t.name}</Text>
                  <Text style={styles.rowMeta}>{t.size}</Text>
                </View>
                <Text style={styles.rowValue}>{t.qty} sold</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No sales yet. Tap Sell Bottle to begin.</Text>
          )}

          {/* Recent sales */}
          <Text style={styles.section}>Recent Sales</Text>
          {data?.recent_sales?.length ? (
            data.recent_sales.map((s: any) => (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{s.brand_name} · {s.size}</Text>
                  <Text style={styles.rowMeta}>{s.quantity} × {formatMoney(s.selling_price)} · {prettyTime(s.created_at)}</Text>
                </View>
                <Text style={[styles.rowValue, { color: colors.success }]}>+{formatMoney(s.total_revenue)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No recent sales.</Text>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        testID="fab-new-sale"
        onPress={() => router.push("/sell")}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 78 }, pressed && { transform: [{ scale: 0.96 }] }]}
      >
        <Ionicons name="add" size={28} color={colors.onBrand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shopName: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  shopType: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.brand, marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: radius.pill, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onBrandSoft },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: spacing.md },
  summaryCard: { flex: 1, borderRadius: radius.lg, padding: spacing.lg, minHeight: 120, justifyContent: "flex-end", ...shadow },
  summaryScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(180,83,9,0.82)" },
  profitCard: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  summaryLabel: { fontFamily: fonts.medium, fontSize: type.sm, color: "#FEF3C7" },
  summaryValue: { fontFamily: fonts.bold, fontSize: type["2xl"], color: "#fff", marginTop: 4 },
  summaryMeta: { fontFamily: fonts.regular, fontSize: type.sm, color: "#FDE68A", marginTop: 2 },
  monthStrip: { flexDirection: "row", backgroundColor: colors.surface2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md },
  monthItem: { flex: 1, alignItems: "center" },
  monthDivider: { width: 1, backgroundColor: colors.border },
  monthLabel: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.onSurfaceMuted },
  monthValue: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface, marginTop: 4 },
  section: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  action: { width: "47%", flexGrow: 1, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  actionIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  actionLabel: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
  actionSub: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md },
  lowRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.errorSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rank: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.brand, width: 22, textAlign: "center" },
  rowName: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
  rowMeta: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  rowValue: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
  lowBadge: { backgroundColor: colors.error, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  lowBadgeText: { fontFamily: fonts.semibold, fontSize: type.sm, color: "#fff" },
  empty: { fontFamily: fonts.regular, fontSize: type.base, color: colors.onSurfaceMuted, textAlign: "center", paddingVertical: spacing.lg },
  fab: { position: "absolute", right: spacing.lg, width: 58, height: 58, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", ...shadow, shadowOpacity: 0.25 },
});
