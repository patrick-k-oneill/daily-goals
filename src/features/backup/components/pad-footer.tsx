import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/lib/clock';
import { confirmAction } from '@/lib/confirm';
import { dayKeyOf, formatPadDate } from '@/lib/dates';

import { formatBytes } from '../footprint';
import { describePad, padFileName, parsePad, serializePad, type PadFileContents } from '../logic';
import { readPad, useStorageFootprint, writePad } from '../pad';
import { exportPadFile, pickPadFile } from '../pad-file';

interface Notice {
  tone: 'ok' | 'error';
  text: string;
}

/**
 * The pad's back cover: carry the whole pad off this device as one file, or
 * replace it from one. Import is replace-all; merging belongs to sync.
 */
export function PadFooter() {
  const theme = useTheme();
  const today = useToday();
  const footprint = useStorageFootprint();
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
    <View style={[styles.footer, { borderTopColor: theme.rule }]}>
      <ThemedText type="handSmall" themeColor="textSecondary">
        Pad
      </ThemedText>
      <View style={styles.actions}>
        <FooterAction
          label="Export pad…"
          accessibilityLabel="Export the whole pad as a file"
          onPress={exportPad}
        />
        <FooterAction
          label="Import pad…"
          accessibilityLabel="Import a pad file, replacing this pad"
          onPress={importPad}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {formatBytes(footprint.total)} on this device
      </ThemedText>
      {notice && (
        <ThemedText
          type="small"
          themeColor={notice.tone === 'error' ? 'missed' : 'textSecondary'}
          accessibilityLiveRegion="polite">
          {notice.text}
        </ThemedText>
      )}
    </View>
  );
}

function FooterAction({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={styles.action}>
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  action: {
    paddingVertical: Spacing.two,
  },
});
