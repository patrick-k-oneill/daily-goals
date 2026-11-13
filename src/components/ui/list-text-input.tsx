import { useLayoutEffect, useReducer, useRef } from 'react';
import {
  Platform,
  TextInput,
  type TextInputKeyPressEventData,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
} from 'react-native';

import { getTextSelection, setTextSelection } from '@/lib/text-selection';

import {
  applyListEdit,
  breakLine,
  indentLine,
  rebaseEdit,
  type ListEdit,
  type TextSelection,
} from './list-text';

type ListTextInputProps = Omit<
  TextInputProps,
  'multiline' | 'value' | 'onChangeText' | 'onSubmitEditing' | 'submitBehavior' | 'ref'
> & {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * A multiline input with list rules (./list-text). Return never reaches the
 * platform: native inputs report it through onSubmitEditing and the DOM
 * through onKeyPress, so the break and its bullet land in one update. Tab is
 * taken the same way on the DOM; every other edit is diffed against the text
 * and rewritten once it shows. The caret is steered after each rewrite renders.
 */
export function ListTextInput({
  value,
  onChangeText,
  onKeyPress,
  onSelectionChange,
  ...props
}: ListTextInputProps) {
  const input = useRef<TextInput>(null);
  // React Native sizes a native input from the text it last reported, so a
  // line a rewrite adds is measured one commit late; a commit that changes any
  // prop measures it, and `nativeID` is the prop with no other effect.
  const [remeasures, remeasure] = useReducer((count: number) => count + 1, 0);
  const pendingCaret = useRef<ListEdit | undefined>(undefined);
  // As of the last event, ahead of the next render: the text the input should
  // hold, the texts it may still hold instead (the one it last reported and
  // each rewrite since), and its caret.
  const latest = useRef({ text: value, held: [value], caret: { start: 0, end: 0 } });

  useLayoutEffect(() => {
    // A value from outside this input replaces what it holds.
    if (latest.current.text !== value) latest.current = { ...latest.current, text: value };
    const pending = pendingCaret.current;
    pendingCaret.current = undefined;
    if (pending?.text === value && input.current) {
      setTextSelection(input.current, pending.selection);
      if (Platform.OS !== 'web') remeasure();
    }
  }, [value]);

  const commit = (edit: ListEdit, typed?: string) => {
    const { text, held } = latest.current;
    const hasChanged = edit.text !== text;
    latest.current = {
      text: edit.text,
      held: hasChanged ? [...held.slice(-MAX_HELD), text] : held,
      caret: edit.selection,
    };
    if (edit.text !== typed) pendingCaret.current = edit;
    if (hasChanged) onChangeText(edit.text);
  };

  return (
    <TextInput
      ref={input}
      multiline
      submitBehavior="submit"
      nativeID={Platform.OS === 'web' ? undefined : `list-text-input-${remeasures}`}
      value={value}
      onChangeText={(next) => {
        const { text, held } = latest.current;
        commit(applyListEdit(text, rebaseEdit(held, text, next)), next);
        latest.current.held = [next];
      }}
      onSubmitEditing={() => commit(breakLine(latest.current.text, latest.current.caret))}
      onSelectionChange={(e) => {
        // iOS reports its text with the caret; a caret in any other text is stale.
        const { selection, text } = e.nativeEvent as SelectionEvent;
        if (text === undefined || text === latest.current.text) latest.current.caret = selection;
        onSelectionChange?.(e);
      }}
      onKeyPress={(e) => {
        const selection = input.current ? getTextSelection(input.current) : undefined;
        const edit = selection && keyEdit(e.nativeEvent, latest.current.text, selection);
        if (edit) {
          e.preventDefault();
          commit(edit);
        }
        onKeyPress?.(e);
      }}
      {...props}
    />
  );
}

/** Rewrites kept as texts the input may still hold; a few cover the lag of a fast typist. */
const MAX_HELD = 8;

type SelectionEvent = TextInputSelectionChangeEventData & { text?: string };

/** The DOM's KeyboardEvent fields that react-native-web passes through on nativeEvent. */
type KeyEvent = TextInputKeyPressEventData & { isComposing?: boolean; shiftKey?: boolean };

function keyEdit(event: KeyEvent, text: string, selection: TextSelection): ListEdit | undefined {
  // Enter mid IME composition confirms the composition; Shift+Tab stays focus traversal.
  if (event.isComposing) return undefined;
  if (event.key === 'Enter') return breakLine(text, selection);
  if (event.key === 'Tab' && !event.shiftKey) return indentLine(text, selection.start);
  return undefined;
}
