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

// Retro neon colors for players
const PLAYER_COLORS = [
  '#00D4FF', // Electric Blue
  '#FF00FF', // Neon Pink
  '#00FF00', // Bright Green
  '#FFFF00', // Yellow
  '#FF6600', // Orange
  '#FF0066'  // Hot Pink
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
      return { success: false, error: 'GAME FULL - MAX 6 PLAYERS' };
    }

    if (this.phase !== PHASES.LOBBY) {
      return { success: false, error: 'GAME IN PROGRESS' };
    }

    const colorIndex = this.players.size % PLAYER_COLORS.length;

    const player = {
      id: playerId,
      name: playerName.toUpperCase(),
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
      return { success: false, error: 'NEED 2+ PLAYERS' };
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
      return { success: false, error: 'NOT BIDDING PHASE' };
    }

    if (wordCount >= this.currentBid) {
      return { success: false, error: 'BID MUST BE LOWER' };
    }

    if (wordCount < 1 || wordCount > 5) {
      return { success: false, error: 'INVALID BID' };
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
      return { success: false, error: 'NOT DESCRIBE PHASE' };
    }

    if (playerId !== this.currentBidderId) {
      return { success: false, error: 'NOT YOUR TURN' };
    }

    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (wordCount > this.currentBid) {
      return { success: false, error: `TOO MANY WORDS! MAX ${this.currentBid}` };
    }

    this.description = text.trim().toUpperCase();
    return { success: true, description: this.description, wordCount };
  }

  submitVote(playerId, vote) {
    if (this.phase !== PHASES.VOTING) {
      return { success: false, error: 'NOT VOTING PHASE' };
    }

    if (playerId === this.currentBidderId) {
      return { success: false, error: 'CANNOT VOTE ON YOURSELF' };
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
