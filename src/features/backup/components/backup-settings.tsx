import { useState } from 'react';

import { PrimaryButton } from '@/components/ui/form';
import {
  SettingsGroup,
  SettingsNotice,
  SettingsRow,
  type Notice,
} from '@/components/ui/settings-list';
import { useToday } from '@/lib/clock';
import { confirmAction } from '@/lib/confirm';
import { dayKeyOf, formatPadDate } from '@/lib/dates';

import { describePad, padFileName, parsePad, serializePad, type PadFileContents } from '../logic';
import { readPad, writePad } from '../pad';
import { exportPadFile, pickPadFile } from '../pad-file';

export function BackupSettings() {
  const today = useToday();
  const [notice, setNotice] = useState<Notice | null>(null);

  const exportPad = async () => {
    setNotice(null);
    try {
      await exportPadFile(padFileName(today), serializePad(readPad(), new Date().toISOString()));
    } catch {
      setNotice({ tone: 'error', text: 'Couldn’t export the pad.' });
    }
  };

  const confirmReplace = ({ pad, exportedAt }: PadFileContents) => {
    const exportedOn = formatPadDate(dayKeyOf(new Date(exportedAt)));
    confirmAction(
      'Replace this pad?',
      `Everything on this pad is replaced by the file’s ${describePad(pad)}, exported ${exportedOn}. This can’t be undone.`,
      () => {
        writePad(pad);
        setNotice({ tone: 'ok', text: 'Pad imported.' });
      },
      'Replace',
    );
  };

  const importPad = async () => {
    setNotice(null);
    try {
      const text = await pickPadFile();
      if (text === null) return;
      const parsed = parsePad(text);
      if (parsed.ok) confirmReplace(parsed);
      else setNotice({ tone: 'error', text: parsed.reason });
    } catch {
      setNotice({ tone: 'error', text: 'Couldn’t read that file.' });
    }
  };

  return (
    <SettingsGroup title="Data" footer={notice && <SettingsNotice {...notice} />}>
      <SettingsRow label="Export data" detail="Save a copy of your Goals history.">
        <PrimaryButton label="Export" accessibilityLabel="Export data" onPress={exportPad} />
      </SettingsRow>
      <SettingsRow label="Import data" detail="Replace your history from a saved file.">
        <PrimaryButton label="Import" accessibilityLabel="Import data" onPress={importPad} />
      </SettingsRow>
    </SettingsGroup>
  );
}
