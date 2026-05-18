const { normalizeProgress } = require('./progress');

const PROGRESS_STORAGE_KEY = 'lab-lines-progress-v1';

function loadProgress(wxLike) {
  try {
    const stored = wxLike.getStorageSync(PROGRESS_STORAGE_KEY);
    return normalizeProgress(stored);
  } catch (error) {
    return normalizeProgress(null);
  }
}

function saveProgress(wxLike, progress) {
  try {
    wxLike.setStorageSync(PROGRESS_STORAGE_KEY, normalizeProgress(progress));
  } catch (error) {
    return false;
  }

  return true;
}

function clearProgress(wxLike) {
  try {
    wxLike.removeStorageSync(PROGRESS_STORAGE_KEY);
  } catch (error) {
    return false;
  }

  return true;
}

module.exports = {
  PROGRESS_STORAGE_KEY,
  clearProgress,
  loadProgress,
  saveProgress,
};
