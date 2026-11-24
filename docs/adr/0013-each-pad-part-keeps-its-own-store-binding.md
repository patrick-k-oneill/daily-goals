# Each pad part keeps its own store binding

The pad has two parts, goals and gratitude, and each has its own zustand binding (`goals/store.ts`, `gratitude/store.ts`): its own actions, persist version and migration. Three places name both parts by hand: `backup/pad.ts` gathers and replaces them, `backup/footprint.ts` measures them, and the root layout waits for both to rehydrate; the sync engine merges each through its own store action. The architecture review (#27, candidate 2) proposed one binding that builds every store from its core's transitions, hands them a single stamp, and lets backup, the footprint, hydration and sync iterate one list of pad parts. That is rejected.

The review counted three stores. Upcoming events left the pad (#95), so two remain and no third is planned. With two parts the hand-written lists are two lines each, read at a glance and checked by the compiler through `PadData`; a registry would replace them with an abstraction that has two members. The parts are also less alike than the proposal assumed: goals are written onto today's page at rehydration, on import and after a merge, and their check taps feed the rewards store, while gratitude does none of that, so a shared binding would need a hook for each difference. And the code it would cut across, rehydration and the sync engine's pull and push (ADR 0006), is the code a mistake costs the most in.

The clock already reaches every core one way: `today` from `todayKey()` and a stamp from `nowStamp()`, passed in by the store action (ADR 0003).

Revisit when a third pad part appears: three hand-kept lists of three is where a list of parts starts to pay.
