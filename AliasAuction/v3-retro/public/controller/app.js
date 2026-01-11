// Alias Auction - Retro Arcade Variant - Controller App

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
    const params = new URLSearchParams(window.location.search);
    this.roomCode = params.get('room');

    if (!this.roomCode) {
      this.showError('join', 'NO ROOM CODE');
      return;
    }

    this.setupEventListeners();
    this.connectWebSocket();
  }

  setupEventListeners() {
    document.getElementById('join-btn').addEventListener('click', () => this.joinGame());
    document.getElementById('player-name').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinGame();
    });

    document.getElementById('start-btn').addEventListener('click', () => this.startGame());

    document.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bid = parseInt(btn.dataset.bid);
        this.placeBid(bid);
      });
    });

    const descInput = document.getElementById('description-input');
    descInput.addEventListener('input', () => this.updateWordCount());
    document.getElementById('submit-description').addEventListener('click', () => this.submitDescription());

    document.getElementById('vote-success').addEventListener('click', () => this.submitVote(true));
    document.getElementById('vote-fail').addEventListener('click', () => this.submitVote(false));

    document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {};

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      this.showError('join', 'CONNECTION LOST');
    };
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'JOINED':
        this.playerId = payload.playerId;
        this.playerName = payload.playerName;
        this.playerColor = payload.color;
        this.showWaitingScreen();
        break;

      case 'GAME_STATE':
        this.state = payload;
        this.isHost = payload.hostId === this.playerId;
        this.updateDisplay();
        break;

      case 'PLAYER_JOINED':
        if (this.isHost && payload.playerCount >= 2) {
          document.getElementById('host-controls').classList.remove('hidden');
        }
        break;

      case 'TIMER':
        this.updateTimer(payload.remaining);
        break;

      case 'BID_PLACED':
        this.updateBidDisplay(payload);
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
    if (this.state?.phase === 'DESCRIBING') {
      this.showError('description', message);
    } else {
      alert(message);
    }
  }

  joinGame() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim().toUpperCase();

    if (!name) {
      this.showError('join', 'ENTER NAME');
      return;
    }

    if (name.length > 8) {
      this.showError('join', 'MAX 8 CHARS');
      return;
    }

    this.hideError('join');

    this.ws.send(JSON.stringify({
      type: 'JOIN',
      payload: { roomCode: this.roomCode, playerName: name }
    }));
  }

  showWaitingScreen() {
    this.showScreen('waiting');

    const avatar = document.getElementById('my-avatar');
    avatar.style.borderColor = this.playerColor;
    avatar.style.color = this.playerColor;
    avatar.textContent = this.playerName.charAt(0);

    document.getElementById('my-name').textContent = this.playerName;
    document.getElementById('my-name').style.color = this.playerColor;
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
    }
  }

  updateBiddingScreen() {
    document.getElementById('bid-word').textContent = this.state.currentWord;
    document.getElementById('current-bid').textContent = this.state.currentBid;
    document.getElementById('current-bidder').textContent = this.state.currentBidderName || '-';

    document.querySelectorAll('.bid-btn').forEach(btn => {
      const bid = parseInt(btn.dataset.bid);
      btn.disabled = bid >= this.state.currentBid;
    });
  }

  updateBidDisplay(payload) {
    document.getElementById('current-bid').textContent = payload.bid;
    document.getElementById('current-bidder').textContent = payload.bidderName;

    document.querySelectorAll('.bid-btn').forEach(btn => {
      const bid = parseInt(btn.dataset.bid);
      btn.disabled = bid >= payload.bid;
    });
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
    document.getElementById('word-count').textContent = '0 WORDS';
    this.hideError('description');
  }

  updateWordCount() {
    const input = document.getElementById('description-input');
    const words = input.value.trim().split(/\s+/).filter(w => w.length > 0);
    document.getElementById('word-count').textContent = words.length + ' WORD' + (words.length !== 1 ? 'S' : '');
  }

  submitDescription() {
    const input = document.getElementById('description-input');
    const description = input.value.trim();

    if (!description) {
      this.showError('description', 'ENTER CLUE');
      return;
    }

    const words = description.split(/\s+/).filter(w => w.length > 0);
    if (words.length > this.state.currentBid) {
      this.showError('description', `MAX ${this.state.currentBid} WORDS`);
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
    resultText.className = 'result flash ' + (payload.success ? 'success' : 'fail');

    document.getElementById('points-change').textContent = (payload.points >= 0 ? '+' : '') + payload.points;

    const myPlayer = this.state.players.find(p => p.id === this.playerId);
    document.getElementById('my-score').textContent = myPlayer?.score || 0;
  }

  showGameOver(payload) {
    this.showScreen('gameover');

    const myRank = payload.scoreboard.findIndex(p => p.id === this.playerId) + 1;
    const myPlayer = payload.scoreboard.find(p => p.id === this.playerId);
    const isWinner = payload.winners.some(w => w.id === this.playerId);

    const myResult = document.getElementById('my-result');
    myResult.innerHTML = `
      <span class="rank">#${myRank}</span>
      <p>${isWinner ? 'WINNER!' : myPlayer?.score + ' PTS'}</p>
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

const app = new AliasAuctionController();
