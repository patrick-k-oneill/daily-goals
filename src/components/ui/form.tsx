import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The bordered card a pad line turns into while it's being written or edited. */
export function InlineForm({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return <View style={[styles.form, { borderColor: theme.border }, style]}>{children}</View>;
}

/** One ruled input line: ink text over a blue rule, grey placeholder. */
export function FormInput({ style, ...props }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[styles.input, { color: theme.text, borderBottomColor: theme.rule }, style]}
      {...props}
    />
  );
}

interface FormActionsProps {
  submitLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** The accent submit pill and a quiet Cancel. */
export function FormActions({ submitLabel, canSubmit, onSubmit, onCancel }: FormActionsProps) {
  const theme = useTheme();
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        disabled={!canSubmit}
        onPress={onSubmit}
        style={[styles.submit, { backgroundColor: theme.accent }, !canSubmit && styles.disabled]}>
        <ThemedText type="smallBold" themeColor="onAccent">
          {submitLabel}
        </ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8}>
        <ThemedText type="small" themeColor="textSecondary">
          Cancel
        </ThemedText>
      </Pressable>
    </View>
  );
}

interface AddLineProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  type?: ThemedTextProps['type'];
}

/** The next blank line on the page — "+ Add …" — that opens a form when tapped. */
export function AddLine({ label, accessibilityLabel, onPress, type }: AddLineProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.addLine}>
      <ThemedText type={type} themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  submit: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  disabled: {
    opacity: 0.4,
  },
  addLine: {
    paddingVertical: Spacing.two,
  },
});
