import { getActiveProgramId, getNextProgramDayIndex } from './queries';
import { getProgramById } from './programs';
import { getWeeklyConsistency } from './weeklyConsistency';
export function getWidgetSummary(now = new Date()) {
  const programId = getActiveProgramId();
  const program = programId ? getProgramById(programId) : null;
  const next = program?.days.length ? program.days[getNextProgramDayIndex() % program.days.length] : null;
  const consistency = getWeeklyConsistency(now);
  return { nextWorkout: next?.label ?? 'Séance libre', nextWorkoutSubtitle: next?.muscleGroups?.join(' • ') ?? 'À ton rythme', weeklySessions: consistency.currentWeekCount, weeklyGoal: consistency.target, streakWeeks: consistency.streakWeeks };
}
