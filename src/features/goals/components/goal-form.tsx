import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextInput,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormActions, FormInput, InlineForm } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';

import { hasCheckLabels, MAX_CHECK_LABEL_LENGTH, MAX_CHECKS } from '../logic';

interface GoalDraft {
  title: string;
  targetCount: number;
  /** One per check by position; the core trims, caps and fits them on save. */
  checkLabels: string[];
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
 * A goal line as a form: its title, how many checks it gets and, at two or
 * more, a label over each. Shared by "+ Add goal" and tap-to-edit, which
 * differ only in what sits around it.
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
  // A goal that already has labels opens with their inputs; otherwise a link offers them.
  const initialLabeled = hasCheckLabels(initial.checkLabels);
  const [labelsOpen, setLabelsOpen] = useState(initialLabeled);
  const canSubmit = Boolean(draft.title.trim());
  const canLabel = draft.targetCount >= 2;
  const labelsShown = canLabel && labelsOpen;

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
  // Under the label inputs, the actions end the Return flow: title → labels → save.
  const actionsBelow = Boolean(accessory) || labelsShown;

  return (
    <InlineForm style={style}>
      <FormInput
        value={draft.title}
        onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
        autoFocus
        selectTextOnFocus={initial.title.length > 0}
        returnKeyType="done"
        onSubmitEditing={submit}
        onEscape={onCancel}
        placeholder={placeholder}
        accessibilityLabel="Goal title"
      />

      <View style={styles.optionsRow}>
        <CheckCountStepper
          value={draft.targetCount}
          onChange={(targetCount) => setDraft((d) => ({ ...d, targetCount }))}
        />
        {accessory ?? (actionsBelow ? null : actions)}
      </View>

      {canLabel && !labelsOpen && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setLabelsOpen(true)}
          hitSlop={4}
          style={styles.labelLink}>
          <ThemedText type="small" themeColor="textSecondary">
            Label the checks
          </ThemedText>
        </Pressable>
      )}
      {labelsShown && (
        <CheckLabelInputs
          count={draft.targetCount}
          labels={draft.checkLabels}
          autoFocus={!initialLabeled}
          onChange={(checkLabels) => setDraft((d) => ({ ...d, checkLabels }))}
          onSubmit={submit}
          onEscape={onCancel}
        />
      )}

      {actionsBelow && actions}
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

/**
 * One small input per check, in box order. Return moves to the next input
 * and saves from the last; the labels it hands back may run longer than the
 * count, which the core trims.
 */
function CheckLabelInputs({
  count,
  labels,
  autoFocus,
  onChange,
  onSubmit,
  onEscape,
}: {
  count: number;
  labels: string[];
  autoFocus: boolean;
  onChange: (labels: string[]) => void;
  onSubmit: () => void;
  onEscape: () => void;
}) {
  const inputs = useRef<(TextInput | null)[]>([]);

  const setLabel = (index: number, text: string) => {
    const next = Array.from({ length: Math.max(labels.length, index + 1) }, (_, i) =>
      i === index ? text : (labels[i] ?? ''),
    );
    onChange(next);
  };

  return (
    <View style={styles.labelInputs}>
      {/* A label's position is its box — never reordered, so index keys are stable. */}
      {Array.from({ length: count }, (_, i) => {
        const last = i === count - 1;
        return (
          <FormInput
            // react-doctor-disable-next-line react-doctor/no-array-index-as-key
            key={i}
            ref={(input) => {
              inputs.current[i] = input;
            }}
            value={labels[i] ?? ''}
            onChangeText={(text) => setLabel(i, text)}
            placeholder={String(i + 1)}
            maxLength={MAX_CHECK_LABEL_LENGTH}
            autoFocus={autoFocus && i === 0}
            autoCorrect={false}
            returnKeyType={last ? 'done' : 'next'}
            submitBehavior={last ? undefined : 'submit'}
            onSubmitEditing={last ? onSubmit : () => inputs.current[i + 1]?.focus()}
            onEscape={onEscape}
            accessibilityLabel={`Label for check ${i + 1}`}
            style={styles.labelInput}
          />
        );
      })}
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
  labelLink: {
    alignSelf: 'flex-start',
  },
  labelInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // Room for six characters of small type, centered like the label over its box.
  labelInput: {
    width: 56,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
