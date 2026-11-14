import type { IcloudPadModule } from './IcloudPadModule';

export type { IcloudPadEvents, IcloudPadModule } from './IcloudPadModule';

/** Browsers have no iCloud container; export and import are the web pad's bridge. */
const none: IcloudPadModule | null = null;

export default none;
