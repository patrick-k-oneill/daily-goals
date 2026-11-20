import { NativeModule, requireOptionalNativeModule } from 'expo';

export type ZoomDirection = 'in' | 'out';

export type ZoomMenuEvents = {
  zoom: (event: { direction: ZoomDirection }) => void;
};

export declare class ZoomMenuModule extends NativeModule<ZoomMenuEvents> {
  isSupported(): boolean;
  setLimits(canZoomIn: boolean, canZoomOut: boolean): void;
}

export default requireOptionalNativeModule<ZoomMenuModule>('ZoomMenu');
