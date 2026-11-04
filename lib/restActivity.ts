import type { RestTimer } from './restTimer';
export type RestActivityProps = { startedAt: number; endTime: number; exerciseName: string; setNumber: number; finished: boolean };
export type RestActivityInstance = { update: (props: RestActivityProps, staleDate?: Date) => Promise<void>; end: (policy: 'immediate', props: RestActivityProps) => Promise<void> };
export function getRestActivityProps(timer: RestTimer, finished = false): RestActivityProps {
  return { startedAt: timer.endTime - timer.duration * 1000, endTime: timer.endTime, exerciseName: timer.exerciseName, setNumber: timer.setNumber, finished };
}
export function createRestActivitySync(factory: {
  getInstances: () => RestActivityInstance[];
  start: (props: RestActivityProps, url: string, staleDate: Date) => RestActivityInstance;
}) {
  let queue = Promise.resolve(); let revision = 0; let signature = '';
  return (timer: RestTimer | null, now?: number): Promise<void> => {
    const current = ++revision;
    queue = queue.catch(() => {}).then(async () => {
      if (current !== revision) return;
      const currentTime = now ?? Date.now();
      const instances = factory.getInstances();
      if (!timer || timer.endTime <= currentTime) {
        const props = timer ? getRestActivityProps(timer, true) : { startedAt: currentTime, endTime: currentTime, exerciseName: 'Repos terminé', setNumber: 0, finished: true };
        for (const instance of instances) await instance.end('immediate', props);
        signature = ''; return;
      }
      const props = getRestActivityProps(timer);
      const nextSignature = JSON.stringify(props);
      if (instances[0]) {
        if (nextSignature !== signature) await instances[0].update(props, new Date(timer.endTime));
      } else factory.start(props, 'gymtracker:///rest', new Date(timer.endTime));
      for (const extra of instances.slice(1)) await extra.end('immediate', { ...props, finished: true });
      signature = nextSignature;
    });
    return queue;
  };
}
