export type RestTimer = {
  endTime: number; duration: number; sessionId: string; exerciseId: string;
  exerciseName: string; setNumber: number; weight: number; reps: number;
};
export function secondsRemaining(timer: RestTimer | null, now = Date.now()) {
  return timer ? Math.max(0, Math.ceil((timer.endTime - now) / 1000)) : 0;
}
export function createRestTimer(context: Omit<RestTimer, 'endTime'>, now = Date.now()): RestTimer {
  if (!Number.isFinite(context.duration) || context.duration <= 0 || context.duration > 3600) throw new Error('Durée invalide.');
  return { ...context, endTime: now + context.duration * 1000 };
}
export function adjustRestTimer(timer: RestTimer, seconds: number, now = Date.now()): RestTimer {
  if (!Number.isFinite(seconds)) throw new Error('Durée invalide.');
  const endTime = Math.max(now, timer.endTime + seconds * 1000);
  return { ...timer, endTime, duration: Math.max(1, timer.duration + seconds) };
}
