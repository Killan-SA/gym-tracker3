import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { subscribeDataChanges } from './dataEvents';
import { getWidgetSummary } from './widgetSummary';
import { weekStart } from './weeklyConsistency';

export function startWidgetSync() {
  if (Platform.OS !== 'ios' || Constants.executionEnvironment === 'storeClient') return () => {};
  let timeout: ReturnType<typeof setTimeout>;
  let disposed = false;
  const sync = () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        const { default: widget } = await import('../widgets/GymTrackerWidget');
        if (disposed) return;
        const now = new Date();
        const entries = [{ date: now, props: getWidgetSummary(now) }];
        // Reset week counts on Monday even when the app stays closed.
        for (let i = 1; i <= 5; i++) { const date = weekStart(now); date.setDate(date.getDate() + i * 7); entries.push({ date, props: getWidgetSummary(date) }); }
        widget.updateTimeline(entries);
      } catch (error) { console.warn('Widget GymTracker indisponible dans ce build', error); }
    }, 400);
  };
  const unsubscribe = subscribeDataChanges(sync);
  const listener = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
  sync();
  return () => { disposed = true; clearTimeout(timeout); unsubscribe(); listener.remove(); };
}
