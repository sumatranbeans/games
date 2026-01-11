// Quick Think - Scoring and Duplicate Detection

/**
 * Find duplicates among answers
 * @param {Array} answers - Array of { playerId, answer } objects
 * @returns {Array} - Array of { playerId, answer, unique } objects
 */
function findDuplicates(answers) {
  const validAnswers = answers.filter(a => a.answer && a.answer.trim() !== '');

  const normalized = validAnswers.map(a => ({
    ...a,
    normalized: a.answer.toLowerCase().trim()
  }));

  const counts = {};
  normalized.forEach(a => {
    counts[a.normalized] = (counts[a.normalized] || 0) + 1;
  });

  return normalized.map(a => ({
    playerId: a.playerId,
    playerName: a.playerName,
    answer: a.answer,
    unique: counts[a.normalized] === 1 && a.normalized !== ''
  }));
}

/**
 * Calculate points for a round
 */
function calculateRoundPoints(markedAnswers) {
  const points = {};

  markedAnswers.forEach(a => {
    points[a.playerId] = a.unique ? 1 : 0;
  });

  return points;
}

/**
 * Update total scores
 */
function updateScores(currentScores, roundPoints) {
  const updated = { ...currentScores };

  Object.keys(roundPoints).forEach(playerId => {
    updated[playerId] = (updated[playerId] || 0) + roundPoints[playerId];
  });

  return updated;
}

/**
 * Determine winner(s)
 */
function getWinners(scores) {
  const maxScore = Math.max(...Object.values(scores));
  return Object.keys(scores).filter(id => scores[id] === maxScore);
}

module.exports = {
  findDuplicates,
  calculateRoundPoints,
  updateScores,
  getWinners
};
