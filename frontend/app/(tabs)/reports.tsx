import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { api } from "@/src/api/client";
import { formatMoney, monthLabel, prettyDate, todayKey, monthKey } from "@/src/utils/format";
import { colors, fonts, radius, shadow, spacing, type } from "@/src/theme/theme";

function Metric({ label, value, tone }: { label: string; value: string; tone?: "profit" }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === "profit" && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

export default function Reports() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"daily" | "monthly">("daily");
  const [daily, setDaily] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, m] = await Promise.all([
        api(`/reports/daily?date=${todayKey()}`),
        api(`/reports/monthly?month=${monthKey()}`),
      ]);
      setDaily(d);
      setMonthly(m);
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

  const maxRev = monthly?.top_brands?.[0]?.revenue || 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.segment}>
          <Pressable testID="tab-daily" onPress={() => setTab("daily")} style={[styles.segBtn, tab === "daily" && styles.segActive]}>
            <Text style={[styles.segText, tab === "daily" && styles.segTextActive]}>Daily</Text>
          </Pressable>
          <Pressable testID="tab-monthly" onPress={() => setTab("monthly")} style={[styles.segBtn, tab === "monthly" && styles.segActive]}>
            <Text style={[styles.segText, tab === "monthly" && styles.segTextActive]}>Monthly</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {tab === "daily" ? (
            <>
              <Text style={styles.periodLabel}>{prettyDate(daily?.date || todayKey())}</Text>
              <View style={styles.metricRow}>
                <Metric label="Total Sale" value={formatMoney(daily?.total_revenue || 0)} />
                <Metric label="Profit" value={formatMoney(daily?.total_profit || 0)} tone="profit" />
              </View>
              <View style={[styles.metricRow, { marginTop: spacing.md }]}>
                <Metric label="Bottles Sold" value={String(daily?.total_bottles || 0)} />
                <Metric label="Brands Sold" value={String(daily?.brands?.length || 0)} />
              </View>

              <Text style={styles.section}>Brand-wise Sales</Text>
              {daily?.brands?.length ? (
                daily.brands.map((b: any, i: number) => (
                  <View key={i} style={styles.ledgerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{b.name} · {b.size}</Text>
                      <Text style={styles.rowMeta}>{b.qty} bottles · profit {formatMoney(b.profit)}</Text>
                    </View>
                    <Text style={styles.rowValue}>{formatMoney(b.revenue)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>No sales recorded today.</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.periodLabel}>{monthLabel(monthly?.month || monthKey())}</Text>
              <View style={styles.metricRow}>
                <Metric label="Sales of the Month" value={formatMoney(monthly?.total_revenue || 0)} />
                <Metric label="Total Profit" value={formatMoney(monthly?.total_profit || 0)} tone="profit" />
              </View>
              <View style={[styles.metricRow, { marginTop: spacing.md }]}>
                <Metric label="Remaining Stock" value={`${monthly?.remaining_stock_units || 0} btl`} />
                <Metric label="Stock Value" value={formatMoney(monthly?.remaining_stock_value || 0)} />
              </View>

              <Text style={styles.section}>Top 5 Selling Brands</Text>
              {monthly?.top_brands?.length ? (
                monthly.top_brands.map((b: any, i: number) => (
                  <View key={i} style={styles.topRow}>
                    <View style={styles.topHeader}>
                      <Text style={styles.rowName}>{i + 1}. {b.name} · {b.size}</Text>
                      <Text style={styles.rowValue}>{formatMoney(b.revenue)}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(6, (b.revenue / maxRev) * 100)}%` }]} />
                    </View>
                    <Text style={styles.rowMeta}>{b.qty} bottles · profit {formatMoney(b.profit)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>No sales this month.</Text>
              )}

              <Text style={styles.section}>Category-wise Profit</Text>
              {monthly?.categories?.length ? (
                monthly.categories.map((c: any, i: number) => (
                  <View key={i} style={styles.ledgerRow}>
                    <Text style={[styles.rowName, { flex: 1 }]}>{c.category}</Text>
                    <Text style={styles.rowMeta}>{formatMoney(c.revenue)} sale</Text>
                    <Text style={[styles.rowValue, { color: colors.success, marginLeft: spacing.md }]}>{formatMoney(c.profit)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>No data.</Text>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: fonts.bold, fontSize: type["2xl"], color: colors.onSurface, marginBottom: spacing.md },
  segment: { flexDirection: "row", backgroundColor: colors.surface3, borderRadius: radius.md, padding: 4 },
  segBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
  segActive: { backgroundColor: colors.surface2, ...shadow },
  segText: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurfaceMuted },
  segTextActive: { color: colors.onSurface, fontFamily: fonts.semibold },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  periodLabel: { fontFamily: fonts.semibold, fontSize: type.lg, color: colors.brand, marginBottom: spacing.md },
  metricRow: { flexDirection: "row", gap: spacing.md },
  metric: { flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  metricLabel: { fontFamily: fonts.medium, fontSize: type.sm, color: colors.onSurfaceMuted },
  metricValue: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface, marginTop: 4 },
  section: { fontFamily: fonts.bold, fontSize: type.lg, color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  ledgerRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  topRow: { backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  topHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  barTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surface3, overflow: "hidden" },
  barFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.brand },
  rowName: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
  rowMeta: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted, marginTop: 4 },
  rowValue: { fontFamily: fonts.semibold, fontSize: type.base, color: colors.onSurface },
  empty: { fontFamily: fonts.regular, fontSize: type.base, color: colors.onSurfaceMuted, textAlign: "center", paddingVertical: spacing.lg },
});
