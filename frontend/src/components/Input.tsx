import React from "react";
import { StyleSheet, Text, TextInput, View, TextInputProps } from "react-native";
import { colors, fonts, radius, spacing, type } from "@/src/theme/theme";

type Props = TextInputProps & {
  label?: string;
  testID?: string;
  hint?: string;
};

export default function Input({ label, hint, style, testID, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        testID={testID}
        placeholderTextColor={colors.onSurfaceMuted}
        style={[styles.input, style]}
        {...rest}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.medium, fontSize: type.base, color: colors.onSurface3, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.medium,
    fontSize: type.lg,
    color: colors.onSurface,
  },
  hint: { fontFamily: fonts.regular, fontSize: type.sm, color: colors.onSurfaceMuted, marginTop: spacing.xs },
});
