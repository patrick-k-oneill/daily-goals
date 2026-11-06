import { useLayoutEffect, useRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { setTextSelection } from '@/lib/text-selection';

import { applyListEdit, startList, type ListEdit } from './list-text';

type ListTextInputProps = Omit<TextInputProps, 'multiline' | 'value' | 'onChangeText' | 'ref'> & {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * A multiline input whose lines are bullets (rules in ./list-text). Every
 * keyboard takes one path: each change is diffed against `value`, the list
 * rules rewrite it, and the caret is steered once the rewrite has rendered.
 */
export function ListTextInput({ value, onChangeText, onFocus, ...props }: ListTextInputProps) {
  const input = useRef<TextInput>(null);
  const pendingCaret = useRef<ListEdit | undefined>(undefined);

  useLayoutEffect(() => {
    const pending = pendingCaret.current;
    pendingCaret.current = undefined;
    if (pending?.text === value && input.current) {
      setTextSelection(input.current, pending.selection);
    }
  }, [value]);

  const commit = (edit: ListEdit, typed?: string) => {
    if (edit.text !== typed) pendingCaret.current = edit;
    onChangeText(edit.text);
  };

  return (
    <TextInput
      ref={input}
      multiline
      value={value}
      onChangeText={(next) => commit(applyListEdit(value, next), next)}
      onFocus={(e) => {
        if (value === '') commit(startList());
        onFocus?.(e);
      }}
      {...props}
    />
  );
}
