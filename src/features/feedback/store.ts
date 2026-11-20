import { create } from 'zustand';

interface FeedbackDraftState {
  draft: string;
  writeDraft: (draft: string) => void;
}

export const useFeedbackDraftStore = create<FeedbackDraftState>()((set) => ({
  draft: '',
  writeDraft: (draft) => set({ draft }),
}));
