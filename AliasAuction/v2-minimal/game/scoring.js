// Scoring logic for Alias Auction

const SCORING_TABLE = {
  5: 1,   // 5 words = +1 point
  4: 2,   // 4 words = +2 points
  3: 3,   // 3 words = +3 points
  2: 4,   // 2 words = +4 points
  1: 5    // 1 word = +5 points (LEGENDARY!)
};

const FAILURE_PENALTY = -2;

function calculateScore(wordCount, success) {
  if (!success) {
    return FAILURE_PENALTY;
  }
  return SCORING_TABLE[wordCount] || 0;
}

function getPointsForBid(wordCount) {
  return SCORING_TABLE[wordCount] || 0;
}

module.exports = {
  SCORING_TABLE,
  FAILURE_PENALTY,
  calculateScore,
  getPointsForBid
};
