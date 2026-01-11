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
  BIDDING_IDLE: 5,
  DESCRIBING: 20,
  VOTING: 15,
  RESULTS: 5
};

// Minimal gray tones for players
const PLAYER_COLORS = [
  '#000000',
  '#374151',
  '#6B7280',
  '#9CA3AF',
  '#D1D5DB',
  '#F3F4F6'
];

class GameState {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.phase = PHASES.LOBBY;
    this.players = new Map();
    this.hostId = null;

    this.difficulty = 'medium';
    this.totalRounds = GAME_LENGTHS.standard;

    this.currentRound = 0;
    this.currentWord = null;
    this.currentBid = 5;
    this.currentBidderId = null;
    this.lastBidTime = null;
    this.description = null;
    this.votes = new Map();

    this.timer = 0;
    this.timerInterval = null;

    this.usedWords = new Set();
  }

  static generatePlayerId() {
    return 'p' + Math.random().toString(36).substr(2, 9);
  }

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

    if (!this.hostId) {
      this.hostId = playerId;
    }

    return { success: true, player };
  }

  removePlayer(playerId) {
    this.players.delete(playerId);

    if (this.hostId === playerId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
  }

  startGame(settings = {}) {
    if (this.players.size < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    this.difficulty = settings.difficulty || 'medium';
    this.totalRounds = GAME_LENGTHS[settings.gameLength] || GAME_LENGTHS.standard;
    this.currentRound = 0;

    for (const player of this.players.values()) {
      player.score = 0;
    }

    return { success: true };
  }

  startRound() {
    this.currentRound++;
    this.currentBid = 5;
    this.currentBidderId = null;
    this.lastBidTime = null;
    this.description = null;
    this.votes.clear();

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

  submitDescription(playerId, text) {
    if (this.phase !== PHASES.DESCRIBING) {
      return { success: false, error: 'Not in describing phase' };
    }

    if (playerId !== this.currentBidderId) {
      return { success: false, error: 'Only the lowest bidder can describe' };
    }

    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (wordCount > this.currentBid) {
      return { success: false, error: `Too many words! You bid ${this.currentBid}, but used ${wordCount}` };
    }

    this.description = text.trim();
    return { success: true, description: this.description, wordCount };
  }

  submitVote(playerId, vote) {
    if (this.phase !== PHASES.VOTING) {
      return { success: false, error: 'Not in voting phase' };
    }

    if (playerId === this.currentBidderId) {
      return { success: false, error: 'Describer cannot vote' };
    }

    this.votes.set(playerId, vote);

    const eligibleVoters = Array.from(this.players.keys()).filter(id => id !== this.currentBidderId);
    const allVoted = eligibleVoters.every(id => this.votes.has(id));

    return { success: true, allVoted };
  }

  calculateResults() {
    const successVotes = Array.from(this.votes.values()).filter(v => v === true).length;
    const failVotes = Array.from(this.votes.values()).filter(v => v === false).length;

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

  isGameOver() {
    return this.currentRound >= this.totalRounds;
  }

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

  getScoreboard() {
    return Array.from(this.players.values())
      .map(p => ({ id: p.id, name: p.name, score: p.score, color: p.color }))
      .sort((a, b) => b.score - a.score);
  }

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

  setPhase(phase) {
    this.phase = phase;
  }

  setTimer(seconds) {
    this.timer = seconds;
  }

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
