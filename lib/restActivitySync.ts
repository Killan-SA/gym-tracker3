import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRestTimerStore } from '../store/restTimerStore';
import { createRestActivitySync } from './restActivity';
export function startRestActivitySync() {
  if (Platform.OS !== 'ios' || Constants.executionEnvironment === 'storeClient') return () => {};
  let disposed = false;
  let sync: ReturnType<typeof createRestActivitySync> | null = null;
  const refresh = () => {
    if (disposed || !sync) return;
    const state = useRestTimerStore.getState();
    void sync(state.completed ? null : state.timer).catch(error => console.warn('Live Activity du repos indisponible', error));
  };
  void import('../widgets/RestLiveActivity').then(({ default: activity }) => {
    if (disposed) return;
    sync = createRestActivitySync(activity); refresh();
  }).catch(error => console.warn('Live Activity indisponible dans ce build', error));
  const unsubscribe = useRestTimerStore.subscribe(refresh);
  const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
  return () => { disposed = true; unsubscribe(); listener.remove(); };
}
