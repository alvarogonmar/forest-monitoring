import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { RequestController } from '../core/request';
import { deviceDependencies } from '../services/device';

export function useHelpRequest() {
  const [controller] = useState(() => new RequestController(deviceDependencies));
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  useEffect(() => {
    controller.setActive(AppState.currentState === 'active');
    const unsubscribe = NetInfo.addEventListener(network => {
      // Wi-Fi association alone does not prove internet access.
      controller.setConnection(network.isConnected === false ? false : network.isInternetReachable);
    });
    const appState = AppState.addEventListener('change', next => {
      controller.setActive(next === 'active');
      if (next === 'active') void NetInfo.refresh();
    });
    void controller.restore();
    return () => { unsubscribe(); appState.remove(); controller.setActive(false); };
  }, [controller]);
  return { state, create: () => controller.create(), retry: () => state.ready ? controller.resume() : controller.restore(), reset: () => controller.reset() };
}
