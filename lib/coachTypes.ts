import type { MuscleId } from './trainingBalance';
export type ProgressionStatus = 'progressing' | 'stable' | 'possible_plateau' | 'temporary_drop' | 'insufficient_data';
export type Confidence = 'low' | 'medium' | 'high';
export type Energy = 'good' | 'normal' | 'tired';
export type CheckIn = {
  recordedAt: string;
  energy: Energy | null;
  soreness: Partial<Record<MuscleId, 0 | 1 | 2 | 3>>;
  pain: MuscleId[];
};
export type CheckInHistory = { initial: CheckIn | null; updates: CheckIn[]; skipped: boolean };
export type ProgressionConfig = { minReps: number; maxReps: number; targetRpe: number; incrementKg: number; mode: 'double' | 'reps' | 'load' | 'off' };
export type CoachPreferences = { enabled: boolean; autoCheckIn: boolean; equipment: string[] };
export type StrengthGoal = { metric: 'max_load' | 'load_reps' | 'estimated_1rm'; targetKg: number; reps: number | null; createdAt: string };
export type Performance = { weight: number; reps: number; rpe: number | null };
export type CoachSet = Performance & { id: string; name: string; category: string | null; sessionId: string; date: string; setNumber: number; notes: string | null; fatigueReported?: boolean };
export type ExerciseTrend = { name: string; status: ProgressionStatus; confidence: Confidence; explanation: string; sessions: number; rpeImprovement: boolean };
export type ProgressionRecommendation = { weight: number | null; reps: number | null; confidence: Confidence; explanation: string; blocked: boolean; source: 'history' | 'current' };
