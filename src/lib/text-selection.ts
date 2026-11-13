import type { TextInput } from 'react-native';

interface TextSelection {
  start: number;
  end: number;
}

/** Places the caret in a mounted TextInput. */
export function setTextSelection(input: TextInput, { start, end }: TextSelection) {
  input.setSelection(start, end);
}

/** Native inputs only report the caret through onSelectionChange, never on demand. */
export function getTextSelection(_input: TextInput): TextSelection | undefined {
  return undefined;
}
