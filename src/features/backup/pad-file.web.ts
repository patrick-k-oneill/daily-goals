import * as DocumentPicker from 'expo-document-picker';

const JSON_MIME = 'application/json';

/** Browsers can't share a local file, so the export is a plain download. */
export async function exportPadFile(fileName: string, text: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: JSON_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoking before the click has been handled cancels the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The picker is a hidden <input type="file"> here, so the asset carries the browser's File. */
export async function pickPadFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [JSON_MIME, '.json'],
    base64: false,
  });
  if (result.canceled || !result.assets[0].file) return null;
  return result.assets[0].file.text();
}
