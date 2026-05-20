import { PuzzleSnapshot } from './types';

export interface SavedRun {
  mode: 'campaign' | 'practice';
  levelId: string;
  trainingDifficulty: string | null;
  snapshot: PuzzleSnapshot;
}

export interface RecentLevelIdsByTrainingDifficulty {
  warmup: string | null;
  steady: string | null;
  standard: string | null;
  advanced: string | null;
}

export interface PracticeStats {
  totalCompleted: number;
  lastTrainingDifficulty: string | null;
  recentLevelIdsByTrainingDifficulty: RecentLevelIdsByTrainingDifficulty;
}

export interface GrowthStats {
  totalCompleted: number;
  streakDays: number;
  lastPlayedDate: string | null;
}

export interface AppProgress {
  schemaVersion: number;
  campaignRun: SavedRun | null;
  practiceRun: SavedRun | null;
  completedLevelIds: string[];
  practiceStats: PracticeStats;
  growthStats: GrowthStats;
}

export function createEmptyProgress(): AppProgress {
  const recentLevelIdsByTrainingDifficulty: RecentLevelIdsByTrainingDifficulty = {
    warmup: null,
    steady: null,
    standard: null,
    advanced: null,
  };

  const practiceStats: PracticeStats = {
    totalCompleted: 0,
    lastTrainingDifficulty: null,
    recentLevelIdsByTrainingDifficulty: recentLevelIdsByTrainingDifficulty,
  };

  const growthStats: GrowthStats = {
    totalCompleted: 0,
    streakDays: 0,
    lastPlayedDate: null,
  };

  const progress: AppProgress = {
    schemaVersion: 1,
    campaignRun: null,
    practiceRun: null,
    completedLevelIds: [],
    practiceStats: practiceStats,
    growthStats: growthStats,
  };

  return progress;
}
