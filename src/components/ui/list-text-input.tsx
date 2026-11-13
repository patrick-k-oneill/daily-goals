import { useLayoutEffect, useRef } from 'react';
import { TextInput, type TextInputKeyPressEventData, type TextInputProps } from 'react-native';

import { getTextSelection, setTextSelection } from '@/lib/text-selection';

import {
  applyListEdit,
  breakLine,
  indentLine,
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
  const pendingCaret = useRef<ListEdit | undefined>(undefined);
  // The text and caret as of the last event, ahead of the next render.
  const latest = useRef({ text: value, caret: { start: 0, end: 0 } as TextSelection });

  useLayoutEffect(() => {
    latest.current.text = value;
    const pending = pendingCaret.current;
    pendingCaret.current = undefined;
    if (pending?.text === value && input.current) {
      setTextSelection(input.current, pending.selection);
    }
  }, [value]);

  const commit = (edit: ListEdit, typed?: string) => {
    const hasChanged = edit.text !== latest.current.text;
    latest.current = { text: edit.text, caret: edit.selection };
    if (edit.text !== typed) pendingCaret.current = edit;
    if (hasChanged) onChangeText(edit.text);
  };

  return (
    <TextInput
      ref={input}
      multiline
      submitBehavior="submit"
      value={value}
      onChangeText={(next) => commit(applyListEdit(latest.current.text, next), next)}
      onSubmitEditing={() => commit(breakLine(latest.current.text, latest.current.caret))}
      onSelectionChange={(e) => {
        latest.current.caret = e.nativeEvent.selection;
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

/** The DOM's KeyboardEvent fields that react-native-web passes through on nativeEvent. */
type KeyEvent = TextInputKeyPressEventData & { isComposing?: boolean; shiftKey?: boolean };

function keyEdit(event: KeyEvent, text: string, selection: TextSelection): ListEdit | undefined {
  // Enter mid IME composition confirms the composition; Shift+Tab stays focus traversal.
  if (event.isComposing) return undefined;
  if (event.key === 'Enter') return breakLine(text, selection);
  if (event.key === 'Tab' && !event.shiftKey) return indentLine(text, selection.start);
  return undefined;
}
