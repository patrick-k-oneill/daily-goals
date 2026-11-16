import { useState } from 'react';

import { PrimaryButton } from '@/components/ui/form';
import {
  SettingsGroup,
  SettingsNotice,
  SettingsRow,
  type Notice,
} from '@/components/ui/settings-list';

import type { SendOutcome } from '../types';

import { FeedbackForm } from './feedback-form';

export function FeedbackSettings() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [draft, setDraft] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const toggleForm = () => {
    setNotice(null);
    setIsFormOpen((isOpen) => !isOpen);
  };

  const settle = (outcome: SendOutcome) => {
    setNotice({ tone: outcome.ok ? 'ok' : 'error', text: outcome.message });
    if (!outcome.ok) return;
    setDraft('');
    setIsFormOpen(false);
  };

  return (
    <SettingsGroup
      title="Feedback"
      footer={
        <>
          {isFormOpen && (
            <FeedbackForm
              draft={draft}
              onChangeDraft={setDraft}
              onSettled={settle}
              onCancel={() => setIsFormOpen(false)}
            />
          )}
          {notice && <SettingsNotice {...notice} />}
        </>
      }>
      <SettingsRow label="Send feedback" detail="A note to self, filed on GitHub.">
        <PrimaryButton label="Write" accessibilityLabel="Send feedback" onPress={toggleForm} />
      </SettingsRow>
    </SettingsGroup>
  );
}
