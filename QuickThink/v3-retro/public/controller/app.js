// Quick Think - v3-retro Controller Application

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

      playerInitial: document.getElementById('player-initial'),
      playerDisplayName: document.getElementById('player-display-name'),
      hostStatus: document.getElementById('host-status'),

      readyCategory: document.getElementById('ready-category'),
      readyCountdown: document.getElementById('ready-countdown'),

      typingCategory: document.getElementById('typing-category'),
      timerDisplay: document.getElementById('timer-display'),
      answerInput: document.getElementById('answer-input'),

      submittedAnswer: document.getElementById('submitted-answer'),

      myScore: document.getElementById('my-score'),
      roundResult: document.getElementById('round-result'),

      resultMessage: document.getElementById('result-message'),
      finalScore: document.getElementById('final-score')
    };
  }

  bindEvents() {
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

    this.elements.answerInput.addEventListener('input', () => {
      const answer = this.elements.answerInput.value;

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
      console.log('Connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      this.showScreen('error');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  joinGame() {
    this.playerName = this.elements.playerNameInput.value.trim().toUpperCase();

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

      case 'PHASE_CHANGE':
        this.handlePhaseChange(payload);
        break;

      case 'TIMER':
        this.updateTimer(payload.remaining);
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

    this.elements.playerInitial.textContent = this.playerName.charAt(0);
    this.elements.playerDisplayName.textContent = this.playerName;
    this.elements.hostStatus.textContent = this.isHost ? '* HOST *' : 'WAITING...';

    this.showScreen('waiting');
  }

  handlePhaseChange(payload) {
    switch (payload.phase) {
      case 'CATEGORY_REVEAL':
        this.currentCategory = payload.category.toUpperCase();
        this.elements.readyCategory.textContent = this.currentCategory;
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
        this.showScreen('typing');

        setTimeout(() => {
          this.elements.answerInput.focus();
        }, 100);
        break;

      case 'LOCKED':
        this.elements.submittedAnswer.textContent = this.elements.answerInput.value.toUpperCase() || '-----';
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
    if (this.screens.ready.classList.contains('active')) {
      this.elements.readyCountdown.textContent = remaining === 0 ? 'GO!' : remaining;
    }

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

    this.elements.myScore.textContent = String(this.myScore).padStart(3, '0');

    const resultEl = this.elements.roundResult;
    resultEl.classList.remove('unique', 'eliminated');

    if (roundPoints > 0) {
      resultEl.textContent = '+1 POINT!';
      resultEl.classList.add('unique');
    } else {
      resultEl.textContent = 'X X X';
      resultEl.classList.add('eliminated');
    }

    this.showScreen('score');
  }

  showGameOver(payload) {
    const isWinner = payload.winners.includes(this.playerId);
    const finalScore = payload.finalScores[this.playerId] || 0;

    this.elements.resultMessage.textContent = isWinner ? 'YOU WIN!' : 'GAME OVER';
    this.elements.resultMessage.classList.toggle('winner', isWinner);
    this.elements.finalScore.textContent = String(finalScore).padStart(3, '0');

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

document.addEventListener('DOMContentLoaded', () => {
  new QuickThinkController();
});
