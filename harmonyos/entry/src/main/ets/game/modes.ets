import { Difficulty, SudokuLevel, TrainingDifficulty } from './types';

export interface TrainingOption {
  trainingDifficulty: TrainingDifficulty;
  label: string;
  sourceDifficulty: Difficulty;
  description: string;
  recommendationText: string;
}

export const trainingOptions: TrainingOption[] = [
  { trainingDifficulty: 'warmup', label: '热身', sourceDifficulty: 'intro', description: '先找确定线索，适合轻量开局。', recommendationText: '适合从这里开始' },
  { trainingDifficulty: 'steady', label: '稳定', sourceDifficulty: 'easy', description: '节奏稳定，适合日常练习。', recommendationText: '接近你当前闯关节奏' },
  { trainingDifficulty: 'standard', label: '标准', sourceDifficulty: 'normal', description: '需要完整推理，慢慢拆线索。', recommendationText: '适合完整推理练习' },
  { trainingDifficulty: 'advanced', label: '进阶', sourceDifficulty: 'hard', description: '长局专注，不急着快。', recommendationText: '适合专注长局' },
];

export function getTrainingOption(trainingDifficulty: TrainingDifficulty): TrainingOption | null {
  for (let index = 0; index < trainingOptions.length; index += 1) {
    const option = trainingOptions[index];
    if (option.trainingDifficulty === trainingDifficulty) {
      return option;
    }
  }
  return null;
}

export function choosePracticeLevel(levels: SudokuLevel[], trainingDifficulty: TrainingDifficulty, recentLevelId: string | null): SudokuLevel | null {
  const option = getTrainingOption(trainingDifficulty);
  if (!option) {
    return null;
  }

  const candidates: SudokuLevel[] = [];
  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index];
    if (level.difficulty === option.sourceDifficulty) {
      candidates.push(level);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const level = candidates[index];
    if (level.id !== recentLevelId) {
      return level;
    }
  }

  return candidates[0];
}
