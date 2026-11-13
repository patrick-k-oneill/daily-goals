import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormActions, FormInput, InlineForm } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';
import { useToday } from '@/lib/clock';
import { confirmAction } from '@/lib/confirm';

import { canSend } from '../logic';
import { sendFeedback } from '../send';
import { forgetToken, readToken, saveToken } from '../token';
import type { SendOutcome } from '../types';

interface FeedbackFormProps {
  draft: string;
  onChangeDraft: (draft: string) => void;
  onSettled: (outcome: SendOutcome) => void;
  onCancel: () => void;
}

/**
 * The inline note form under the pad footer's row; adding a GitHub token
 * takes the form over until it is saved or cancelled. The draft belongs to
 * the caller, so it outlives both Cancel and the token form.
 */
export function FeedbackForm({ draft, onChangeDraft, onSettled, onCancel }: FeedbackFormProps) {
  const today = useToday();
  const [hasToken, setHasToken] = useState(() => readToken() !== null);
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasRemovalFailed, setHasRemovalFailed] = useState(false);

  const send = () => {
    setIsSending(true);
    sendFeedback(draft, today)
      .then(onSettled)
      .finally(() => setIsSending(false));
  };

  const forget = async () => {
    try {
      await forgetToken();
      setHasToken(false);
      setHasRemovalFailed(false);
    } catch {
      setHasRemovalFailed(true);
    }
  };

  const confirmForget = () =>
    confirmAction(
      'Remove the GitHub token?',
      'Send will open GitHub in the browser until a token is added again.',
      forget,
    );

  if (isAddingToken) {
    return (
      <TokenForm
        onSaved={() => {
          setHasToken(true);
          setIsAddingToken(false);
        }}
        onCancel={() => setIsAddingToken(false)}
      />
    );
  }

  return (
    <InlineForm>
      <FormInput
        value={draft}
        onChangeText={onChangeDraft}
        placeholder="What did you notice?"
        accessibilityLabel="Feedback note"
        multiline
        autoFocus
        onEscape={onCancel}
        style={styles.note}
      />
      <FormActions
        submitLabel="Send"
        canSubmit={canSend(draft) && !isSending}
        onSubmit={send}
        onCancel={onCancel}
      />
      <View style={styles.tokenRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.tokenHint}>
          {hasToken
            ? 'Send files the note on GitHub with the saved token.'
            : 'Send opens GitHub in the browser to file the note.'}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={hasToken ? confirmForget : () => setIsAddingToken(true)}
          style={styles.tokenAction}>
          <ThemedText type="small">{hasToken ? 'Remove token' : 'Add a GitHub token'}</ThemedText>
        </Pressable>
      </View>
      {hasRemovalFailed && (
        <ThemedText type="small" themeColor="missed" accessibilityLiveRegion="polite">
          Couldn’t remove the token.
        </ThemedText>
      )}
    </InlineForm>
  );
}

/** Takes the GitHub token and saves it on this device. */
function TokenForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [tokenDraft, setTokenDraft] = useState('');
  const [hasSaveFailed, setHasSaveFailed] = useState(false);

  const token = tokenDraft.trim();

  const save = () => {
    if (!token) return;
    try {
      saveToken(token);
      onSaved();
    } catch {
      setHasSaveFailed(true);
    }
  };

  return (
    <InlineForm>
      <FormInput
        value={tokenDraft}
        onChangeText={setTokenDraft}
        placeholder="GitHub token"
        accessibilityLabel="GitHub token"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
        onEscape={onCancel}
      />
      <ThemedText type="small" themeColor="textSecondary">
        A fine-grained token for this repo with Issues set to read and write. It is kept on this
        device only.
      </ThemedText>
      <FormActions
        submitLabel="Save token"
        canSubmit={Boolean(token)}
        onSubmit={save}
        onCancel={onCancel}
      />
      {hasSaveFailed && (
        <ThemedText type="small" themeColor="missed" accessibilityLiveRegion="polite">
          Couldn’t save the token on this device.
        </ThemedText>
      )}
    </InlineForm>
  );
}

const styles = StyleSheet.create({
  note: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.three,
  },
  tokenHint: {
    flexShrink: 1,
  },
  tokenAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
