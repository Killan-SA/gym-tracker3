import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import { requireOptionalNativeModule } from 'expo';
import { getCreatineReminder, setCreatineReminder, validateCreatineReminder, type CreatineReminder } from './reminderSettings';
import { buildNotificationPlans, createNotificationPlanSync } from './notificationPlans';
import { useRestTimerStore } from '../store/restTimerStore';
import { subscribeDataChanges } from './dataEvents';

let modulePromise: Promise<typeof import('expo-notifications')> | null = null;
function notifications() {
  if (Platform.OS === 'web') return Promise.reject(new Error('Les notifications locales nécessitent l’application iPhone.'));
  if (!requireOptionalNativeModule('ExpoNotificationScheduler')) return Promise.reject(new Error('Les notifications nécessitent un nouveau build iOS de GymTracker. Installe la prochaine version TestFlight pour activer les rappels.'));
  return modulePromise ??= import('expo-notifications').catch(error => { modulePromise = null; throw error; });
}
function allowed(status: { granted: boolean; ios?: { status: number } }) { return status.granted || status.ios?.status === 3 || status.ios?.status === 4; }
export async function hasLocalNotificationPermission() { return allowed(await (await notifications()).getPermissionsAsync()); }
export async function requestLocalNotificationPermission(): Promise<boolean> {
  const api = await notifications();
  let permission = await api.getPermissionsAsync();
  if (!allowed(permission) && permission.canAskAgain) permission = await api.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return allowed(permission);
}
const syncPlans = createNotificationPlanSync({
  schedule: async plan => {
    const api = await notifications();
    await api.scheduleNotificationAsync({ identifier: plan.identifier,
      content: { title: plan.title, body: plan.body, data: plan.data, sound: 'default' },
      trigger: plan.trigger.type === 'date'
        ? { type: api.SchedulableTriggerInputTypes.DATE, date: new Date(plan.trigger.timestamp) }
        : { type: api.SchedulableTriggerInputTypes.DAILY, hour: plan.trigger.hour, minute: plan.trigger.minute },
    });
  },
  cancel: async id => { await (await notifications()).cancelScheduledNotificationAsync(id); },
});
export async function syncLocalNotifications(force = false) {
  const api = await notifications();
  const permission = await api.getPermissionsAsync();
  const plans = buildNotificationPlans(getCreatineReminder(), useRestTimerStore.getState().timer);
  if (!allowed(permission)) for (const id of Object.keys(plans)) plans[id] = null;
  await syncPlans(plans, force);
}
export async function saveCreatineReminder(config: CreatineReminder) {
  const next = validateCreatineReminder(config);
  if (next.enabled && !await requestLocalNotificationPermission()) throw new Error('Autorise les notifications de GymTracker dans les réglages de l’iPhone pour activer ce rappel.');
  const previous = getCreatineReminder(); setCreatineReminder(next);
  try { await syncLocalNotifications(); }
  catch (error) { setCreatineReminder(previous); void syncLocalNotifications().catch(() => {}); throw error; }
}
export function startLocalNotifications() {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoNotificationScheduler')) return () => {};
  let disposed = false; let timeout: ReturnType<typeof setTimeout>;
  let responseListener: { remove: () => void } | null = null;
  let lastResponseId = '';
  const refresh = (force = false) => {
    clearTimeout(timeout); timeout = setTimeout(() => {
      if (!disposed) void syncLocalNotifications(force).catch(error => console.warn('Notifications locales indisponibles dans ce build', error));
    }, 80);
  };
  void notifications().then(async api => {
    if (disposed) return;
    api.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
    const open = (response: import('expo-notifications').NotificationResponse | null) => {
      if (!response || disposed) return;
      const { identifier, content } = response.notification.request;
      const responseId = `${identifier}:${response.notification.date}:${response.actionIdentifier}`;
      if (responseId === lastResponseId) return;
      lastResponseId = responseId;
      if (content.data?.kind === 'rest') router.push('/rest');
      else if (content.data?.kind === 'creatine') router.push('/(tabs)/settings');
      else return;
      void api.clearLastNotificationResponseAsync().catch(() => {});
    };
    responseListener = api.addNotificationResponseReceivedListener(open);
    open(await api.getLastNotificationResponseAsync());
  }).catch(error => console.warn('Notifications locales indisponibles dans ce build', error));
  const unsubscribeData = subscribeDataChanges(() => refresh());
  const unsubscribeRest = useRestTimerStore.subscribe(() => refresh());
  const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(true); });
  refresh(true);
  return () => { disposed = true; clearTimeout(timeout); unsubscribeData(); unsubscribeRest(); listener.remove(); responseListener?.remove(); };
}
