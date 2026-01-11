// Quick Think - Scoring and Duplicate Detection

/**
 * Find duplicates among answers
 * @param {Array} answers - Array of { playerId, answer } objects
 * @returns {Array} - Array of { playerId, answer, unique } objects
 */
function findDuplicates(answers) {
  // Filter out empty answers
  const validAnswers = answers.filter(a => a.answer && a.answer.trim() !== '');

  // Normalize answers for comparison
  const normalized = validAnswers.map(a => ({
    ...a,
    normalized: a.answer.toLowerCase().trim()
  }));

  // Count occurrences of each normalized answer
  const counts = {};
  normalized.forEach(a => {
    counts[a.normalized] = (counts[a.normalized] || 0) + 1;
  });

  // Mark each answer as unique or duplicate
  return normalized.map(a => ({
    playerId: a.playerId,
    playerName: a.playerName,
    answer: a.answer,
    unique: counts[a.normalized] === 1 && a.normalized !== ''
  }));
}

/**
 * Calculate points for a round
 * @param {Array} markedAnswers - Array from findDuplicates
 * @returns {Object} - { playerId: points } for this round
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
 * @param {Object} currentScores - { playerId: totalPoints }
 * @param {Object} roundPoints - { playerId: pointsThisRound }
 * @returns {Object} - Updated scores
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
 * @param {Object} scores - { playerId: totalPoints }
 * @returns {Array} - Array of winner playerIds (may have ties)
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
