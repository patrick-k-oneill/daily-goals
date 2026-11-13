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
  // hold, the texts it may hold instead while a rewrite has not reached it,
  // the report iOS may repeat, and the caret.
  const latest = useRef<Latest>({ text: value, held: [], caret: { start: 0, end: 0 } });

  useLayoutEffect(() => {
    if (latest.current.text !== value) {
      // A value from outside this input replaces what it holds, and the caret
      // keeps its distance from the end, as iOS places it.
      const { text, caret } = latest.current;
      const at = Math.max(0, value.length - (text.length - caret.end));
      latest.current = { text: value, held: [], caret: { start: at, end: at } };
    }
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
        const { text, held, repeat } = latest.current;
        // iOS can report one keystroke's change twice; the second report
        // must not undo what the first was rewritten to.
        if (next === repeat && next !== text) return;
        const edit = applyListEdit(text, rebaseEdit(held, text, next));
        commit(edit, next);
        const isBehind = edit.text !== next;
        latest.current.held = isBehind ? [next] : [];
        latest.current.repeat = isBehind ? next : undefined;
      }}
      onSubmitEditing={() => commit(breakLine(latest.current.text, latest.current.caret))}
      onSelectionChange={(e) => {
        // iOS reports its text with the caret: in the current text the
        // input has caught up, in any other the caret is stale.
        const { selection, text } = e.nativeEvent as SelectionEvent;
        if (text === latest.current.text) {
          latest.current = { text, held: [], caret: selection };
        } else if (text === undefined) {
          latest.current.caret = selection;
        }
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

interface Latest {
  text: string;
  held: string[];
  repeat?: string;
  caret: TextSelection;
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
