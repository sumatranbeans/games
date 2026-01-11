// Quick Think - v2-minimal TV Display Application

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
      joinUrl: document.getElementById('join-url'),
      playerList: document.getElementById('player-list'),
      gameLength: document.getElementById('game-length'),
      startBtn: document.getElementById('start-btn'),

      currentRound: document.getElementById('current-round'),
      totalRounds: document.getElementById('total-rounds'),
      categoryText: document.getElementById('category-text'),

      countdownNumber: document.getElementById('countdown-number'),

      categoryReminder: document.getElementById('category-reminder'),
      typingTimer: document.getElementById('typing-timer'),
      playerStatus: document.getElementById('player-status'),

      revealCategory: document.getElementById('reveal-category'),
      answerList: document.getElementById('answer-list'),

      scoreBody: document.getElementById('score-body'),

      winnerName: document.getElementById('winner-name'),
      finalBody: document.getElementById('final-body'),
      playAgainBtn: document.getElementById('play-again-btn')
    };
  }

  bindEvents() {
    this.elements.startBtn.addEventListener('click', () => this.startGame());
    this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());
    this.elements.gameLength.addEventListener('change', (e) => {
      this.gameLength = e.target.value;
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
      this.elements.joinUrl.textContent = qrData.joinUrl;

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
        this.elements.totalRounds.textContent = payload.totalRounds;
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
    this.elements.playerList.innerHTML = '';

    this.players.forEach(player => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${player.name}</span>
        ${player.isHost ? '<span class="host-indicator">Host</span>' : ''}
      `;
      this.elements.playerList.appendChild(li);
    });
  }

  updateStartButton() {
    const canStart = this.players.length >= 2;
    this.elements.startBtn.disabled = !canStart;
    this.elements.startBtn.textContent = canStart ? 'Start' : `Need ${2 - this.players.length} more`;
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
    this.elements.currentRound.textContent = payload.round;
    this.elements.totalRounds.textContent = payload.totalRounds;
    this.elements.categoryText.textContent = payload.category;
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
    this.updatePlayerStatus();
    this.showScreen('typing');
  }

  updatePlayerStatus() {
    this.elements.playerStatus.innerHTML = '';

    this.players.forEach(player => {
      const div = document.createElement('div');
      div.className = `player-indicator${this.submittedPlayers.has(player.id) ? ' submitted' : ''}`;
      div.id = `status-${player.id}`;
      div.textContent = player.name;
      this.elements.playerStatus.appendChild(div);
    });
  }

  markPlayerSubmitted(playerId) {
    this.submittedPlayers.add(playerId);
    const indicator = document.getElementById(`status-${playerId}`);
    if (indicator) {
      indicator.classList.add('submitted');
    }
  }

  updateTimer(remaining) {
    if (this.screens.countdown.classList.contains('active')) {
      this.elements.countdownNumber.textContent = remaining === 0 ? 'GO' : remaining;
    }

    if (this.screens.typing.classList.contains('active')) {
      this.elements.typingTimer.textContent = remaining;
      if (remaining <= 3) {
        this.elements.typingTimer.classList.add('low');
      }
    }
  }

  showReveal() {
    this.elements.revealCategory.textContent = this.elements.categoryText.textContent;
    this.elements.answerList.innerHTML = '';
    this.showScreen('reveal');
  }

  revealAnswer(payload) {
    const li = document.createElement('li');
    li.className = `answer-item ${payload.unique ? 'unique' : 'eliminated'}`;

    li.innerHTML = `
      <div>
        <span class="player">${payload.playerName}</span>
        <span class="answer">${payload.answer || '(no answer)'}</span>
      </div>
      <span class="status">${payload.unique ? '+1' : 'x'}</span>
    `;

    this.elements.answerList.appendChild(li);
  }

  showScoring(payload) {
    this.elements.scoreBody.innerHTML = '';

    const sortedPlayers = [...this.players].sort((a, b) => {
      return (payload.scores[b.id] || 0) - (payload.scores[a.id] || 0);
    });

    sortedPlayers.forEach(player => {
      const tr = document.createElement('tr');
      const score = payload.scores[player.id] || 0;
      const roundPoints = payload.roundPoints[player.id] || 0;

      tr.innerHTML = `
        <td>${player.name}</td>
        <td class="score-change ${roundPoints === 0 ? 'zero' : ''}">${roundPoints > 0 ? '+' + roundPoints : '0'}</td>
        <td>${score}</td>
      `;

      this.elements.scoreBody.appendChild(tr);
    });

    this.showScreen('scoring');
  }

  showGameOver(payload) {
    const winnerNames = payload.winners.map(id => {
      const player = payload.players.find(p => p.id === id);
      return player ? player.name : 'Unknown';
    });

    this.elements.winnerName.textContent = winnerNames.join(' & ');

    this.elements.finalBody.innerHTML = '';

    const sortedPlayers = [...payload.players].sort((a, b) => {
      return (payload.finalScores[b.id] || 0) - (payload.finalScores[a.id] || 0);
    });

    sortedPlayers.forEach((player, index) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${player.name}</td>
        <td>${payload.finalScores[player.id] || 0}</td>
      `;

      this.elements.finalBody.appendChild(tr);
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
