// Quick Think - v1-playful TV Display Application

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
    // Screens
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

    // Elements
    this.elements = {
      roomCode: document.getElementById('room-code'),
      qrCode: document.getElementById('qr-code'),
      playersGrid: document.getElementById('players-grid'),
      waitingText: document.getElementById('waiting-text'),
      startBtn: document.getElementById('start-btn'),
      lengthBtns: document.querySelectorAll('.length-btn'),

      currentRound: document.getElementById('current-round'),
      totalRounds: document.getElementById('total-rounds'),
      categoryText: document.getElementById('category-text'),

      countdownNumber: document.getElementById('countdown-number'),

      categoryReminder: document.getElementById('category-reminder'),
      typingTimer: document.getElementById('typing-timer'),
      typingIndicators: document.getElementById('typing-indicators'),

      revealCategory: document.getElementById('reveal-category'),
      answersContainer: document.getElementById('answers-container'),

      scoreboard: document.getElementById('scoreboard'),

      winnerName: document.getElementById('winner-name'),
      finalScores: document.getElementById('final-scores'),
      playAgainBtn: document.getElementById('play-again-btn'),
      confetti: document.getElementById('confetti')
    };
  }

  bindEvents() {
    this.elements.startBtn.addEventListener('click', () => this.startGame());
    this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());

    this.elements.lengthBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.elements.lengthBtns.forEach(b => b.classList.remove('active'));
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

      // Get QR code
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
      console.log('WebSocket closed');
      // Attempt to reconnect after 3 seconds
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

      case 'ERROR':
        console.error('Server error:', payload.message);
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
    this.elements.playersGrid.innerHTML = '';

    this.players.forEach(player => {
      const card = document.createElement('div');
      card.className = `player-card${player.isHost ? ' host' : ''}`;
      card.innerHTML = `
        <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
        <div class="player-name">${player.name}</div>
        ${player.isHost ? '<div class="host-badge">HOST</div>' : ''}
      `;
      this.elements.playersGrid.appendChild(card);
    });

    this.elements.waitingText.style.display = this.players.length === 0 ? 'block' : 'none';
  }

  updateStartButton() {
    const canStart = this.players.length >= 2;
    this.elements.startBtn.disabled = !canStart;
    this.elements.startBtn.textContent = canStart
      ? 'START GAME!'
      : `Need ${2 - this.players.length} more player${this.players.length === 1 ? '' : 's'}`;
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

      case 'LOCKED':
        // Brief pause handled by server
        break;

      case 'REVEAL':
        this.showReveal(payload);
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
    this.submittedPlayers.clear();
    this.updateTypingIndicators();
    this.showScreen('typing');
  }

  updateTypingIndicators() {
    this.elements.typingIndicators.innerHTML = '';

    this.players.forEach(player => {
      const indicator = document.createElement('div');
      indicator.className = `typing-indicator${this.submittedPlayers.has(player.id) ? ' submitted' : ''}`;
      indicator.id = `typing-${player.id}`;
      indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-name">${player.name}</div>
      `;
      this.elements.typingIndicators.appendChild(indicator);
    });
  }

  markPlayerSubmitted(playerId) {
    this.submittedPlayers.add(playerId);
    const indicator = document.getElementById(`typing-${playerId}`);
    if (indicator) {
      indicator.classList.add('submitted');
    }
  }

  updateTimer(remaining) {
    // Update countdown screen
    if (this.screens.countdown.classList.contains('active')) {
      this.elements.countdownNumber.textContent = remaining;
      if (remaining === 0) {
        this.elements.countdownNumber.textContent = 'GO!';
      }
    }

    // Update typing screen
    if (this.screens.typing.classList.contains('active')) {
      this.elements.typingTimer.textContent = remaining;

      // Visual feedback for low time
      if (remaining <= 3) {
        this.elements.typingTimer.style.color = '#EF4444';
        this.elements.typingTimer.style.transform = 'scale(1.2)';
      } else {
        this.elements.typingTimer.style.color = 'white';
        this.elements.typingTimer.style.transform = 'scale(1)';
      }
    }
  }

  showReveal(payload) {
    this.elements.revealCategory.textContent = this.elements.categoryText.textContent;
    this.elements.answersContainer.innerHTML = '';
    this.showScreen('reveal');
  }

  revealAnswer(payload) {
    const card = document.createElement('div');
    card.className = `answer-card ${payload.unique ? 'unique' : 'eliminated'}`;

    const statusText = payload.unique ? 'UNIQUE!' : 'ELIMINATED!';
    const statusIcon = payload.unique ? '+1' : 'X';

    card.innerHTML = `
      <div class="answer-player">${payload.playerName}</div>
      <div class="answer-text">${payload.answer || '(no answer)'}</div>
      <div class="answer-status">
        ${statusText}
        <span class="status-icon">${statusIcon}</span>
      </div>
    `;

    this.elements.answersContainer.appendChild(card);
  }

  showScoring(payload) {
    this.elements.scoreboard.innerHTML = '';

    // Sort players by score
    const sortedPlayers = [...this.players].sort((a, b) => {
      return (payload.scores[b.id] || 0) - (payload.scores[a.id] || 0);
    });

    sortedPlayers.forEach((player, index) => {
      const card = document.createElement('div');
      card.className = 'score-card';
      card.style.animationDelay = `${index * 0.1}s`;

      const score = payload.scores[player.id] || 0;
      const roundPoints = payload.roundPoints[player.id] || 0;

      card.innerHTML = `
        <div class="score-name">${player.name}</div>
        <div class="score-points">${score}</div>
        <div class="score-change ${roundPoints === 0 ? 'zero' : ''}">
          ${roundPoints > 0 ? '+' + roundPoints : '+0'}
        </div>
      `;

      this.elements.scoreboard.appendChild(card);
    });

    this.showScreen('scoring');
  }

  showGameOver(payload) {
    // Determine winner(s)
    const winnerNames = payload.winners.map(id => {
      const player = payload.players.find(p => p.id === id);
      return player ? player.name : 'Unknown';
    });

    this.elements.winnerName.textContent = winnerNames.join(' & ');

    // Display final scores
    this.elements.finalScores.innerHTML = '';

    const sortedPlayers = [...payload.players].sort((a, b) => {
      return (payload.finalScores[b.id] || 0) - (payload.finalScores[a.id] || 0);
    });

    sortedPlayers.forEach(player => {
      const card = document.createElement('div');
      const isWinner = payload.winners.includes(player.id);
      card.className = `final-score-card ${isWinner ? 'winner' : ''}`;

      card.innerHTML = `
        <div class="final-score-name">${player.name}</div>
        <div class="final-score-points">${payload.finalScores[player.id] || 0}</div>
      `;

      this.elements.finalScores.appendChild(card);
    });

    this.showScreen('gameover');
    this.launchConfetti();
  }

  launchConfetti() {
    this.elements.confetti.innerHTML = '';
    const colors = ['#3B82F6', '#F97316', '#EAB308', '#22C55E', '#EF4444', '#6366F1'];

    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = `${Math.random() * 2}s`;
      confetti.style.width = `${Math.random() * 10 + 5}px`;
      confetti.style.height = `${Math.random() * 10 + 5}px`;
      this.elements.confetti.appendChild(confetti);
    }
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new QuickThinkTV();
});
