// Quick Think - Scoring and Duplicate Detection
// Enhanced with Union-Find grouping, lenient fuzzy matching, and volume bonuses

/**
 * Union-Find (Disjoint Set Union) data structure for grouping similar answers
 * Handles transitive matching: if A~B and B~C, then A, B, C are all grouped together
 */
class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = Array(size).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    // Union by rank
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }

  getGroups() {
    const groups = new Map();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root).push(i);
    }
    return Array.from(groups.values());
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if two strings are similar (fuzzy match)
 * Lenient thresholds to catch most typos:
 * - 3-4 chars: allow 1 typo
 * - 5-7 chars: allow 2 typos
 * - 8+ chars: allow 3 typos or 30% of length
 *
 * @param {string} a - First string (normalized)
 * @param {string} b - Second string (normalized)
 * @returns {boolean} - True if strings are similar enough
 */
function isSimilar(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;

  const maxLength = Math.max(a.length, b.length);
  const minLength = Math.min(a.length, b.length);

  // If length difference is too large, not similar
  if (maxLength - minLength > 3) return false;

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(a, b);

  let allowedDistance;
  if (maxLength <= 4) {
    allowedDistance = 1;
  } else if (maxLength <= 7) {
    allowedDistance = 2;
  } else {
    // For 8+ chars: allow 3 or 30% of length, whichever is greater
    allowedDistance = Math.max(3, Math.floor(maxLength * 0.30));
  }

  return distance <= allowedDistance;
}

/**
 * Normalize an answer for comparison
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 * - Remove common articles (the, a, an) from the beginning
 *
 * @param {string} input - Raw answer
 * @returns {string} - Normalized answer
 */
function normalizeAnswer(input) {
  if (!input || typeof input !== 'string') return '';

  let normalized = input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');  // Collapse multiple spaces

  // Remove leading articles
  const articles = ['the ', 'a ', 'an '];
  for (const article of articles) {
    if (normalized.startsWith(article)) {
      normalized = normalized.slice(article.length);
      break;
    }
  }

  return normalized.trim();
}

/**
 * Parse a player's input into multiple entries
 * Supports comma-separated, newline-separated, or semicolon-separated
 * @param {string} input - Raw player input
 * @returns {Array<string>} - Array of individual entries
 */
function parseMultipleEntries(input) {
  if (!input || typeof input !== 'string') return [];

  // Split by comma, newline, or semicolon
  const entries = input
    .split(/[,;\n]+/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);

  // Remove exact duplicates from the same player (case-insensitive)
  const seen = new Set();
  const unique = [];

  for (const entry of entries) {
    const normalized = entry.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(entry);
    }
  }

  return unique;
}

/**
 * Dedupe a player's own entries using fuzzy matching
 * Prevents a player from submitting "Spain" and "Span" as separate entries
 * @param {Array<string>} entries - Array of raw entries
 * @returns {Array<string>} - Deduplicated entries
 */
function dedupePlayerEntries(entries) {
  if (entries.length <= 1) return entries;

  const normalized = entries.map(e => normalizeAnswer(e));
  const uf = new UnionFind(entries.length);

  // Compare all pairs
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (isSimilar(normalized[i], normalized[j])) {
        uf.union(i, j);
      }
    }
  }

  // Keep only one entry per group (the first one)
  const groups = uf.getGroups();
  return groups.map(group => entries[group[0]]);
}

/**
 * Find duplicates among all answers using fuzzy matching
 * Uses Union-Find for proper transitive grouping
 * @param {Array} answers - Array of { playerId, playerName, answer } objects
 * @returns {Array} - Array of marked entries with unique/duplicate status
 */
function findDuplicates(answers) {
  // Expand all answers into individual entries
  const allEntries = [];

  answers.forEach(a => {
    let entries = parseMultipleEntries(a.answer);

    // Dedupe player's own entries first using fuzzy matching
    entries = dedupePlayerEntries(entries);

    entries.forEach((entry, index) => {
      allEntries.push({
        playerId: a.playerId,
        playerName: a.playerName,
        answer: entry,
        normalized: normalizeAnswer(entry),
        entryIndex: index
      });
    });
  });

  if (allEntries.length === 0) {
    return [];
  }

  // Use Union-Find to group similar answers (handles transitive matching)
  const uf = new UnionFind(allEntries.length);

  // Compare all pairs of entries for similarity
  for (let i = 0; i < allEntries.length; i++) {
    for (let j = i + 1; j < allEntries.length; j++) {
      if (isSimilar(allEntries[i].normalized, allEntries[j].normalized)) {
        uf.union(i, j);
      }
    }
  }

  // Get groups from Union-Find
  const groups = uf.getGroups();

  // Mark entries as unique or duplicate
  const markedEntries = allEntries.map((entry, idx) => {
    const group = groups.find(g => g.includes(idx));
    const groupEntries = group.map(i => allEntries[i]);

    // Check if multiple DIFFERENT players have entries in this group
    const playersInGroup = new Set(groupEntries.map(e => e.playerId));
    const isUnique = playersInGroup.size === 1;

    // Find the "canonical" answer (most common spelling in group)
    const spellings = {};
    groupEntries.forEach(e => {
      spellings[e.answer] = (spellings[e.answer] || 0) + 1;
    });
    const canonicalAnswer = Object.keys(spellings).reduce((a, b) =>
      spellings[a] > spellings[b] ? a : b
    );

    return {
      ...entry,
      unique: isUnique,
      groupSize: playersInGroup.size,
      duplicateWith: isUnique ? [] : groupEntries
        .filter(e => e.playerId !== entry.playerId)
        .map(e => e.playerName),
      canonicalAnswer
    };
  });

  return markedEntries;
}

/**
 * Calculate points for a round using new scoring model:
 * - +1 for each unique entry
 * - -1 for each duplicate entry
 * - +1 bonus for every 3 unique answers (volume bonus)
 *
 * @param {Array} markedAnswers - Array from findDuplicates
 * @returns {Object} - { playerId: points }
 */
function calculateRoundPoints(markedAnswers) {
  const playerStats = {};

  markedAnswers.forEach(entry => {
    if (!playerStats[entry.playerId]) {
      playerStats[entry.playerId] = {
        points: 0,
        uniqueCount: 0,
        duplicateCount: 0,
        volumeBonus: 0,
        entries: []
      };
    }

    const stats = playerStats[entry.playerId];

    if (entry.unique) {
      stats.points += 1;
      stats.uniqueCount += 1;
    } else {
      stats.points -= 1;  // Penalty for duplicates
      stats.duplicateCount += 1;
    }

    stats.entries.push({
      answer: entry.answer,
      unique: entry.unique,
      duplicateWith: entry.duplicateWith || []
    });
  });

  // Apply volume bonus: +1 for every 3 unique answers
  Object.keys(playerStats).forEach(playerId => {
    const stats = playerStats[playerId];
    stats.volumeBonus = Math.floor(stats.uniqueCount / 3);
    stats.points += stats.volumeBonus;
  });

  // Convert to simple points object for compatibility
  const points = {};
  Object.keys(playerStats).forEach(playerId => {
    points[playerId] = playerStats[playerId].points;
  });

  return points;
}

/**
 * Get detailed round results for display
 * Includes breakdown of unique points, duplicate penalties, and volume bonus
 * @param {Array} markedAnswers - Array from findDuplicates
 * @returns {Object} - Detailed stats per player with breakdown
 */
function getDetailedResults(markedAnswers) {
  const playerStats = {};

  markedAnswers.forEach(entry => {
    if (!playerStats[entry.playerId]) {
      playerStats[entry.playerId] = {
        playerName: entry.playerName,
        points: 0,
        uniqueCount: 0,
        duplicateCount: 0,
        volumeBonus: 0,
        breakdown: {
          uniquePoints: 0,
          duplicatePenalty: 0,
          volumeBonus: 0
        },
        entries: []
      };
    }

    const stats = playerStats[entry.playerId];

    if (entry.unique) {
      stats.uniqueCount += 1;
      stats.breakdown.uniquePoints += 1;
    } else {
      stats.duplicateCount += 1;
      stats.breakdown.duplicatePenalty -= 1;
    }

    stats.entries.push({
      answer: entry.answer,
      unique: entry.unique,
      duplicateWith: entry.duplicateWith || []
    });
  });

  // Calculate final points with volume bonus
  Object.keys(playerStats).forEach(playerId => {
    const stats = playerStats[playerId];
    stats.volumeBonus = Math.floor(stats.uniqueCount / 3);
    stats.breakdown.volumeBonus = stats.volumeBonus;
    stats.points = stats.breakdown.uniquePoints + stats.breakdown.duplicatePenalty + stats.breakdown.volumeBonus;
  });

  return playerStats;
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
  const scoreValues = Object.values(scores);
  if (scoreValues.length === 0) return [];

  const maxScore = Math.max(...scoreValues);
  return Object.keys(scores).filter(id => scores[id] === maxScore);
}

module.exports = {
  findDuplicates,
  calculateRoundPoints,
  getDetailedResults,
  updateScores,
  getWinners,
  parseMultipleEntries,
  dedupePlayerEntries,
  normalizeAnswer,
  isSimilar,
  levenshteinDistance,
  UnionFind
};
