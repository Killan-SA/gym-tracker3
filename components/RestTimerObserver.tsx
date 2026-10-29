import { useEffect } from 'react';
import { AppState, Vibration } from 'react-native';
import { useRestTimerStore } from '../store/restTimerStore';
import { secondsRemaining } from '../lib/restTimer';
// One observer for the whole app, so leaving the rest screen does not stop the
// deadline. iOS may suspend JS while locked; completion is checked on resume.
export function RestTimerObserver() {
  useEffect(() => {
    const tick = () => {
      const state = useRestTimerStore.getState();
      if (AppState.currentState === 'active' && state.timer && secondsRemaining(state.timer) === 0 && state.complete()) Vibration.vibrate([0, 200, 100, 200]);
    };
    const interval = setInterval(tick, 250);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') tick(); });
    return () => { clearInterval(interval); listener.remove(); };
  }, []);
  return null;
}
