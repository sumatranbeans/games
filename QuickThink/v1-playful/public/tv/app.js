// Quick Think - v1-playful TV Display Application
// Enhanced with rich visuals, audio, and animations

class QuickThinkTV {
  constructor() {
    this.ws = null;
    this.roomCode = null;
    this.players = [];
    this.gameLength = 'standard';
    this.submittedPlayers = new Set();
    this.lastTimerValue = 10;

    this.init();
  }

  init() {
    this.createFloatingShapes();
    this.bindElements();
    this.bindEvents();
    this.createRoom();
  }

  // Create floating 3D geometric shapes for background
  createFloatingShapes() {
    const container = document.getElementById('floating-shapes');
    if (!container) return;

    const colors = [
      '#6366F1', // primary
      '#A855F7', // purple
      '#EC4899', // pink
      '#F97316', // secondary
      '#FBBF24', // accent
      '#06B6D4', // cyan
      '#10B981'  // success
    ];

    const shapes = [];
    const numShapes = 12;

    for (let i = 0; i < numShapes; i++) {
      const shape = document.createElement('div');
      shape.className = 'floating-shape';

      const size = 40 + Math.random() * 80;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 20;
      const duration = 15 + Math.random() * 15;

      shape.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}%;
        top: ${y}%;
        background: linear-gradient(135deg, ${color} 0%, ${this.adjustColor(color, -30)} 100%);
        color: ${color};
        animation-delay: -${delay}s;
        animation-duration: ${duration}s;
        border-radius: ${20 + Math.random() * 30}%;
      `;

      container.appendChild(shape);
      shapes.push(shape);
    }

    // Parallax effect on mouse move (for desktop)
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;

      shapes.forEach((shape, i) => {
        const factor = (i % 3 + 1) * 0.3;
        shape.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });
    });
  }

  // Adjust color brightness
  adjustColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
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
      muteBtn: document.getElementById('mute-btn'),

      currentRound: document.getElementById('current-round'),
      totalRounds: document.getElementById('total-rounds'),
      categoryText: document.getElementById('category-text'),
      difficultyBadge: document.getElementById('difficulty-badge'),

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
    // Start button - add multiple event listeners for debugging
    this.elements.startBtn.addEventListener('click', (e) => {
      console.log('[TV] Start button click event fired');
      console.log('[TV] Button disabled:', this.elements.startBtn.disabled);
      if (!this.elements.startBtn.disabled) {
        this.startGame();
      } else {
        console.log('[TV] Button is disabled, not starting game');
      }
    });

    this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());

    this.elements.lengthBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.elements.lengthBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.gameLength = e.target.dataset.length;
      });
    });

    // Mute button - also triggers audio initialization
    this.elements.muteBtn.addEventListener('click', async () => {
      await ensureAudioInit();
      const isMuted = audioManager.toggleMute();
      this.elements.muteBtn.classList.toggle('muted', isMuted);
    });

    // Initialize audio on any user interaction
    const initAudioOnInteraction = async () => {
      await ensureAudioInit();
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
    };
    document.addEventListener('click', initAudioOnInteraction);
    document.addEventListener('keydown', initAudioOnInteraction);
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
      console.log('WebSocket connected');
      this.ws.send(JSON.stringify({
        type: 'TV_JOIN',
        payload: { roomCode: this.roomCode }
      }));
      this.showScreen('lobby');

      // Start lobby music after a short delay (requires user interaction first)
      setTimeout(async () => {
        if (audioManager.isInitialized) {
          audioManager.playLobbyMusic();
        }
      }, 500);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed, attempting reconnect...');
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(message) {
    const { type, payload } = message;
    console.log('[TV] Received:', type, payload);

    switch (type) {
      case 'ROOM_STATE':
        console.log('[TV] Room state - players:', payload.players?.length);
        this.updateRoomState(payload);
        break;

      case 'PLAYER_JOINED':
        console.log('[TV] Player joined! Total players:', payload.players?.length);
        audioManager.playPlayerJoin();
        this.updatePlayers(payload.players);
        break;

      case 'PLAYER_LEFT':
        this.updatePlayers(payload.players);
        break;

      case 'GAME_STARTED':
        audioManager.playGameStart();
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
    // Ensure players is always an array
    this.players = Array.isArray(state.players) ? state.players : [];
    console.log('[TV] updateRoomState - player count:', this.players.length);
    this.updatePlayersDisplay();
    this.updateStartButton();
  }

  updatePlayers(players) {
    // Ensure players is always an array
    this.players = Array.isArray(players) ? players : [];
    console.log('[TV] updatePlayers called, player count:', this.players.length);
    this.updatePlayersDisplay();
    this.updateStartButton();
  }

  updatePlayersDisplay() {
    this.elements.playersGrid.innerHTML = '';

    this.players.forEach((player, index) => {
      const card = document.createElement('div');
      card.className = `player-card${player.isHost ? ' host' : ''}`;
      card.style.animationDelay = `${index * 0.1}s`;

      // Random avatar gradient
      const gradients = [
        'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
        'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
        'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
        'linear-gradient(135deg, #FBBF24 0%, #F97316 100%)',
        'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)'
      ];

      card.innerHTML = `
        <div class="player-avatar" style="background: ${gradients[index % gradients.length]}">${player.name.charAt(0).toUpperCase()}</div>
        <div class="player-name">${player.name}</div>
        ${player.isHost ? '<div class="host-badge">HOST</div>' : ''}
      `;
      this.elements.playersGrid.appendChild(card);
    });

    this.elements.waitingText.style.display = this.players.length === 0 ? 'block' : 'none';
  }

  updateStartButton() {
    const playerCount = this.players.length;
    const canStart = playerCount >= 2;
    console.log('[TV] updateStartButton - players:', playerCount, 'canStart:', canStart);

    this.elements.startBtn.disabled = !canStart;

    if (canStart) {
      this.elements.startBtn.textContent = 'START GAME!';
      this.elements.startBtn.classList.add('ready');
    } else {
      const needed = 2 - playerCount;
      this.elements.startBtn.textContent = `Need ${needed} more player${needed !== 1 ? 's' : ''}`;
      this.elements.startBtn.classList.remove('ready');
    }
  }

  startGame() {
    console.log('[TV] START GAME button clicked!');
    console.log('[TV] WebSocket state:', this.ws ? this.ws.readyState : 'no ws');
    console.log('[TV] Room code:', this.roomCode);
    console.log('[TV] Game length:', this.gameLength);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[TV] Cannot start game - WebSocket not open!');
      return;
    }

    const message = {
      type: 'START_GAME',
      payload: { gameLength: this.gameLength }
    };
    console.log('[TV] Sending:', JSON.stringify(message));
    this.ws.send(JSON.stringify(message));
  }

  handlePhaseChange(payload) {
    switch (payload.phase) {
      case 'CATEGORY_REVEAL':
        audioManager.crossfadeTo('gameplay');
        audioManager.playWhoosh();
        this.showCategoryReveal(payload);
        break;

      case 'COUNTDOWN':
        this.showCountdown(payload.timer);
        break;

      case 'TYPING':
        audioManager.crossfadeTo('tense');
        audioManager.playGo();
        this.showTyping(payload.timer);
        break;

      case 'LOCKED':
        audioManager.playBuzzer();
        break;

      case 'REVEAL':
        audioManager.crossfadeTo('reveal');
        this.showReveal(payload);
        break;

      case 'SCORING':
        this.showScoring(payload);
        break;

      case 'GAME_OVER':
        audioManager.stopMusic();
        audioManager.playVictory();
        this.showGameOver(payload);
        break;
    }
  }

  showCategoryReveal(payload) {
    this.elements.currentRound.textContent = payload.round;
    this.elements.totalRounds.textContent = payload.totalRounds;
    this.elements.categoryText.textContent = payload.category;

    // Show difficulty badge if available
    if (this.elements.difficultyBadge && payload.difficulty) {
      const difficultyLabels = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' };
      this.elements.difficultyBadge.textContent = difficultyLabels[payload.difficulty] || '';
      this.elements.difficultyBadge.className = `difficulty-badge ${payload.difficulty}`;
      this.elements.difficultyBadge.style.display = 'inline-block';
    } else if (this.elements.difficultyBadge) {
      this.elements.difficultyBadge.style.display = 'none';
    }

    this.showScreen('category');
  }

  showCountdown(timer) {
    const countdownEl = this.elements.countdownNumber;
    countdownEl.textContent = timer;
    countdownEl.classList.remove('go');

    if (timer > 0) {
      audioManager.playTick(timer === 3 ? 0.8 : timer === 2 ? 0.9 : 1);
    }

    this.showScreen('countdown');
  }

  showTyping(timer) {
    this.elements.categoryReminder.textContent = this.elements.categoryText.textContent;
    this.elements.typingTimer.textContent = timer;
    this.elements.typingTimer.classList.remove('urgent');
    this.lastTimerValue = timer;
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
      audioManager.playChime(660, 0.1);
    }
  }

  updateTimer(remaining) {
    // Update countdown screen
    if (this.screens.countdown.classList.contains('active')) {
      const countdownEl = this.elements.countdownNumber;

      if (remaining > 0) {
        countdownEl.textContent = remaining;
        countdownEl.classList.remove('go');
        audioManager.playTick(remaining === 2 ? 0.9 : remaining === 1 ? 1 : 0.8);
      } else {
        countdownEl.textContent = 'GO!';
        countdownEl.classList.add('go');
      }
    }

    // Update typing screen
    if (this.screens.typing.classList.contains('active')) {
      this.elements.typingTimer.textContent = remaining;

      // Play urgent beeps when timer is low
      if (remaining <= 3 && remaining > 0 && remaining !== this.lastTimerValue) {
        audioManager.playUrgent();
      }
      this.lastTimerValue = remaining;

      // Visual feedback for low time
      if (remaining <= 3) {
        this.elements.typingTimer.classList.add('urgent');
      } else {
        this.elements.typingTimer.classList.remove('urgent');
      }
    }
  }

  showReveal(payload) {
    this.elements.revealCategory.textContent = this.elements.categoryText.textContent;
    this.elements.answersContainer.innerHTML = '';
    this.showScreen('reveal');
  }

  revealAnswer(payload) {
    audioManager.playCardFlip();

    const card = document.createElement('div');
    card.className = `answer-card ${payload.unique ? 'unique' : 'eliminated'}`;

    const statusText = payload.unique ? 'UNIQUE!' : 'DUPLICATE';
    const statusIcon = payload.unique ? '✓' : '✗';

    card.innerHTML = `
      <div class="answer-player">${payload.playerName}</div>
      <div class="answer-text">${payload.answer || '(no answer)'}</div>
      <div class="answer-status">
        ${statusText}
        <span class="status-icon">${statusIcon}</span>
      </div>
    `;

    this.elements.answersContainer.appendChild(card);

    // Play success or fail sound after card flip
    setTimeout(() => {
      if (payload.unique) {
        audioManager.playSuccess();
        this.createParticleBurst(card);
      } else {
        audioManager.playFail();
      }
    }, 200);
  }

  // Create particle burst effect for unique answers
  createParticleBurst(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const colors = ['#10B981', '#6EE7B7', '#FBBF24', '#34D399'];

    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${colors[i % colors.length]};
        pointer-events: none;
        z-index: 1000;
      `;

      const angle = (i / 12) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);

      document.body.appendChild(particle);

      particle.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
      ], {
        duration: 600,
        easing: 'ease-out'
      }).onfinish = () => particle.remove();
    }
  }

  showScoring(payload) {
    this.elements.scoreboard.innerHTML = '';

    // Sort players by score
    const sortedPlayers = [...this.players].sort((a, b) => {
      return (payload.scores[b.id] || 0) - (payload.scores[a.id] || 0);
    });

    const topScore = payload.scores[sortedPlayers[0]?.id] || 0;

    sortedPlayers.forEach((player, index) => {
      const card = document.createElement('div');
      const score = payload.scores[player.id] || 0;
      const isLeader = score === topScore && score > 0;

      card.className = `score-card${isLeader ? ' leader' : ''}`;
      card.style.animationDelay = `${index * 0.1}s`;

      const roundPoints = payload.roundPoints[player.id] || 0;
      const details = payload.detailedResults?.[player.id];

      let changeDisplay = '';
      if (details) {
        const { uniqueCount, duplicateCount, volumeBonus } = details;
        const parts = [];
        if (uniqueCount > 0) parts.push(`<span class="unique-pts">+${uniqueCount}</span>`);
        if (duplicateCount > 0) parts.push(`<span class="dup-pts">-${duplicateCount}</span>`);
        if (volumeBonus > 0) parts.push(`<span class="bonus-pts">+${volumeBonus} bonus</span>`);

        changeDisplay = `<div class="score-breakdown">${parts.join(' ')}</div>`;
      } else {
        const changeClass = roundPoints > 0 ? '' : roundPoints < 0 ? 'negative' : 'zero';
        changeDisplay = `
          <div class="score-change ${changeClass}">
            ${roundPoints > 0 ? '+' + roundPoints : roundPoints}
          </div>
        `;
      }

      card.innerHTML = `
        ${isLeader ? '<div class="crown-icon">👑</div>' : ''}
        <div class="score-name">${player.name}</div>
        <div class="score-points">${score}</div>
        ${changeDisplay}
      `;

      this.elements.scoreboard.appendChild(card);

      // Play point ticks for positive scores
      if (roundPoints > 0) {
        setTimeout(() => {
          for (let i = 0; i < Math.min(roundPoints, 5); i++) {
            setTimeout(() => audioManager.playPointTick(), i * 100);
          }
        }, index * 200);
      }
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
    const colors = ['#6366F1', '#F97316', '#FBBF24', '#10B981', '#EF4444', '#A855F7', '#EC4899', '#06B6D4'];
    const shapes = ['square', 'circle', 'triangle'];

    for (let i = 0; i < 150; i++) {
      const confetti = document.createElement('div');
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];

      confetti.className = `confetti ${shape}`;
      confetti.style.cssText = `
        left: ${Math.random() * 100}%;
        background-color: ${color};
        color: ${color};
        animation-delay: ${Math.random() * 3}s;
        animation-duration: ${3 + Math.random() * 2}s;
        width: ${8 + Math.random() * 8}px;
        height: ${8 + Math.random() * 8}px;
      `;

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

    // Restart lobby music
    audioManager.crossfadeTo('lobby');
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
