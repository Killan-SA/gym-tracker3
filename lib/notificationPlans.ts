import type { CreatineReminder } from './reminderSettings';
import type { RestTimer } from './restTimer';
export const REST_NOTIFICATION_ID = 'gymtracker-rest-finished';
export const CREATINE_NOTIFICATION_ID = 'gymtracker-creatine-daily';
export const OWN_NOTIFICATION_IDS = [REST_NOTIFICATION_ID, CREATINE_NOTIFICATION_ID] as const;
export type NotificationPlan = {
  identifier: string;
  title: string; body: string; data: Record<string, string>;
  trigger: { type: 'date'; timestamp: number } | { type: 'daily'; hour: number; minute: number };
};
export type NotificationPlans = Record<string, NotificationPlan | null>;
export function buildNotificationPlans(reminder: CreatineReminder, rest: RestTimer | null, now = Date.now()): NotificationPlans {
  return {
    [REST_NOTIFICATION_ID]: rest && rest.endTime > now ? {
      identifier: REST_NOTIFICATION_ID, title: 'Repos terminé ✓',
      body: `${rest.exerciseName} · Tu peux reprendre ta séance.`, data: { kind: 'rest', sessionId: rest.sessionId },
      trigger: { type: 'date', timestamp: rest.endTime },
    } : null,
    [CREATINE_NOTIFICATION_ID]: reminder.enabled ? {
      identifier: CREATINE_NOTIFICATION_ID, title: 'Ton rappel créatine',
      body: 'Pense à ta prise quotidienne de créatine, si elle fait partie de ta routine.', data: { kind: 'creatine' },
      trigger: { type: 'daily', hour: reminder.hour, minute: reminder.minute },
    } : null,
  };
}

// Serial native operations + fixed identifiers prevent duplicate reminders and
// stale rest alarms after rapid +30s / preset / skip / reset actions.
export function createNotificationPlanSync(adapter: { schedule: (plan: NotificationPlan) => Promise<void>; cancel: (id: string) => Promise<void> }) {
  let queue = Promise.resolve(); let revision = 0;
  const signatures = new Map<string, string>();
  return (plans: NotificationPlans, force = false): Promise<void> => {
    const current = ++revision;
    queue = queue.catch(() => {}).then(async () => {
      for (const id of OWN_NOTIFICATION_IDS) {
        if (current !== revision) return;
        const plan = plans[id] ?? null; const signature = JSON.stringify(plan);
        if (!force && signatures.get(id) === signature) continue;
        if (plan) await adapter.schedule(plan); else await adapter.cancel(id);
        signatures.set(id, signature);
      }
    });
    return queue;
  };
}
