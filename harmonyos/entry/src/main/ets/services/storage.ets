import dataPreferences from '@ohos.data.preferences';
import common from '@ohos.app.ability.common';
import { AppProgress, createEmptyProgress } from '../game/progress';

const STORE_NAME = 'lab_lines_sudoku_store';
const STORAGE_KEY = 'lab_lines_sudoku_progress_v1';

let appContext: common.Context | null = null;

export function configureStorage(context: common.Context): void {
  appContext = context;
}

export async function loadProgress(): Promise<AppProgress> {
  if (!appContext) {
    return createEmptyProgress();
  }

  try {
    const store = await dataPreferences.getPreferences(appContext, STORE_NAME);
    const raw = await store.get(STORAGE_KEY, '');
    if (typeof raw !== 'string' || raw.length === 0) {
      return createEmptyProgress();
    }

    return JSON.parse(raw) as AppProgress;
  } catch (_error) {
    return createEmptyProgress();
  }
}

export async function saveProgress(progress: AppProgress): Promise<void> {
  if (!appContext) {
    return;
  }

  const store = await dataPreferences.getPreferences(appContext, STORE_NAME);
  await store.put(STORAGE_KEY, JSON.stringify(progress));
  await store.flush();
}
