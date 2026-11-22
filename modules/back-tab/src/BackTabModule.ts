import { NativeModule, requireOptionalNativeModule } from 'expo';

export type BackTabEvents = {
  press: () => void;
};

export declare class BackTabModule extends NativeModule<BackTabEvents> {}

export default requireOptionalNativeModule<BackTabModule>('BackTab');
