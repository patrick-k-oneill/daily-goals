import type { ReactNode, Ref } from 'react';
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
import { Spacing } from '@/constants/theme';
import { scaleTextStyle } from '@/features/text-size/logic';
import { useTextScale } from '@/features/text-size/store';
import { useHover } from '@/hooks/use-hover';
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

interface FormActionsProps {
  submitLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** The yellow submit pill and a quiet Cancel. */
export function FormActions({ submitLabel, canSubmit, onSubmit, onCancel }: FormActionsProps) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();
  return (
    <View style={styles.actions}>
      <Pressable
        {...hoverProps}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        disabled={!canSubmit}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.submit,
          {
            backgroundColor:
              canSubmit && (pressed || hovered) ? theme.primaryPressed : theme.primary,
            borderColor: theme.primaryEdge,
          },
          !canSubmit && styles.disabled,
        ]}>
        <ThemedText type="smallBold" themeColor="onPrimary">
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
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  addLine: {
    paddingVertical: Spacing.two,
  },
});
