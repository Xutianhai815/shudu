import { PuzzleSnapshot } from './types';

export interface SavedRun {
  mode: 'campaign' | 'practice';
  levelId: string;
  trainingDifficulty: string | null;
  snapshot: PuzzleSnapshot;
}

export interface AppProgress {
  schemaVersion: number;
  campaignRun: SavedRun | null;
  practiceRun: SavedRun | null;
  completedLevelIds: string[];
  practiceStats: {
    totalCompleted: number;
    lastTrainingDifficulty: string | null;
    recentLevelIdsByTrainingDifficulty: Record<string, string | null>;
  };
  growthStats: {
    totalCompleted: number;
    streakDays: number;
    lastPlayedDate: string | null;
  };
}

export function createEmptyProgress(): AppProgress {
  return {
    schemaVersion: 1,
    campaignRun: null,
    practiceRun: null,
    completedLevelIds: [],
    practiceStats: {
      totalCompleted: 0,
      lastTrainingDifficulty: null,
      recentLevelIdsByTrainingDifficulty: {
        warmup: null,
        steady: null,
        standard: null,
        advanced: null,
      },
    },
    growthStats: {
      totalCompleted: 0,
      streakDays: 0,
      lastPlayedDate: null,
    },
  };
}
