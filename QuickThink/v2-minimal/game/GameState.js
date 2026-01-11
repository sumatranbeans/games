// Quick Think - Game State Management

const { getRandomCategory, getCategoriesForGame } = require('./categories');
const { findDuplicates, calculateRoundPoints, updateScores, getWinners } = require('./scoring');

// Game phases
const PHASES = {
  LOBBY: 'LOBBY',
  CATEGORY_REVEAL: 'CATEGORY_REVEAL',
  COUNTDOWN: 'COUNTDOWN',
  TYPING: 'TYPING',
  LOCKED: 'LOCKED',
  REVEAL: 'REVEAL',
  SCORING: 'SCORING',
  GAME_OVER: 'GAME_OVER'
};

// Game length options
const GAME_LENGTHS = {
  quick: 5,
  standard: 10,
  extended: 15
};

// Timing constants (in milliseconds)
const TIMING = {
  CATEGORY_REVEAL: 3000,
  COUNTDOWN: 3000,
  TYPING: 10000,
  REVEAL_PER_ANSWER: 1500,
  SCORING: 3000
};

class GameState {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.phase = PHASES.LOBBY;
    this.players = new Map();
    this.hostId = null;

    this.totalRounds = GAME_LENGTHS.standard;
    this.currentRound = 0;

    this.currentCategory = null;
    this.categories = [];
    this.answers = new Map();
    this.markedAnswers = [];
    this.revealIndex = 0;

    this.scores = {};

    this.timer = null;
    this.timerValue = 0;
  }

  addPlayer(playerId, playerName, ws) {
    if (this.phase !== PHASES.LOBBY) {
      return { success: false, error: 'Game already started' };
    }

    if (this.players.size >= 6) {
      return { success: false, error: 'Room is full (max 6 players)' };
    }

    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      ws: ws
    });

    this.scores[playerId] = 0;

    if (this.players.size === 1) {
      this.hostId = playerId;
    }

    return { success: true };
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    delete this.scores[playerId];

    if (playerId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
  }

  startGame(gameLength = 'standard') {
    if (this.players.size < 2) {
      return { success: false, error: 'Need at least 2 players' };
    }

    this.totalRounds = GAME_LENGTHS[gameLength] || GAME_LENGTHS.standard;
    this.currentRound = 0;
    this.categories = getCategoriesForGame(this.totalRounds);

    this.players.forEach((player, id) => {
      this.scores[id] = 0;
    });

    return { success: true };
  }

  startRound() {
    this.currentRound++;
    this.currentCategory = this.categories[this.currentRound - 1];
    this.answers.clear();
    this.markedAnswers = [];
    this.revealIndex = 0;
    this.phase = PHASES.CATEGORY_REVEAL;
  }

  startCountdown() {
    this.phase = PHASES.COUNTDOWN;
    this.timerValue = 3;
  }

  startTyping() {
    this.phase = PHASES.TYPING;
    this.timerValue = 10;
  }

  submitAnswer(playerId, answer) {
    if (this.phase !== PHASES.TYPING) {
      return { success: false, error: 'Not in typing phase' };
    }

    this.answers.set(playerId, answer);
    return { success: true };
  }

  lockAnswers() {
    this.phase = PHASES.LOCKED;

    const answersArray = [];
    this.answers.forEach((answer, playerId) => {
      const player = this.players.get(playerId);
      answersArray.push({
        playerId,
        playerName: player ? player.name : 'Unknown',
        answer
      });
    });

    this.players.forEach((player, playerId) => {
      if (!this.answers.has(playerId)) {
        answersArray.push({
          playerId,
          playerName: player.name,
          answer: ''
        });
      }
    });

    this.markedAnswers = findDuplicates(answersArray).sort(() => Math.random() - 0.5);
  }

  startReveal() {
    this.phase = PHASES.REVEAL;
    this.revealIndex = 0;
  }

  revealNext() {
    if (this.revealIndex < this.markedAnswers.length) {
      const answer = this.markedAnswers[this.revealIndex];
      this.revealIndex++;
      return answer;
    }
    return null;
  }

  calculateScores() {
    this.phase = PHASES.SCORING;

    const roundPoints = calculateRoundPoints(this.markedAnswers);
    this.scores = updateScores(this.scores, roundPoints);

    return roundPoints;
  }

  isGameOver() {
    return this.currentRound >= this.totalRounds;
  }

  endGame() {
    this.phase = PHASES.GAME_OVER;
    return {
      winners: getWinners(this.scores),
      finalScores: { ...this.scores }
    };
  }

  reset() {
    this.phase = PHASES.LOBBY;
    this.currentRound = 0;
    this.currentCategory = null;
    this.categories = [];
    this.answers.clear();
    this.markedAnswers = [];
    this.revealIndex = 0;

    this.players.forEach((player, id) => {
      this.scores[id] = 0;
    });
  }

  getPlayerList() {
    const list = [];
    this.players.forEach((player, id) => {
      list.push({
        id: player.id,
        name: player.name,
        score: this.scores[id] || 0,
        isHost: id === this.hostId
      });
    });
    return list;
  }

  getState() {
    return {
      phase: this.phase,
      roomCode: this.roomCode,
      players: this.getPlayerList(),
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentCategory: this.currentCategory,
      timerValue: this.timerValue,
      scores: { ...this.scores },
      hostId: this.hostId
    };
  }
}

module.exports = {
  GameState,
  PHASES,
  TIMING,
  GAME_LENGTHS
};
