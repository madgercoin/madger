import { requireNativeViewManager } from 'expo-modules-core';
import type { ViewProps } from 'react-native';
import type { ComponentType } from 'react';
type HostEvent = { nativeEvent: { message: string } };
export type MadgerOfflineGameProps = ViewProps & {
  active: boolean;
  initialStorage: string;
  backRequest?: number;
  onMessage?: (event: HostEvent) => void;
  onError?: (event: HostEvent) => void;
};
export default requireNativeViewManager('MadgerOfflineGame') as ComponentType<MadgerOfflineGameProps>;
