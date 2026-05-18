function isDebugToolsEnabled(wxLike) {
  try {
    if (!wxLike || typeof wxLike.getAccountInfoSync !== 'function') {
      return false;
    }

    const accountInfo = wxLike.getAccountInfoSync();
    return Boolean(accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion === 'develop');
  } catch (error) {
    return false;
  }
}

function completePuzzleForDebug(state) {
  if (!state || state.completed || !hasValidSolution(state.solution) || !hasValidCells(state.cells)) {
    return state;
  }

  return {
    ...state,
    noteMode: false,
    completed: true,
    cells: state.cells.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        value: state.solution[rowIndex][colIndex],
        notes: [],
      })),
    ),
  };
}

function hasValidSolution(solution) {
  return (
    Array.isArray(solution) &&
    solution.length === 9 &&
    solution.every((row) => Array.isArray(row) && row.length === 9 && row.every((value) => Number.isInteger(value) && value >= 1 && value <= 9))
  );
}

function hasValidCells(cells) {
  return Array.isArray(cells) && cells.length === 9 && cells.every((row) => Array.isArray(row) && row.length === 9);
}

module.exports = {
  completePuzzleForDebug,
  isDebugToolsEnabled,
};
