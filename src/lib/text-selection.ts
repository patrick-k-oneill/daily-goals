import type { TextInput } from 'react-native';

/** Places the caret in a mounted TextInput. */
export function setTextSelection(input: TextInput, { start, end }: { start: number; end: number }) {
  input.setSelection(start, end);
}
