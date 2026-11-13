import type { TextInput } from 'react-native';

interface TextSelection {
  start: number;
  end: number;
}

/** react-native-web hands out the DOM element as the ref, which has no setSelection. */
export function setTextSelection(input: TextInput, { start, end }: TextSelection) {
  (input as unknown as HTMLTextAreaElement).setSelectionRange(start, end);
}

/** The caret the DOM element holds right now. */
export function getTextSelection(input: TextInput): TextSelection {
  const { selectionStart, selectionEnd } = input as unknown as HTMLTextAreaElement;
  return { start: selectionStart, end: selectionEnd };
}
