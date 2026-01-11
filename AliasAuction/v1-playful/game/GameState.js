// Game State Manager for Alias Auction

const { getRandomWord } = require('./words');
const { calculateScore, getPointsForBid } = require('./scoring');

// Game phases
const PHASES = {
  LOBBY: 'LOBBY',
  WORD_REVEAL: 'WORD_REVEAL',
  BIDDING: 'BIDDING',
  DESCRIBING: 'DESCRIBING',
  VOTING: 'VOTING',
  RESULTS: 'RESULTS',
  GAME_OVER: 'GAME_OVER'
};

// Game length options
const GAME_LENGTHS = {
  quick: 5,
  standard: 7,
  extended: 10
};

// Timer durations (in seconds)
const TIMERS = {
  WORD_REVEAL: 3,
  BIDDING: 30,
  BIDDING_IDLE: 5,  // Time after last bid before bidding ends
  DESCRIBING: 20,
  VOTING: 15,
  RESULTS: 5
};

// Player colors for the playful variant
const PLAYER_COLORS = [
  '#7C3AED', // Purple
  '#EC4899', // Pink
  '#FBBF24', // Yellow
  '#84CC16', // Green
  '#3B82F6', // Blue
  '#F97316'  // Orange
];

class GameState {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.phase = PHASES.LOBBY;
    this.players = new Map(); // playerId -> player info
    this.hostId = null;

    // Game settings
    this.difficulty = 'medium';
    this.totalRounds = GAME_LENGTHS.standard;

    // Current round state
    this.currentRound = 0;
    this.currentWord = null;
    this.currentBid = 5; // Starting bid
    this.currentBidderId = null;
    this.lastBidTime = null;
    this.description = null;
    this.votes = new Map(); // playerId -> boolean (true = success)

    // Timer
    this.timer = 0;
    this.timerInterval = null;

    // Used words to avoid repeats
    this.usedWords = new Set();
  }

  // Generate a unique player ID
  static generatePlayerId() {
    return 'p' + Math.random().toString(36).substr(2, 9);
  }

  // Add a player to the game
  addPlayer(playerId, playerName, ws) {
    if (this.players.size >= 6) {
      return { success: false, error: 'Game is full (max 6 players)' };
    }

    if (this.phase !== PHASES.LOBBY) {
      return { success: false, error: 'Game has already started' };
    }

    const colorIndex = this.players.size % PLAYER_COLORS.length;

    const player = {
      id: playerId,
      name: playerName,
      score: 0,
      color: PLAYER_COLORS[colorIndex],
      ws: ws
    };

    this.players.set(playerId, player);

    // First player becomes host
    if (!this.hostId) {
      this.hostId = playerId;
    }

    return { success: true, player };
  }

  // Remove a player
  removePlayer(playerId) {
    this.players.delete(playerId);

    // If host left, assign new host
    if (this.hostId === playerId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
  }

  // Start the game
  startGame(settings = {}) {
    if (this.players.size < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    this.difficulty = settings.difficulty || 'medium';
    this.totalRounds = GAME_LENGTHS[settings.gameLength] || GAME_LENGTHS.standard;
    this.currentRound = 0;

    // Reset all scores
    for (const player of this.players.values()) {
      player.score = 0;
    }

    return { success: true };
  }

  // Start a new round
  startRound() {
    this.currentRound++;
    this.currentBid = 5;
    this.currentBidderId = null;
    this.lastBidTime = null;
    this.description = null;
    this.votes.clear();

    // Get a new word that hasn't been used
    let word;
    let attempts = 0;
    do {
      word = getRandomWord(this.difficulty);
      attempts++;
    } while (this.usedWords.has(word) && attempts < 50);

    this.currentWord = word;
    this.usedWords.add(word);

    return word;
  }

  // Place a bid
  placeBid(playerId, wordCount) {
    if (this.phase !== PHASES.BIDDING) {
      return { success: false, error: 'Not in bidding phase' };
    }

    if (wordCount >= this.currentBid) {
      return { success: false, error: 'Bid must be lower than current bid' };
    }

    if (wordCount < 1 || wordCount > 5) {
      return { success: false, error: 'Bid must be between 1 and 5' };
    }

    this.currentBid = wordCount;
    this.currentBidderId = playerId;
    this.lastBidTime = Date.now();

    return {
      success: true,
      bid: wordCount,
      bidderId: playerId,
      bidderName: this.players.get(playerId)?.name
    };
  }

  // Submit description
  submitDescription(playerId, text) {
    if (this.phase !== PHASES.DESCRIBING) {
      return { success: false, error: 'Not in describing phase' };
    }

    if (playerId !== this.currentBidderId) {
      return { success: false, error: 'Only the lowest bidder can describe' };
    }

    // Count words in description
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (wordCount > this.currentBid) {
      return { success: false, error: `Too many words! You bid ${this.currentBid}, but used ${wordCount}` };
    }

    this.description = text.trim();
    return { success: true, description: this.description, wordCount };
  }

  // Submit vote
  submitVote(playerId, vote) {
    if (this.phase !== PHASES.VOTING) {
      return { success: false, error: 'Not in voting phase' };
    }

    if (playerId === this.currentBidderId) {
      return { success: false, error: 'Describer cannot vote' };
    }

    this.votes.set(playerId, vote);

    // Check if all eligible voters have voted
    const eligibleVoters = Array.from(this.players.keys()).filter(id => id !== this.currentBidderId);
    const allVoted = eligibleVoters.every(id => this.votes.has(id));

    return { success: true, allVoted };
  }

  // Calculate round results
  calculateResults() {
    const successVotes = Array.from(this.votes.values()).filter(v => v === true).length;
    const failVotes = Array.from(this.votes.values()).filter(v => v === false).length;

    // Majority wins, ties go to describer
    const success = successVotes >= failVotes;

    const points = calculateScore(this.currentBid, success);
    const describer = this.players.get(this.currentBidderId);

    if (describer) {
      describer.score += points;
    }

    return {
      success,
      successVotes,
      failVotes,
      points,
      describerName: describer?.name,
      newScore: describer?.score
    };
  }

  // Check if game is over
  isGameOver() {
    return this.currentRound >= this.totalRounds;
  }

  // Get winner(s)
  getWinner() {
    let maxScore = -Infinity;
    let winners = [];

    for (const player of this.players.values()) {
      if (player.score > maxScore) {
        maxScore = player.score;
        winners = [player];
      } else if (player.score === maxScore) {
        winners.push(player);
      }
    }

    return winners;
  }

  // Get scores sorted by rank
  getScoreboard() {
    return Array.from(this.players.values())
      .map(p => ({ id: p.id, name: p.name, score: p.score, color: p.color }))
      .sort((a, b) => b.score - a.score);
  }

  // Get public state (safe to send to clients)
  getPublicState() {
    const players = Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      color: p.color
    }));

    return {
      roomCode: this.roomCode,
      phase: this.phase,
      players,
      hostId: this.hostId,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentWord: this.currentWord,
      currentBid: this.currentBid,
      currentBidderId: this.currentBidderId,
      currentBidderName: this.players.get(this.currentBidderId)?.name,
      description: this.description,
      timer: this.timer,
      votesReceived: this.votes.size,
      totalVoters: this.players.size - 1,
      potentialPoints: getPointsForBid(this.currentBid)
    };
  }

  // Set phase
  setPhase(phase) {
    this.phase = phase;
  }

  // Set timer
  setTimer(seconds) {
    this.timer = seconds;
  }

  // Decrement timer
  decrementTimer() {
    if (this.timer > 0) {
      this.timer--;
    }
    return this.timer;
  }
}

module.exports = {
  GameState,
  PHASES,
  TIMERS,
  GAME_LENGTHS
};
