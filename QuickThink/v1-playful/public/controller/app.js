// Quick Think - v1-playful Controller Application

class QuickThinkController {
  constructor() {
    this.ws = null;
    this.roomCode = null;
    this.playerId = null;
    this.playerName = null;
    this.isHost = false;
    this.currentCategory = null;
    this.myScore = 0;

    this.init();
  }

  init() {
    this.getRoomCode();
    this.bindElements();
    this.bindEvents();

    if (this.roomCode) {
      this.connectWebSocket();
    }
  }

  getRoomCode() {
    const params = new URLSearchParams(window.location.search);
    this.roomCode = params.get('room');

    if (this.roomCode) {
      document.getElementById('room-code').textContent = this.roomCode;
    }
  }

  bindElements() {
    this.screens = {
      join: document.getElementById('join-screen'),
      waiting: document.getElementById('waiting-screen'),
      ready: document.getElementById('ready-screen'),
      typing: document.getElementById('typing-screen'),
      locked: document.getElementById('locked-screen'),
      reveal: document.getElementById('reveal-screen'),
      score: document.getElementById('score-screen'),
      gameover: document.getElementById('gameover-screen'),
      error: document.getElementById('error-screen')
    };

    this.elements = {
      playerNameInput: document.getElementById('player-name'),
      joinBtn: document.getElementById('join-btn'),

      playerAvatar: document.getElementById('player-avatar'),
      playerDisplayName: document.getElementById('player-display-name'),
      hostStatus: document.getElementById('host-status'),

      readyCategory: document.getElementById('ready-category'),
      readyCountdown: document.getElementById('ready-countdown'),

      typingCategory: document.getElementById('typing-category'),
      timerDisplay: document.getElementById('timer-display'),
      answerInput: document.getElementById('answer-input'),
      charCount: document.getElementById('char-count'),

      submittedAnswer: document.getElementById('submitted-answer'),

      myScore: document.getElementById('my-score'),
      roundResult: document.getElementById('round-result'),

      resultMessage: document.getElementById('result-message'),
      finalScore: document.getElementById('final-score')
    };
  }

  bindEvents() {
    // Join form
    this.elements.playerNameInput.addEventListener('input', () => {
      const name = this.elements.playerNameInput.value.trim();
      this.elements.joinBtn.disabled = name.length < 1;
    });

    this.elements.playerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.elements.joinBtn.disabled) {
        this.joinGame();
      }
    });

    this.elements.joinBtn.addEventListener('click', () => this.joinGame());

    // Answer input
    this.elements.answerInput.addEventListener('input', () => {
      const answer = this.elements.answerInput.value;
      this.elements.charCount.textContent = answer.length;

      // Auto-submit as they type
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'SUBMIT_ANSWER',
          payload: { answer }
        }));
      }
    });
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}`);

    this.ws.onopen = () => {
      console.log('Connected to server');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.showScreen('error');

      // Attempt to reconnect
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  joinGame() {
    this.playerName = this.elements.playerNameInput.value.trim();

    if (!this.playerName || !this.ws) return;

    this.ws.send(JSON.stringify({
      type: 'JOIN',
      payload: {
        roomCode: this.roomCode,
        playerName: this.playerName
      }
    }));
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'JOINED':
        this.onJoined(payload);
        break;

      case 'GAME_STARTED':
        // Stay on waiting screen, game flow managed by server
        break;

      case 'PHASE_CHANGE':
        this.handlePhaseChange(payload);
        break;

      case 'TIMER':
        this.updateTimer(payload.remaining);
        break;

      case 'ANSWER_RECEIVED':
        // Confirmation of answer submission
        break;

      case 'GAME_RESET':
        this.resetGame();
        break;

      case 'ERROR':
        alert(payload.message);
        break;
    }
  }

  onJoined(payload) {
    this.playerId = payload.playerId;
    this.isHost = payload.isHost;

    this.elements.playerAvatar.textContent = this.playerName.charAt(0).toUpperCase();
    this.elements.playerDisplayName.textContent = this.playerName;
    this.elements.hostStatus.textContent = this.isHost ? 'You are the host!' : 'Waiting for host to start...';

    this.showScreen('waiting');
  }

  handlePhaseChange(payload) {
    switch (payload.phase) {
      case 'CATEGORY_REVEAL':
        this.currentCategory = payload.category;
        this.elements.readyCategory.textContent = payload.category;
        this.elements.readyCountdown.textContent = '';
        this.showScreen('ready');
        break;

      case 'COUNTDOWN':
        this.elements.readyCountdown.textContent = payload.timer;
        this.showScreen('ready');
        break;

      case 'TYPING':
        this.elements.typingCategory.textContent = this.currentCategory;
        this.elements.timerDisplay.textContent = payload.timer;
        this.elements.timerDisplay.classList.remove('low');
        this.elements.answerInput.value = '';
        this.elements.charCount.textContent = '0';
        this.showScreen('typing');

        // Focus on input
        setTimeout(() => {
          this.elements.answerInput.focus();
        }, 100);
        break;

      case 'LOCKED':
        this.elements.submittedAnswer.textContent = this.elements.answerInput.value || '(no answer)';
        this.showScreen('locked');
        break;

      case 'REVEAL':
        this.showScreen('reveal');
        break;

      case 'SCORING':
        this.showScoring(payload);
        break;

      case 'GAME_OVER':
        this.showGameOver(payload);
        break;
    }
  }

  updateTimer(remaining) {
    // Update ready screen countdown
    if (this.screens.ready.classList.contains('active')) {
      if (remaining === 0) {
        this.elements.readyCountdown.textContent = 'GO!';
      } else {
        this.elements.readyCountdown.textContent = remaining;
      }
    }

    // Update typing screen timer
    if (this.screens.typing.classList.contains('active')) {
      this.elements.timerDisplay.textContent = remaining;

      if (remaining <= 3) {
        this.elements.timerDisplay.classList.add('low');
      }
    }
  }

  showScoring(payload) {
    this.myScore = payload.scores[this.playerId] || 0;
    const roundPoints = payload.roundPoints[this.playerId] || 0;

    this.elements.myScore.textContent = this.myScore;

    const resultEl = this.elements.roundResult;
    resultEl.classList.remove('unique', 'eliminated');

    if (roundPoints > 0) {
      resultEl.textContent = '+1 UNIQUE!';
      resultEl.classList.add('unique');
    } else {
      resultEl.textContent = 'Eliminated';
      resultEl.classList.add('eliminated');
    }

    this.showScreen('score');
  }

  showGameOver(payload) {
    const isWinner = payload.winners.includes(this.playerId);
    const finalScore = payload.finalScores[this.playerId] || 0;

    this.elements.resultMessage.textContent = isWinner ? 'YOU WIN!' : 'GAME OVER';
    this.elements.resultMessage.classList.toggle('winner', isWinner);
    this.elements.finalScore.textContent = finalScore;

    this.showScreen('gameover');
  }

  resetGame() {
    this.myScore = 0;
    this.showScreen('waiting');
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
  new QuickThinkController();
});
