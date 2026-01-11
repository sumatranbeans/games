// Alias Auction - Controller App

class AliasAuctionController {
  constructor() {
    this.ws = null;
    this.playerId = null;
    this.playerName = null;
    this.playerColor = null;
    this.roomCode = null;
    this.state = null;
    this.isHost = false;
    this.hasVoted = false;

    this.screens = {
      join: document.getElementById('join-screen'),
      waiting: document.getElementById('waiting-screen'),
      reveal: document.getElementById('reveal-screen'),
      bidding: document.getElementById('bidding-screen'),
      describing: document.getElementById('describing-screen'),
      watch: document.getElementById('watch-screen'),
      voting: document.getElementById('voting-screen'),
      voteWait: document.getElementById('vote-wait-screen'),
      results: document.getElementById('results-screen'),
      gameover: document.getElementById('gameover-screen')
    };

    this.init();
  }

  init() {
    // Get room code from URL
    const params = new URLSearchParams(window.location.search);
    this.roomCode = params.get('room');

    if (!this.roomCode) {
      this.showError('join', 'No room code found. Please scan the QR code again.');
      return;
    }

    this.setupEventListeners();
    this.connectWebSocket();
  }

  setupEventListeners() {
    // Join button
    document.getElementById('join-btn').addEventListener('click', () => this.joinGame());
    document.getElementById('player-name').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinGame();
    });

    // Start game button (host)
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());

    // Bid buttons
    document.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bid = parseInt(btn.dataset.bid);
        this.placeBid(bid);
      });
    });

    // Description input
    const descInput = document.getElementById('description-input');
    descInput.addEventListener('input', () => this.updateWordCount());
    document.getElementById('submit-description').addEventListener('click', () => this.submitDescription());

    // Vote buttons
    document.getElementById('vote-success').addEventListener('click', () => this.submitVote(true));
    document.getElementById('vote-fail').addEventListener('click', () => this.submitVote(false));

    // Play again button
    document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to server');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.showError('join', 'Connection lost. Please refresh.');
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'JOINED':
        this.playerId = payload.playerId;
        this.playerColor = payload.color;
        this.showWaitingScreen();
        break;

      case 'GAME_STATE':
        this.state = payload;
        this.isHost = payload.hostId === this.playerId;
        this.updateDisplay();
        break;

      case 'PLAYER_JOINED':
        // Show host controls if we're the host
        if (this.isHost && payload.playerCount >= 2) {
          document.getElementById('host-controls').classList.remove('hidden');
        }
        break;

      case 'GAME_STARTED':
        // State update will handle this
        break;

      case 'TIMER':
        this.updateTimer(payload.remaining);
        break;

      case 'BID_PLACED':
        this.updateBidDisplay(payload);
        break;

      case 'DESCRIPTION_SUBMITTED':
        // State update will handle transition
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
        this.hasVoted = false;
        this.showScreen('waiting');
        break;

      case 'ERROR':
        this.showCurrentError(payload.message);
        break;
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

  showError(screen, message) {
    const errorEl = document.getElementById(`${screen}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  hideError(screen) {
    const errorEl = document.getElementById(`${screen}-error`);
    if (errorEl) {
      errorEl.classList.add('hidden');
    }
  }

  showCurrentError(message) {
    // Show error based on current phase
    if (this.state?.phase === 'BIDDING') {
      alert(message);
    } else if (this.state?.phase === 'DESCRIBING') {
      this.showError('description', message);
    } else {
      alert(message);
    }
  }

  joinGame() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();

    if (!name) {
      this.showError('join', 'Please enter your name');
      return;
    }

    if (name.length > 12) {
      this.showError('join', 'Name must be 12 characters or less');
      return;
    }

    this.playerName = name;
    this.hideError('join');

    this.ws.send(JSON.stringify({
      type: 'JOIN',
      payload: { roomCode: this.roomCode, playerName: name }
    }));
  }

  showWaitingScreen() {
    this.showScreen('waiting');

    const avatar = document.getElementById('my-avatar');
    avatar.style.backgroundColor = this.playerColor;
    avatar.textContent = this.playerName.charAt(0).toUpperCase();

    document.getElementById('my-name').textContent = this.playerName;
  }

  startGame() {
    this.ws.send(JSON.stringify({
      type: 'START_GAME',
      payload: { settings: {} }
    }));
  }

  updateDisplay() {
    if (!this.state) return;

    const isBidder = this.state.currentBidderId === this.playerId;

    switch (this.state.phase) {
      case 'LOBBY':
        this.showScreen('waiting');
        if (this.isHost && this.state.players.length >= 2) {
          document.getElementById('host-controls').classList.remove('hidden');
        }
        break;

      case 'WORD_REVEAL':
        this.showScreen('reveal');
        document.getElementById('reveal-round').textContent = this.state.currentRound;
        document.getElementById('reveal-word').textContent = this.state.currentWord;
        break;

      case 'BIDDING':
        this.showScreen('bidding');
        this.updateBiddingScreen();
        break;

      case 'DESCRIBING':
        if (isBidder) {
          this.showScreen('describing');
          this.updateDescribingScreen();
        } else {
          this.showScreen('watch');
          document.getElementById('describer-name').textContent = this.state.currentBidderName;
        }
        break;

      case 'VOTING':
        this.hasVoted = false;
        if (isBidder) {
          this.showScreen('voteWait');
          this.updateVoteWaitScreen();
        } else {
          this.showScreen('voting');
          this.updateVotingScreen();
        }
        break;

      case 'RESULTS':
        // Results screen is shown via ROUND_RESULTS message
        break;

      case 'GAME_OVER':
        // Game over is shown via GAME_OVER message
        break;
    }
  }

  updateBiddingScreen() {
    document.getElementById('bid-word').textContent = this.state.currentWord;
    document.getElementById('current-bid').textContent = this.state.currentBid;
    document.getElementById('current-bidder').textContent = this.state.currentBidderName || '-';

    // Enable/disable bid buttons based on current bid
    document.querySelectorAll('.bid-btn').forEach(btn => {
      const bid = parseInt(btn.dataset.bid);
      btn.disabled = bid >= this.state.currentBid;
    });
  }

  updateBidDisplay(payload) {
    document.getElementById('current-bid').textContent = payload.bid;
    document.getElementById('current-bidder').textContent = payload.bidderName;

    // Update button states
    document.querySelectorAll('.bid-btn').forEach(btn => {
      const bid = parseInt(btn.dataset.bid);
      btn.disabled = bid >= payload.bid;
    });

    // Visual feedback
    const currentBidEl = document.getElementById('current-bid');
    currentBidEl.style.animation = 'none';
    setTimeout(() => {
      currentBidEl.style.animation = 'resultPop 0.3s ease';
    }, 10);
  }

  placeBid(wordCount) {
    this.ws.send(JSON.stringify({
      type: 'BID',
      payload: { wordCount }
    }));
  }

  updateDescribingScreen() {
    document.getElementById('describe-target').textContent = this.state.currentWord;
    document.getElementById('word-budget').textContent = this.state.currentBid;
    document.getElementById('description-input').value = '';
    document.getElementById('word-count').textContent = '0 words';
    this.hideError('description');
  }

  updateWordCount() {
    const input = document.getElementById('description-input');
    const words = input.value.trim().split(/\s+/).filter(w => w.length > 0);
    document.getElementById('word-count').textContent = `${words.length} word${words.length !== 1 ? 's' : ''}`;
  }

  submitDescription() {
    const input = document.getElementById('description-input');
    const description = input.value.trim();

    if (!description) {
      this.showError('description', 'Please enter a description');
      return;
    }

    const words = description.split(/\s+/).filter(w => w.length > 0);
    if (words.length > this.state.currentBid) {
      this.showError('description', `Too many words! Use ${this.state.currentBid} or fewer.`);
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'SUBMIT_DESCRIPTION',
      payload: { description }
    }));
  }

  updateVotingScreen() {
    document.getElementById('vote-description').textContent = this.state.description;
    document.getElementById('vote-target').textContent = this.state.currentWord;

    // Enable vote buttons
    document.getElementById('vote-success').disabled = false;
    document.getElementById('vote-fail').disabled = false;
  }

  updateVoteWaitScreen() {
    document.getElementById('votes-cast').textContent = this.state.votesReceived;
    document.getElementById('total-voters').textContent = this.state.totalVoters;
  }

  updateVoteProgress(payload) {
    document.getElementById('votes-cast').textContent = payload.votesReceived;
    document.getElementById('total-voters').textContent = payload.totalVoters;
  }

  submitVote(vote) {
    if (this.hasVoted) return;

    this.hasVoted = true;

    // Disable buttons
    document.getElementById('vote-success').disabled = true;
    document.getElementById('vote-fail').disabled = true;

    this.ws.send(JSON.stringify({
      type: 'VOTE',
      payload: { vote }
    }));
  }

  showResults(payload) {
    this.showScreen('results');

    const resultText = document.getElementById('result-text');
    resultText.textContent = payload.success ? 'SUCCESS!' : 'FAILED!';
    resultText.className = 'result-text ' + (payload.success ? 'success' : 'fail');

    const pointsChange = document.getElementById('points-change');
    pointsChange.textContent = (payload.points >= 0 ? '+' : '') + payload.points;
    pointsChange.parentElement.className = 'score-change ' + (payload.points >= 0 ? 'positive' : 'negative');

    // Find my score
    const myPlayer = this.state.players.find(p => p.id === this.playerId);
    document.getElementById('my-score').textContent = myPlayer?.score || 0;
  }

  showGameOver(payload) {
    this.showScreen('gameover');

    // Find my rank
    const myRank = payload.scoreboard.findIndex(p => p.id === this.playerId) + 1;
    const myPlayer = payload.scoreboard.find(p => p.id === this.playerId);
    const isWinner = payload.winners.some(w => w.id === this.playerId);

    const myResult = document.getElementById('my-result');
    myResult.innerHTML = `
      <span class="rank">#${myRank}</span>
      <h2>${isWinner ? 'YOU WON!' : this.playerName}</h2>
      <p>${myPlayer?.score || 0} points</p>
    `;
  }

  playAgain() {
    this.ws.send(JSON.stringify({
      type: 'RESTART_GAME',
      payload: {}
    }));
  }

  updateTimer(remaining) {
    if (this.state?.phase === 'BIDDING') {
      const maxTime = 30;
      const percent = (remaining / maxTime) * 100;
      document.getElementById('bid-timer-bar').style.width = `${percent}%`;
    }
  }
}

// Initialize the app
const app = new AliasAuctionController();
