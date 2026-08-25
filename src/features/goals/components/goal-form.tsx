import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormActions, FormInput, InlineForm } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';

import { MAX_CHECKS } from '../logic';

export interface GoalDraft {
  title: string;
  targetCount: number;
}

interface GoalFormProps {
  initial: GoalDraft;
  placeholder: string;
  submitLabel: string;
  onSubmit: (draft: GoalDraft) => void;
  onCancel: () => void;
  /** Sits beside the check stepper; when present, the actions drop to their own row. */
  accessory?: ReactNode;
  /** Rendered under the actions, e.g. the remove link. */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A goal line as a form: its title and how many checks it gets. Shared by
 * "+ Add goal" and tap-to-edit, which differ only in what sits around it.
 */
export function GoalForm({
  initial,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  accessory,
  footer,
  style,
}: GoalFormProps) {
  // Draft snapshot, intentional: the form mounts fresh per session and nothing
  // mutates the goal while it's open, so resyncing would be wrong.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState(initial);
  const canSubmit = Boolean(draft.title.trim());

  const submit = () => {
    if (canSubmit) onSubmit(draft);
  };

  const actions = (
    <FormActions
      submitLabel={submitLabel}
      canSubmit={canSubmit}
      onSubmit={submit}
      onCancel={onCancel}
    />
  );

  return (
    <InlineForm style={style}>
      <FormInput
        value={draft.title}
        onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
        autoFocus
        selectTextOnFocus={initial.title.length > 0}
        returnKeyType="done"
        onSubmitEditing={submit}
        placeholder={placeholder}
        accessibilityLabel="Goal title"
      />

      <View style={styles.optionsRow}>
        <CheckCountStepper
          value={draft.targetCount}
          onChange={(targetCount) => setDraft((d) => ({ ...d, targetCount }))}
        />
        {accessory ?? actions}
      </View>

      {accessory && actions}
      {footer}
    </InlineForm>
  );
}

function CheckCountStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fewer checks"
        style={styles.stepperButton}
        onPress={() => onChange(Math.max(1, value - 1))}>
        <ThemedText type="subtitle" themeColor="textSecondary">
          −
        </ThemedText>
      </Pressable>
      <ThemedText type="smallBold">
        {value} {value === 1 ? 'check' : 'checks'}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More checks"
        style={styles.stepperButton}
        onPress={() => onChange(Math.min(MAX_CHECKS, value + 1))}>
        <ThemedText type="subtitle" themeColor="textSecondary">
          +
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  // A real 44×44pt box (hitSlop doesn't extend DOM hit areas on web); negative
  // margins keep the visual footprint of the old 28×30pt glyph box.
  stepperButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -7,
    marginHorizontal: -8,
  },
});
