import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useToast } from "@/src/components/Toast";
import Input from "@/src/components/Input";
import Button from "@/src/components/Button";
import { colors, fonts, radius, spacing, type, COMMON_SIZES } from "@/src/theme/theme";

export default function AddProduct() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);

  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [newCat, setNewCat] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadCats = useCallback(async () => {
    const c = await api("/categories");
    setCategories(c.categories);
    if (!editing && !category) setCategory(c.categories[0] || "Whisky");
  }, [editing, category]);

  useEffect(() => { loadCats(); }, [loadCats]);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const list = await api("/products");
      const p = list.find((x: any) => x.id === id);
      if (p) {
        setCategory(p.category);
        setBrand(p.brand_name);
        setSize(p.size);
        setCost(String(p.cost_price));
        setPrice(String(p.selling_price));
        setStock(String(p.current_stock));
        setMinStock(String(p.min_stock));
      }
    })();
  }, [editing, id]);

  const finalSize = customSize.trim() || size;

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    try {
      await api("/categories", { method: "POST", body: { name } });
      await loadCats();
      setCategory(name);
      setNewCat("");
      setShowNewCat(false);
    } catch (e: any) {
      toast.show(e.message, "error");
    }
  };

  const save = async () => {
    if (!brand.trim()) { toast.show("Brand name is required", "error"); return; }
    if (!finalSize) { toast.show("Select or enter a bottle size", "error"); return; }
    if (!price || Number(price) <= 0) { toast.show("Enter a valid selling price", "error"); return; }
    setSaving(true);
    const body = {
      category,
      brand_name: brand.trim(),
      size: finalSize,
      cost_price: Number(cost || 0),
      selling_price: Number(price),
      current_stock: Number(stock || 0),
      min_stock: Number(minStock || 0),
    };
    try {
      if (editing) {
        await api(`/products/${id}`, { method: "PUT", body });
        toast.show("Product updated", "success");
      } else {
        await api("/products", { method: "POST", body });
        toast.show("Product added", "success");
      }
      router.back();
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/products/${id}`, { method: "DELETE" });
      toast.show("Product removed", "info");
      router.back();
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>{editing ? "Edit Product" : "Add Product"}</Text>
        <Pressable testID="close-add-product" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {categories.map((c) => (
            <Pressable key={c} testID={`cat-${c}`} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
          <Pressable testID="add-category-toggle" onPress={() => setShowNewCat((s) => !s)} style={[styles.chip, styles.chipAdd]}>
            <Ionicons name="add" size={16} color={colors.brand} />
            <Text style={[styles.chipText, { color: colors.brand }]}>New</Text>
          </Pressable>
        </View>
        {showNewCat && (
          <View style={styles.newCatRow}>
            <View style={{ flex: 1 }}>
              <Input testID="new-category-input" placeholder="New category name" value={newCat} onChangeText={setNewCat} style={{ marginBottom: 0 } as any} />
            </View>
            <Button testID="save-category-button" title="Add" onPress={addCategory} style={{ marginLeft: spacing.sm, minHeight: 52 }} />
          </View>
        )}

        <Input testID="brand-input" label="Brand Name" placeholder="e.g. Blender's Pride" value={brand} onChangeText={setBrand} />

        <Text style={styles.label}>Bottle Size</Text>
        <View style={styles.chips}>
          {COMMON_SIZES.map((s) => (
            <Pressable key={s} testID={`size-${s}`} onPress={() => { setSize(s); setCustomSize(""); }} style={[styles.chip, size === s && !customSize && styles.chipActive]}>
              <Text style={[styles.chipText, size === s && !customSize && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <Input testID="custom-size-input" placeholder="Or type a custom size (e.g. 1000ml)" value={customSize} onChangeText={setCustomSize} />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Input testID="cost-input" label="Cost / Unit (₹)" placeholder="0" keyboardType="numeric" value={cost} onChangeText={setCost} /></View>
          <View style={{ width: spacing.md }} />
          <View style={{ flex: 1 }}><Input testID="price-input" label="Selling Price (₹)" placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} /></View>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Input testID="stock-input" label="Current Stock" placeholder="0" keyboardType="numeric" value={stock} onChangeText={setStock} /></View>
          <View style={{ width: spacing.md }} />
          <View style={{ flex: 1 }}><Input testID="minstock-input" label="Low-stock Alert" placeholder="5" keyboardType="numeric" value={minStock} onChangeText={setMinStock} /></View>
        </View>

        <Button testID="save-product-button" title={editing ? "Save Changes" : "Add Product"} onPress={save} loading={saving} />
        {editing && (
          <Button testID="delete-product-button" title="Remove Product" variant="danger" onPress={remove} loading={deleting} style={{ marginTop: spacing.md }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: fonts.bold, fontSize: type.xl, color: colors.onSurface },
  label: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface3, marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  chipAdd: { borderStyle: "dashed", borderColor: colors.brand },
  chipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipText: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface3 },
  chipTextActive: { color: colors.onBrandSoft, fontFamily: fonts.semibold },
  newCatRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.lg },
  row2: { flexDirection: "row" },
});
