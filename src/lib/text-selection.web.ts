import type { TextInput } from 'react-native';

/** react-native-web hands out the DOM element as the ref, which has no setSelection. */
export function setTextSelection(input: TextInput, { start, end }: { start: number; end: number }) {
  (input as unknown as HTMLTextAreaElement).setSelectionRange(start, end);
}
