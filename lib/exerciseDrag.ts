export type DragLayout = { y: number; height: number };
export function getExerciseDropIndex(layouts: Map<number, DragLayout>, from: number, delta: number, count: number) {
  const origin = layouts.get(from);
  if (!origin) return from;
  const center = origin.y + origin.height / 2 + delta;
  let target = from; let distance = Infinity;
  for (const [index, rect] of layouts) {
    if (index < 0 || index >= count) continue;
    const candidate = Math.abs(center - rect.y - rect.height / 2);
    if (candidate < distance) { target = index; distance = candidate; }
  }
  return target;
}
export function moveExerciseItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length) throw new Error('Déplacement invalide.');
  const result = [...items]; const [item] = result.splice(from, 1); result.splice(to, 0, item); return result;
}
