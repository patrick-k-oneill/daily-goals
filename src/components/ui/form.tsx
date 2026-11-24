import { useRef, type ReactNode, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { scaleTextStyle } from '@/features/text-size/logic';
import { useTextScale } from '@/features/text-size/store';
import { useHover } from '@/hooks/use-hover';
import { useKeyboardReveal } from '@/hooks/use-keyboard-reveal';
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
  const form = useRef<View>(null);
  const revealAboveKeyboard = useKeyboardReveal(form);
  return (
    <View
      ref={form}
      onLayout={revealAboveKeyboard}
      style={[styles.form, { borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

type FormInputProps = TextInputProps & {
  /** Esc from a hardware keyboard; pair with `onSubmitEditing` so Return submits. */
  onEscape?: () => void;
  /** Reaches the underlying TextInput, e.g. to move focus between inputs. */
  ref?: Ref<TextInput>;
};

/** One ruled input line: ink text over a blue rule, grey placeholder. */
export function FormInput({ style, onEscape, onKeyPress, ...props }: FormInputProps) {
  const theme = useTheme();
  const scale = useTextScale();
  return (
    <TextInput
      allowFontScaling={false}
      placeholderTextColor={theme.textSecondary}
      style={[
        scaleTextStyle(styles.input, scale),
        { color: theme.text, borderBottomColor: theme.rule },
        style,
      ]}
      onKeyPress={(e) => {
        if (e.nativeEvent.key === 'Escape') onEscape?.();
        onKeyPress?.(e);
      }}
      {...props}
    />
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  accessibilityLabel?: string;
}

export function PrimaryButton({
  label,
  onPress,
  isDisabled = false,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor:
            !isDisabled && (pressed || hovered) ? theme.primaryPressed : theme.primary,
          borderColor: theme.primaryEdge,
        },
        isDisabled && styles.disabled,
      ]}>
      <ThemedText type="smallBold" themeColor="onPrimary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface FormActionsProps {
  submitLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** The yellow submit pill and a quiet Cancel. */
export function FormActions({ submitLabel, canSubmit, onSubmit, onCancel }: FormActionsProps) {
  return (
    <View style={styles.actions}>
      <PrimaryButton label={submitLabel} isDisabled={!canSubmit} onPress={onSubmit} />
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
}

/** The next blank line on the page — "+ Add …" — that opens a form when tapped. */
export function AddLine({ label, accessibilityLabel, onPress }: AddLineProps) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.addLine}>
      <ThemedText themeColor={hovered ? 'text' : 'textSecondary'}>{label}</ThemedText>
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
  field: {
    gap: Spacing.one,
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
  primaryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: Layout.primaryEdgeWidth,
  },
  disabled: {
    opacity: 0.4,
  },
  addLine: {
    paddingVertical: Spacing.two,
  },
});
