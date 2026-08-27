import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const JSON_MIME = 'application/json';

/** Write the pad file to the cache and hand it to the share sheet. */
export async function exportPadFile(fileName: string, text: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: JSON_MIME, UTI: 'public.json' });
}

/** Let the user pick a pad file: its text, or null when they cancel. */
export async function pickPadFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: JSON_MIME });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
