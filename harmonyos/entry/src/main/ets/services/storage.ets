import { AppProgress, createEmptyProgress } from '../game/progress';

const STORAGE_KEY = 'lab_lines_sudoku_progress_v1';

export async function loadProgress(): Promise<AppProgress> {
  // Task 8 upgrades this service to HarmonyOS Preferences.
  // This in-memory fallback keeps page work compileable before platform API wiring.
  const globalStore = globalThis as Record<string, string | undefined>;
  const raw = globalStore[STORAGE_KEY];
  if (!raw) {
    return createEmptyProgress();
  }

  try {
    return JSON.parse(raw) as AppProgress;
  } catch (_error) {
    return createEmptyProgress();
  }
}

export async function saveProgress(progress: AppProgress): Promise<void> {
  const globalStore = globalThis as Record<string, string | undefined>;
  globalStore[STORAGE_KEY] = JSON.stringify(progress);
}
