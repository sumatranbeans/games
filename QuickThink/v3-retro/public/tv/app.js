// Quick Think - v3-retro TV Display Application

class QuickThinkTV {
  constructor() {
    this.ws = null;
    this.roomCode = null;
    this.players = [];
    this.gameLength = 'standard';
    this.submittedPlayers = new Set();

    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
    this.createRoom();
  }

  bindElements() {
    this.screens = {
      loading: document.getElementById('loading-screen'),
      lobby: document.getElementById('lobby-screen'),
      category: document.getElementById('category-screen'),
      countdown: document.getElementById('countdown-screen'),
      typing: document.getElementById('typing-screen'),
      reveal: document.getElementById('reveal-screen'),
      scoring: document.getElementById('scoring-screen'),
      gameover: document.getElementById('gameover-screen')
    };

    this.elements = {
      roomCode: document.getElementById('room-code'),
      qrCode: document.getElementById('qr-code'),
      playerSlots: document.getElementById('player-slots'),
      roundBtns: document.querySelectorAll('.round-btn'),
      startBtn: document.getElementById('start-btn'),

      currentRound: document.getElementById('current-round'),
      totalRounds: document.getElementById('total-rounds'),
      categoryText: document.getElementById('category-text'),

      countdownNumber: document.getElementById('countdown-number'),

      categoryReminder: document.getElementById('category-reminder'),
      typingTimer: document.getElementById('typing-timer'),
      playerLights: document.getElementById('player-lights'),

      answersBoard: document.getElementById('answers-board'),

      scoreList: document.getElementById('score-list'),

      winnerName: document.getElementById('winner-name'),
      finalRankings: document.getElementById('final-rankings'),
      playAgainBtn: document.getElementById('play-again-btn')
    };
  }

  bindEvents() {
    this.elements.startBtn.addEventListener('click', () => this.startGame());
    this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());

    this.elements.roundBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.elements.roundBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.gameLength = e.target.dataset.length;
      });
    });
  }

  async createRoom() {
    try {
      const response = await fetch('/api/create-room');
      const data = await response.json();
      this.roomCode = data.roomCode;

      const qrResponse = await fetch(`/api/qr/${this.roomCode}`);
      const qrData = await qrResponse.json();

      this.elements.roomCode.textContent = this.roomCode;
      this.elements.qrCode.src = qrData.qrDataUrl;

      this.connectWebSocket();
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}`);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({
        type: 'TV_JOIN',
        payload: { roomCode: this.roomCode }
      }));
      this.showScreen('lobby');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'ROOM_STATE':
        this.updateRoomState(payload);
        break;

      case 'PLAYER_JOINED':
        this.updatePlayers(payload.players);
        break;

      case 'PLAYER_LEFT':
        this.updatePlayers(payload.players);
        break;

      case 'GAME_STARTED':
        this.elements.totalRounds.textContent = String(payload.totalRounds).padStart(2, '0');
        break;

      case 'PHASE_CHANGE':
        this.handlePhaseChange(payload);
        break;

      case 'TIMER':
        this.updateTimer(payload.remaining);
        break;

      case 'PLAYER_SUBMITTED':
        this.markPlayerSubmitted(payload.playerId);
        break;

      case 'REVEAL_ANSWER':
        this.revealAnswer(payload);
        break;

      case 'GAME_RESET':
        this.resetGame(payload);
        break;
    }
  }

  updateRoomState(state) {
    this.players = state.players;
    this.updatePlayersDisplay();
    this.updateStartButton();
  }

  updatePlayers(players) {
    this.players = players;
    this.updatePlayersDisplay();
    this.updateStartButton();
  }

  updatePlayersDisplay() {
    const slots = this.elements.playerSlots.querySelectorAll('.player-slot');

    slots.forEach((slot, index) => {
      if (index < this.players.length) {
        const player = this.players[index];
        slot.textContent = `P${index + 1}: ${player.name.toUpperCase()}`;
        slot.classList.remove('empty');
        slot.classList.toggle('host', player.isHost);
      } else {
        slot.textContent = `P${index + 1}: -----`;
        slot.classList.add('empty');
        slot.classList.remove('host');
      }
    });
  }

  updateStartButton() {
    const canStart = this.players.length >= 2;
    this.elements.startBtn.disabled = !canStart;
    this.elements.startBtn.textContent = canStart ? 'PRESS START' : 'NEED PLAYERS';
  }

  startGame() {
    this.ws.send(JSON.stringify({
      type: 'START_GAME',
      payload: { gameLength: this.gameLength }
    }));
  }

  handlePhaseChange(payload) {
    switch (payload.phase) {
      case 'CATEGORY_REVEAL':
        this.showCategoryReveal(payload);
        break;

      case 'COUNTDOWN':
        this.showCountdown(payload.timer);
        break;

      case 'TYPING':
        this.showTyping(payload.timer);
        break;

      case 'REVEAL':
        this.showReveal();
        break;

      case 'SCORING':
        this.showScoring(payload);
        break;

      case 'GAME_OVER':
        this.showGameOver(payload);
        break;
    }
  }

  showCategoryReveal(payload) {
    this.elements.currentRound.textContent = String(payload.round).padStart(2, '0');
    this.elements.totalRounds.textContent = String(payload.totalRounds).padStart(2, '0');
    this.elements.categoryText.textContent = payload.category.toUpperCase();
    this.showScreen('category');
  }

  showCountdown(timer) {
    this.elements.countdownNumber.textContent = timer;
    this.showScreen('countdown');
  }

  showTyping(timer) {
    this.elements.categoryReminder.textContent = this.elements.categoryText.textContent;
    this.elements.typingTimer.textContent = timer;
    this.elements.typingTimer.classList.remove('low');
    this.submittedPlayers.clear();
    this.updatePlayerLights();
    this.showScreen('typing');
  }

  updatePlayerLights() {
    this.elements.playerLights.innerHTML = '';

    this.players.forEach(player => {
      const light = document.createElement('div');
      light.className = 'player-light';
      light.id = `light-${player.id}`;
      light.innerHTML = `
        <div class="indicator"></div>
        <span class="name">${player.name.toUpperCase()}</span>
      `;
      this.elements.playerLights.appendChild(light);
    });
  }

  markPlayerSubmitted(playerId) {
    this.submittedPlayers.add(playerId);
    const light = document.getElementById(`light-${playerId}`);
    if (light) {
      light.classList.add('submitted');
    }
  }

  updateTimer(remaining) {
    if (this.screens.countdown.classList.contains('active')) {
      this.elements.countdownNumber.textContent = remaining === 0 ? 'GO!' : remaining;
    }

    if (this.screens.typing.classList.contains('active')) {
      this.elements.typingTimer.textContent = remaining;
      if (remaining <= 3) {
        this.elements.typingTimer.classList.add('low');
      }
    }
  }

  showReveal() {
    this.elements.answersBoard.innerHTML = '';
    this.showScreen('reveal');
  }

  revealAnswer(payload) {
    const row = document.createElement('div');
    row.className = `answer-row ${payload.unique ? 'unique' : 'eliminated'}`;

    row.innerHTML = `
      <span class="player">${payload.playerName.toUpperCase()}</span>
      <span class="answer">${payload.answer ? payload.answer.toUpperCase() : '-----'}</span>
      <span class="result">${payload.unique ? '+1 PT' : 'X X X'}</span>
    `;

    this.elements.answersBoard.appendChild(row);
  }

  showScoring(payload) {
    this.elements.scoreList.innerHTML = '';

    const sortedPlayers = [...this.players].sort((a, b) => {
      return (payload.scores[b.id] || 0) - (payload.scores[a.id] || 0);
    });

    sortedPlayers.forEach((player, index) => {
      const row = document.createElement('div');
      row.className = 'score-row';

      const score = payload.scores[player.id] || 0;
      const roundPoints = payload.roundPoints[player.id] || 0;

      row.innerHTML = `
        <span class="rank">${String(index + 1).padStart(2, '0')}.</span>
        <span class="name">${player.name.toUpperCase()}</span>
        <span class="change ${roundPoints === 0 ? 'zero' : ''}">+${roundPoints}</span>
        <span class="points">${String(score).padStart(3, '0')}</span>
      `;

      this.elements.scoreList.appendChild(row);
    });

    this.showScreen('scoring');
  }

  showGameOver(payload) {
    const winnerNames = payload.winners.map(id => {
      const player = payload.players.find(p => p.id === id);
      return player ? player.name.toUpperCase() : 'UNKNOWN';
    });

    this.elements.winnerName.textContent = winnerNames.join(' & ');

    this.elements.finalRankings.innerHTML = '';

    const sortedPlayers = [...payload.players].sort((a, b) => {
      return (payload.finalScores[b.id] || 0) - (payload.finalScores[a.id] || 0);
    });

    sortedPlayers.forEach((player, index) => {
      const row = document.createElement('div');
      row.className = 'final-row';

      row.innerHTML = `
        <span>${String(index + 1).padStart(2, '0')}.</span>
        <span>${player.name.toUpperCase()}</span>
        <span>${String(payload.finalScores[player.id] || 0).padStart(3, '0')} PTS</span>
      `;

      this.elements.finalRankings.appendChild(row);
    });

    this.showScreen('gameover');
  }

  playAgain() {
    this.ws.send(JSON.stringify({
      type: 'PLAY_AGAIN',
      payload: {}
    }));
  }

  resetGame(state) {
    this.players = state.players;
    this.updatePlayersDisplay();
    this.updateStartButton();
    this.showScreen('lobby');
  }

  showScreen(screenName) {
    Object.values(this.screens).forEach(screen => {
      screen.classList.remove('active');
    });

    if (this.screens[screenName]) {
      this.screens[screenName].classList.add('active');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QuickThinkTV();
});
