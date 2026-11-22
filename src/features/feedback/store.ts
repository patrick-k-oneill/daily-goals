import { create } from 'zustand';

import { EMPTY_DRAFT } from './logic';
import type { FeedbackDraft } from './types';

interface FeedbackDraftState {
  draft: FeedbackDraft;
  writeDraft: (draft: FeedbackDraft) => void;
}

export const useFeedbackDraftStore = create<FeedbackDraftState>()((set) => ({
  draft: EMPTY_DRAFT,
  writeDraft: (draft) => set({ draft }),
}));
