// Alias Auction - Minimal Variant - TV Display App

class AliasAuctionTV {
  constructor() {
    this.ws = null;
    this.roomCode = null;
    this.state = null;

    this.screens = {
      lobby: document.getElementById('lobby-screen'),
      wordReveal: document.getElementById('word-reveal-screen'),
      bidding: document.getElementById('bidding-screen'),
      describing: document.getElementById('describing-screen'),
      voting: document.getElementById('voting-screen'),
      results: document.getElementById('results-screen'),
      gameover: document.getElementById('gameover-screen')
    };

    this.elements = {
      qrCode: document.getElementById('qr-code'),
      roomCodeDisplay: document.getElementById('room-code-display'),
      joinUrl: document.getElementById('join-url'),
      playerCount: document.getElementById('player-count'),
      playersList: document.getElementById('players-list')
    };

    this.init();
  }

  init() {
    this.connectWebSocket();
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'CREATE_ROOM', payload: {} }));
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
      case 'ROOM_CREATED':
        this.roomCode = payload.roomCode;
        this.loadQRCode();
        break;

      case 'GAME_STATE':
        this.state = payload;
        this.updateDisplay();
        break;

      case 'PLAYER_JOINED':
        this.updatePlayersList(payload.players);
        break;

      case 'TIMER':
        this.updateTimer(payload.remaining);
        break;

      case 'BID_PLACED':
        this.updateBidDisplay();
        break;

      case 'VOTE_RECEIVED':
        this.updateVoteProgress(payload);
        break;

      case 'ROUND_RESULTS':
        this.showResults(payload);
        break;

      case 'GAME_OVER':
        this.showGameOver(payload);
        break;

      case 'GAME_RESTARTED':
        this.showScreen('lobby');
        break;
    }
  }

  async loadQRCode() {
    try {
      const response = await fetch(`/api/qrcode/${this.roomCode}`);
      const data = await response.json();

      this.elements.qrCode.src = data.qrCode;
      this.elements.roomCodeDisplay.textContent = this.roomCode;
      this.elements.joinUrl.textContent = data.url;
    } catch (error) {
      console.error('Failed to load QR code:', error);
    }
  }

  showScreen(screenName) {
    Object.values(this.screens).forEach(screen => {
      screen.classList.remove('active');
    });

    const screen = this.screens[screenName];
    if (screen) {
      screen.classList.add('active');
    }
  }

  updateDisplay() {
    if (!this.state) return;

    switch (this.state.phase) {
      case 'LOBBY':
        this.showScreen('lobby');
        this.updateLobby();
        break;

      case 'WORD_REVEAL':
        this.showScreen('wordReveal');
        this.updateWordReveal();
        break;

      case 'BIDDING':
        this.showScreen('bidding');
        this.updateBidding();
        break;

      case 'DESCRIBING':
        this.showScreen('describing');
        this.updateDescribing();
        break;

      case 'VOTING':
        this.showScreen('voting');
        this.updateVoting();
        break;

      case 'RESULTS':
        this.showScreen('results');
        break;

      case 'GAME_OVER':
        this.showScreen('gameover');
        break;
    }
  }

  updateLobby() {
    this.elements.playerCount.textContent = this.state.players.length;
    this.updatePlayersList(this.state.players);
  }

  updatePlayersList(players) {
    this.elements.playersList.innerHTML = '';
    this.elements.playerCount.textContent = players.length;

    players.forEach((player) => {
      const item = document.createElement('div');
      item.className = 'player-item';
      item.innerHTML = `
        <div class="player-initial">${player.name.charAt(0).toUpperCase()}</div>
        <span class="player-name">${player.name}</span>
        ${player.id === this.state?.hostId ? '<span class="host-tag">Host</span>' : ''}
      `;
      this.elements.playersList.appendChild(item);
    });
  }

  updateWordReveal() {
    document.getElementById('reveal-round').textContent = this.state.currentRound;
    document.getElementById('reveal-word').textContent = this.state.currentWord;
  }

  updateBidding() {
    document.getElementById('bidding-round').textContent = this.state.currentRound;
    document.getElementById('bidding-word').textContent = this.state.currentWord;
    this.updateBidDisplay();
    this.updateScoreboard();
  }

  updateBidDisplay() {
    if (!this.state) return;
    document.getElementById('current-bid').textContent = this.state.currentBid;
    document.getElementById('potential-points').textContent = this.state.potentialPoints;
    document.getElementById('bidder-name').textContent = this.state.currentBidderName || 'No bids yet';
  }

  updateScoreboard() {
    const scoreboard = document.getElementById('bidding-scoreboard');
    scoreboard.innerHTML = '';

    this.state.players.forEach(player => {
      const item = document.createElement('div');
      item.className = 'score-item';
      item.innerHTML = `
        <div class="score-initial">${player.name.charAt(0).toUpperCase()}</div>
        <span class="score-value">${player.score}</span>
      `;
      scoreboard.appendChild(item);
    });
  }

  updateDescribing() {
    document.getElementById('describer-name').textContent = this.state.currentBidderName;
    document.getElementById('describe-word').textContent = this.state.currentWord;
    document.getElementById('word-limit').textContent = this.state.currentBid;
  }

  updateVoting() {
    document.getElementById('voter-describer-name').textContent = this.state.currentBidderName;
    document.getElementById('shown-description').textContent = `"${this.state.description}"`;
    document.getElementById('vote-word').textContent = this.state.currentWord;
    document.getElementById('votes-received').textContent = this.state.votesReceived;
    document.getElementById('total-voters').textContent = this.state.totalVoters;
  }

  updateVoteProgress(payload) {
    document.getElementById('votes-received').textContent = payload.votesReceived;
    document.getElementById('total-voters').textContent = payload.totalVoters;
  }

  updateTimer(remaining) {
    const timerElements = {
      'WORD_REVEAL': document.getElementById('reveal-timer-bar'),
      'BIDDING': document.getElementById('bidding-timer'),
      'DESCRIBING': document.getElementById('describing-timer'),
      'VOTING': document.getElementById('voting-timer')
    };

    if (this.state) {
      const timerEl = timerElements[this.state.phase];
      if (timerEl) {
        if (this.state.phase === 'WORD_REVEAL') {
          const percent = (remaining / 3) * 100;
          timerEl.style.width = `${percent}%`;
        } else {
          timerEl.textContent = remaining;
        }
      }
    }
  }

  showResults(payload) {
    const successEl = document.getElementById('result-success');
    const failEl = document.getElementById('result-fail');

    if (payload.success) {
      successEl.classList.remove('hidden');
      failEl.classList.add('hidden');
    } else {
      successEl.classList.add('hidden');
      failEl.classList.remove('hidden');
    }

    document.getElementById('result-describer').textContent = payload.describerName;
    document.getElementById('result-points').textContent = (payload.points >= 0 ? '+' : '') + payload.points;
    document.getElementById('success-votes').textContent = payload.successVotes;
    document.getElementById('fail-votes').textContent = payload.failVotes;
  }

  showGameOver(payload) {
    const winners = payload.winners;
    const winnerName = winners.length > 1
      ? winners.map(w => w.name).join(' & ')
      : winners[0]?.name || 'No winner';

    document.getElementById('winner-name').textContent = winnerName;
    document.getElementById('winner-score').textContent = winners[0]?.score || 0;

    const scoreboard = document.getElementById('final-scoreboard');
    scoreboard.innerHTML = '';

    payload.scoreboard.forEach((player, index) => {
      const item = document.createElement('div');
      item.className = 'final-item';
      item.innerHTML = `
        <span class="final-rank">${index + 1}</span>
        <div class="final-initial">${player.name.charAt(0).toUpperCase()}</div>
        <span class="final-name">${player.name}</span>
        <span class="final-score">${player.score}</span>
      `;
      scoreboard.appendChild(item);
    });
  }
}

const app = new AliasAuctionTV();
