import { create } from 'zustand';
import { getUserSetting, setUserSetting } from '../lib/database';
import { adjustRestTimer, createRestTimer, secondsRemaining, type RestTimer } from '../lib/restTimer';
type RestState = {
  timer: RestTimer | null; completed: boolean;
  start: (context: Omit<RestTimer, 'endTime'>) => void;
  adjust: (seconds: number) => void; preset: (duration: number) => void;
  stop: () => void; hydrate: () => void; complete: () => boolean;
};
const persist = (timer: RestTimer | null) => setUserSetting('active_rest_timer', JSON.stringify(timer));
export const useRestTimerStore = create<RestState>((set, get) => ({
  timer: null, completed: false,
  start: context => { const timer = createRestTimer(context); persist(timer); set({ timer, completed: false }); },
  adjust: seconds => { const current = get().timer; if (!current) return; const timer = adjustRestTimer(current, seconds); persist(timer); set({ timer, completed: false }); },
  preset: duration => { const current = get().timer; if (!current) return; const timer = createRestTimer({ ...current, duration }); persist(timer); set({ timer, completed: false }); },
  stop: () => { persist(null); set({ timer: null, completed: false }); },
  hydrate: () => {
    try {
      const value = JSON.parse(getUserSetting('active_rest_timer') ?? 'null');
      if (value && Number.isFinite(value.endTime) && Number.isFinite(value.duration) && typeof value.sessionId === 'string' && typeof value.exerciseName === 'string') {
        set({ timer: value, completed: secondsRemaining(value) === 0 });
      } else set({ timer: null, completed: false });
    } catch { set({ timer: null, completed: false }); }
  },
  complete: () => { if (!get().timer || get().completed) return false; set({ completed: true }); return true; },
}));
