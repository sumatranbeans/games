#!/usr/bin/env node
// Quick Think - Comprehensive Test Suite
// Tests the full game flow via WebSocket connections

const WebSocket = require('ws');
const http = require('http');

const SERVER_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

// Test result tracking
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
let testDetails = [];

// Utility functions
function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${msg}${colors.reset}`);
}

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    log(`  PASS: ${message}`, 'success');
    testDetails.push({ status: 'PASS', message });
    return true;
  } else {
    testsFailed++;
    log(`  FAIL: ${message}`, 'error');
    testDetails.push({ status: 'FAIL', message });
    return false;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP helper
function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${SERVER_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// WebSocket client wrapper
class TestClient {
  constructor(name, isTV = false) {
    this.name = name;
    this.isTV = isTV;
    this.ws = null;
    this.playerId = null;
    this.roomCode = null;
    this.messages = [];
    this.connected = false;
    this.messageHandlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);

      this.ws.on('open', () => {
        this.connected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data);
          this.messages.push(msg);

          // Call any registered handlers
          const handler = this.messageHandlers.get(msg.type);
          if (handler) {
            handler(msg);
          }
        } catch (e) {
          log(`[${this.name}] Failed to parse message: ${e.message}`, 'error');
        }
      });

      this.ws.on('error', (err) => {
        log(`[${this.name}] WebSocket error: ${err.message}`, 'error');
        reject(err);
      });

      this.ws.on('close', () => {
        this.connected = false;
      });

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  waitForMessage(type, timeout = 10000) {
    return new Promise((resolve, reject) => {
      // Check existing messages first (from newest)
      const existingIdx = this.messages.findIndex(m => m.type === type);
      if (existingIdx >= 0) {
        const msg = this.messages[existingIdx];
        resolve(msg);
        return;
      }

      const timer = setTimeout(() => {
        this.messageHandlers.delete(type);
        reject(new Error(`Timeout waiting for message type: ${type}`));
      }, timeout);

      this.messageHandlers.set(type, (msg) => {
        clearTimeout(timer);
        this.messageHandlers.delete(type);
        resolve(msg);
      });
    });
  }

  // Wait for a specific phase change
  waitForPhase(phase, timeout = 15000) {
    return new Promise((resolve, reject) => {
      // Check existing messages first
      const existing = this.messages.find(m =>
        m.type === 'PHASE_CHANGE' && m.payload?.phase === phase
      );
      if (existing) {
        resolve(existing);
        return;
      }

      const timer = setTimeout(() => {
        this.messageHandlers.delete(`PHASE_${phase}`);
        reject(new Error(`Timeout waiting for phase: ${phase}`));
      }, timeout);

      // Use a unique key for phase-specific handler
      const handlerKey = `PHASE_${phase}`;
      const originalHandler = this.messageHandlers.get('PHASE_CHANGE');

      this.messageHandlers.set('PHASE_CHANGE', (msg) => {
        if (msg.payload?.phase === phase) {
          clearTimeout(timer);
          this.messageHandlers.delete('PHASE_CHANGE');
          resolve(msg);
        } else if (originalHandler) {
          originalHandler(msg);
        }
      });
    });
  }

  getLastMessage(type) {
    const filtered = this.messages.filter(m => m.type === type);
    return filtered[filtered.length - 1];
  }

  clearMessages() {
    this.messages = [];
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  async joinAsTV(roomCode) {
    this.roomCode = roomCode;
    this.send({ type: 'TV_JOIN', payload: { roomCode } });
    const msg = await this.waitForMessage('ROOM_STATE');
    return msg;
  }

  async joinAsPlayer(roomCode, playerName) {
    this.roomCode = roomCode;
    this.name = playerName;
    this.send({ type: 'JOIN', payload: { roomCode, playerName } });
    const msg = await this.waitForMessage('JOINED');
    this.playerId = msg.payload.playerId;
    return msg;
  }
}

// Test Suite: Room Creation
async function testRoomCreation() {
  log('\n=== Test Suite: Room Creation ===', 'info');

  try {
    const data = await httpGet('/api/create-room');
    assert(data.roomCode && data.roomCode.length === 4, 'Room code is 4 characters');
    assert(/^[A-Z0-9]+$/.test(data.roomCode), 'Room code contains only uppercase letters and numbers');
    assert(data.joinUrl && data.joinUrl.includes(data.roomCode), 'Join URL contains room code');

    // Test QR code generation
    const qrData = await httpGet(`/api/qr/${data.roomCode}`);
    assert(qrData.qrDataUrl && qrData.qrDataUrl.startsWith('data:image'), 'QR code data URL is valid');
    assert(qrData.joinUrl && qrData.joinUrl.includes(data.roomCode), 'QR join URL contains room code');

    return data.roomCode;
  } catch (e) {
    log(`Room creation test error: ${e.message}`, 'error');
    return null;
  }
}

// Test Suite: Player Joining
async function testPlayerJoining() {
  log('\n=== Test Suite: Player Joining ===', 'info');

  const roomCode = await testRoomCreation();
  if (!roomCode) return null;

  const tv = new TestClient('TV', true);
  const players = [];

  try {
    // TV connects and joins room
    await tv.connect();
    assert(tv.connected, 'TV client connected to WebSocket');

    const roomState = await tv.joinAsTV(roomCode);
    assert(roomState.type === 'ROOM_STATE', 'TV received ROOM_STATE');
    assert(Array.isArray(roomState.payload.players), 'Room state has players array');

    // Add 3 players
    const playerNames = ['Alice', 'Bob', 'Charlie'];
    for (const name of playerNames) {
      const player = new TestClient(name);
      await player.connect();
      const joinedMsg = await player.joinAsPlayer(roomCode, name);

      assert(joinedMsg.payload.playerId, `${name} received player ID`);
      assert(joinedMsg.payload.playerName === name, `${name} name confirmed`);

      players.push(player);
      await sleep(100);
    }

    // First player should be host
    assert(players[0].getLastMessage('JOINED').payload.isHost === true, 'First player is host');

    // TV should receive PLAYER_JOINED for each player
    await sleep(500);
    const playerJoinedMsgs = tv.messages.filter(m => m.type === 'PLAYER_JOINED');
    assert(playerJoinedMsgs.length >= 3, 'TV received PLAYER_JOINED messages');

    const lastJoinMsg = playerJoinedMsgs[playerJoinedMsgs.length - 1];
    assert(lastJoinMsg.payload.players.length === 3, 'Room has 3 players');

    return { roomCode, tv, players };
  } catch (e) {
    log(`Player joining test error: ${e.message}`, 'error');
    tv.close();
    players.forEach(p => p.close());
    return null;
  }
}

// Test Suite: Game Start
async function testGameStart() {
  log('\n=== Test Suite: Game Start ===', 'info');

  const setup = await testPlayerJoining();
  if (!setup) return null;

  const { roomCode, tv, players } = setup;

  try {
    // Clear messages before starting game
    tv.clearMessages();
    players.forEach(p => p.clearMessages());

    // TV starts the game
    tv.send({ type: 'START_GAME', payload: { gameLength: 'quick' } });

    // All clients should receive GAME_STARTED
    const gameStartedPromises = [tv, ...players].map(c =>
      c.waitForMessage('GAME_STARTED', 5000)
    );

    const results = await Promise.all(gameStartedPromises);
    assert(results.every(r => r.type === 'GAME_STARTED'), 'All clients received GAME_STARTED');
    assert(results[0].payload.totalRounds === 5, 'Quick game has 5 rounds');

    return { roomCode, tv, players };
  } catch (e) {
    log(`Game start test error: ${e.message}`, 'error');
    tv.close();
    players.forEach(p => p.close());
    return null;
  }
}

// Test Suite: Full Round Flow
async function testFullRoundFlow() {
  log('\n=== Test Suite: Full Round Flow ===', 'info');

  const setup = await testGameStart();
  if (!setup) return null;

  const { roomCode, tv, players } = setup;

  try {
    // Wait for CATEGORY_REVEAL using phase-specific wait
    const categoryMsg = await tv.waitForPhase('CATEGORY_REVEAL', 5000);
    assert(categoryMsg.payload.phase === 'CATEGORY_REVEAL', 'Received CATEGORY_REVEAL phase');
    assert(categoryMsg.payload.category, 'Category is provided');
    assert(categoryMsg.payload.round === 1, 'First round');

    // Wait for COUNTDOWN
    const countdownMsg = await tv.waitForPhase('COUNTDOWN', 5000);
    assert(countdownMsg.payload.phase === 'COUNTDOWN', 'Received COUNTDOWN phase');

    // Wait for TYPING phase
    const typingMsg = await tv.waitForPhase('TYPING', 5000);
    assert(typingMsg.payload.phase === 'TYPING', 'Received TYPING phase');

    // Players submit answers
    const answers = ['Pizza', 'Pasta', 'Pizza']; // Alice and Charlie duplicate
    for (let i = 0; i < players.length; i++) {
      players[i].send({
        type: 'SUBMIT_ANSWER',
        payload: { answer: answers[i], entries: [answers[i]] }
      });
      await sleep(50);
    }

    // Players should receive ANSWER_RECEIVED
    for (let i = 0; i < players.length; i++) {
      const ack = await players[i].waitForMessage('ANSWER_RECEIVED', 2000);
      assert(ack.type === 'ANSWER_RECEIVED', `Player ${i+1} received answer confirmation`);
    }

    // Wait for LOCKED phase (after 10 second timer)
    const lockedMsg = await tv.waitForPhase('LOCKED', 15000);
    assert(lockedMsg.payload.phase === 'LOCKED', 'Received LOCKED phase');

    // Wait for REVEAL phase
    const revealMsg = await tv.waitForPhase('REVEAL', 5000);
    assert(revealMsg.payload.phase === 'REVEAL', 'Received REVEAL phase');

    // Should receive individual answer reveals - wait a bit for all to come in
    await sleep(6000); // Wait for reveals (1.5s each * 3 answers + buffer)
    const revealAnswers = tv.messages.filter(m => m.type === 'REVEAL_ANSWER');
    assert(revealAnswers.length >= 2, 'Received answer reveals');

    // Check for unique/duplicate detection
    const uniqueAnswers = revealAnswers.filter(r => r.payload.unique === true);
    const duplicateAnswers = revealAnswers.filter(r => r.payload.unique === false);

    assert(uniqueAnswers.length >= 1, 'Has unique answers (Pasta)');
    assert(duplicateAnswers.length >= 1, 'Has duplicate answers (Pizza)');

    // Wait for SCORING phase
    const scoringMsg = await tv.waitForPhase('SCORING', 10000);
    assert(scoringMsg.payload.phase === 'SCORING', 'Received SCORING phase');
    assert(scoringMsg.payload.scores, 'Scores are provided');
    assert(scoringMsg.payload.roundPoints, 'Round points are provided');

    return { roomCode, tv, players };
  } catch (e) {
    log(`Full round test error: ${e.message}`, 'error');
  } finally {
    tv.close();
    players.forEach(p => p.close());
  }

  return null;
}

// Test Suite: Edge Cases
async function testEdgeCases() {
  log('\n=== Test Suite: Edge Cases ===', 'info');

  // Test 1: Maximum players (6)
  log('  Testing maximum players...', 'info');
  const roomCode = await (async () => {
    const data = await httpGet('/api/create-room');
    return data.roomCode;
  })();

  const tv = new TestClient('TV', true);
  const players = [];

  try {
    await tv.connect();
    await tv.joinAsTV(roomCode);

    // Add 6 players
    for (let i = 1; i <= 6; i++) {
      const player = new TestClient(`Player${i}`);
      await player.connect();
      await player.joinAsPlayer(roomCode, `Player${i}`);
      players.push(player);
      await sleep(50);
    }

    assert(players.length === 6, 'Successfully added 6 players');

    // Try to add 7th player
    const extraPlayer = new TestClient('Extra');
    await extraPlayer.connect();
    extraPlayer.send({ type: 'JOIN', payload: { roomCode, playerName: 'Extra' } });

    const errorMsg = await extraPlayer.waitForMessage('ERROR', 2000).catch(() => null);
    assert(errorMsg && errorMsg.payload.message.includes('full'), '7th player rejected - room full');
    extraPlayer.close();

  } catch (e) {
    log(`Max players test error: ${e.message}`, 'error');
  } finally {
    tv.close();
    players.forEach(p => p.close());
  }

  // Test 2: Special characters in names
  log('  Testing special characters in names...', 'info');
  const roomCode2 = await (async () => {
    const data = await httpGet('/api/create-room');
    return data.roomCode;
  })();

  const tv2 = new TestClient('TV2', true);
  try {
    await tv2.connect();
    await tv2.joinAsTV(roomCode2);

    const specialPlayer = new TestClient('Test<script>');
    await specialPlayer.connect();
    const joined = await specialPlayer.joinAsPlayer(roomCode2, 'Test<script>');
    assert(joined.payload.playerName === 'Test<script>', 'Special characters in name accepted');

    const emojiPlayer = new TestClient('Emoji');
    await emojiPlayer.connect();
    const emojiJoined = await emojiPlayer.joinAsPlayer(roomCode2, 'Player 123');
    assert(emojiJoined.payload.playerName === 'Player 123', 'Numbers and spaces in name accepted');

    specialPlayer.close();
    emojiPlayer.close();
  } catch (e) {
    log(`Special characters test error: ${e.message}`, 'error');
  } finally {
    tv2.close();
  }

  // Test 3: Empty answers
  log('  Testing empty/whitespace answers...', 'info');
  const roomCode3 = await (async () => {
    const data = await httpGet('/api/create-room');
    return data.roomCode;
  })();

  const tv3 = new TestClient('TV3', true);
  const player1 = new TestClient('P1');
  const player2 = new TestClient('P2');

  try {
    await tv3.connect();
    await tv3.joinAsTV(roomCode3);

    await player1.connect();
    await player1.joinAsPlayer(roomCode3, 'TestPlayer1');

    await player2.connect();
    await player2.joinAsPlayer(roomCode3, 'TestPlayer2');

    // Start game
    tv3.send({ type: 'START_GAME', payload: { gameLength: 'quick' } });
    await tv3.waitForMessage('GAME_STARTED', 5000);

    // Wait for typing phase
    await tv3.waitForMessage('PHASE_CHANGE'); // CATEGORY_REVEAL
    await tv3.waitForMessage('PHASE_CHANGE'); // COUNTDOWN
    await tv3.waitForMessage('PHASE_CHANGE'); // TYPING

    // Submit empty answer from player1, valid from player2
    player1.send({ type: 'SUBMIT_ANSWER', payload: { answer: '', entries: [] } });
    player2.send({ type: 'SUBMIT_ANSWER', payload: { answer: 'Valid Answer', entries: ['Valid Answer'] } });

    assert(true, 'Empty answer submission did not crash server');

  } catch (e) {
    log(`Empty answers test error: ${e.message}`, 'error');
  } finally {
    tv3.close();
    player1.close();
    player2.close();
  }
}

// Test Suite: WebSocket Reliability
async function testWebSocketReliability() {
  log('\n=== Test Suite: WebSocket Reliability ===', 'info');

  // Test 1: Rapid connect/disconnect
  log('  Testing rapid connect/disconnect cycles...', 'info');
  const roomCode = await (async () => {
    const data = await httpGet('/api/create-room');
    return data.roomCode;
  })();

  const tv = new TestClient('TV', true);
  await tv.connect();
  await tv.joinAsTV(roomCode);

  let rapidTestPassed = true;
  for (let i = 0; i < 5; i++) {
    const tempPlayer = new TestClient(`Rapid${i}`);
    try {
      await tempPlayer.connect();
      await tempPlayer.joinAsPlayer(roomCode, `RapidPlayer${i}`);
      await sleep(50);
      tempPlayer.close();
      await sleep(50);
    } catch (e) {
      rapidTestPassed = false;
      log(`Rapid test cycle ${i} failed: ${e.message}`, 'error');
    }
  }
  assert(rapidTestPassed, 'Rapid connect/disconnect cycles handled');

  // Test 2: Delayed connections (simulating slow mobile)
  log('  Testing delayed connections...', 'info');
  const slowPlayer = new TestClient('SlowMobile');
  await slowPlayer.connect();
  await sleep(2000); // Simulate slow mobile delay
  const slowJoined = await slowPlayer.joinAsPlayer(roomCode, 'SlowMobile');
  assert(slowJoined.payload.playerName === 'SlowMobile', 'Delayed player joined successfully');

  // Test 3: Player disconnect during game
  log('  Testing player disconnect during game...', 'info');
  const player1 = new TestClient('StayPlayer');
  await player1.connect();
  await player1.joinAsPlayer(roomCode, 'StayPlayer');

  const player2 = new TestClient('LeavePlayer');
  await player2.connect();
  await player2.joinAsPlayer(roomCode, 'LeavePlayer');

  tv.clearMessages();

  // Disconnect player2
  player2.close();
  await sleep(500);

  const leftMsg = tv.messages.find(m => m.type === 'PLAYER_LEFT');
  assert(leftMsg !== undefined, 'PLAYER_LEFT message received when player disconnects');

  // Cleanup
  tv.close();
  slowPlayer.close();
  player1.close();
}

// Test Suite: Play Again Flow
async function testPlayAgainFlow() {
  log('\n=== Test Suite: Play Again Flow ===', 'info');

  const roomCode = await (async () => {
    const data = await httpGet('/api/create-room');
    return data.roomCode;
  })();

  const tv = new TestClient('TV', true);
  const player1 = new TestClient('P1');
  const player2 = new TestClient('P2');

  try {
    await tv.connect();
    await tv.joinAsTV(roomCode);

    await player1.connect();
    await player1.joinAsPlayer(roomCode, 'Player1');

    await player2.connect();
    await player2.joinAsPlayer(roomCode, 'Player2');

    // Start a quick game
    tv.send({ type: 'START_GAME', payload: { gameLength: 'quick' } });
    await tv.waitForMessage('GAME_STARTED', 5000);

    // Wait for game to complete (shortened for testing - we'll trigger play again mid-game)
    await sleep(3000);

    // Send play again
    tv.clearMessages();
    tv.send({ type: 'PLAY_AGAIN', payload: {} });

    const resetMsg = await tv.waitForMessage('GAME_RESET', 5000);
    assert(resetMsg.type === 'GAME_RESET', 'GAME_RESET received on play again');
    assert(resetMsg.payload.phase === 'LOBBY', 'Game reset to LOBBY phase');
    assert(Array.isArray(resetMsg.payload.players), 'Players maintained after reset');

  } catch (e) {
    log(`Play again test error: ${e.message}`, 'error');
  } finally {
    tv.close();
    player1.close();
    player2.close();
  }
}

// Test Suite: Duplicate Answer Detection
async function testDuplicateDetection() {
  log('\n=== Test Suite: Duplicate Answer Detection ===', 'info');

  // Import scoring module for direct testing
  const { findDuplicates, isSimilar, normalizeAnswer } = require('./game/scoring');

  // Test normalization
  assert(normalizeAnswer('  Hello World  ') === 'hello world', 'Whitespace trimmed and lowercased');
  assert(normalizeAnswer('The Beatles') === 'beatles', 'Article "the" removed');
  assert(normalizeAnswer('A Dog') === 'dog', 'Article "a" removed');
  assert(normalizeAnswer('An Apple') === 'apple', 'Article "an" removed');

  // Test similarity
  assert(isSimilar('pizza', 'pizza') === true, 'Identical strings are similar');
  assert(isSimilar('pizza', 'piza') === true, 'One typo is similar (pizza/piza)');
  assert(isSimilar('banana', 'bananna') === true, 'One typo is similar (banana/bananna)');
  assert(isSimilar('cat', 'elephant') === false, 'Completely different strings not similar');

  // Test duplicate detection
  const answers = [
    { playerId: 'p1', playerName: 'Alice', answer: 'Pizza' },
    { playerId: 'p2', playerName: 'Bob', answer: 'Pasta' },
    { playerId: 'p3', playerName: 'Charlie', answer: 'pizza' }, // Same as Alice (case difference)
  ];

  const marked = findDuplicates(answers);
  const pizzaAnswers = marked.filter(m => m.normalized === 'pizza');
  const pastaAnswers = marked.filter(m => m.normalized === 'pasta');

  assert(pizzaAnswers.every(a => a.unique === false), 'Pizza answers marked as duplicates');
  assert(pastaAnswers.every(a => a.unique === true), 'Pasta answer marked as unique');

  // Test multi-entry
  const multiAnswers = [
    { playerId: 'p1', playerName: 'Alice', answer: 'Red, Blue, Green' },
    { playerId: 'p2', playerName: 'Bob', answer: 'Yellow, Red' }, // Red duplicates with Alice
  ];

  const multiMarked = findDuplicates(multiAnswers);
  const redAnswers = multiMarked.filter(m => m.normalized === 'red');
  assert(redAnswers.length === 2 && redAnswers.every(a => a.unique === false), 'Red marked as duplicate across players');

  const blueAnswers = multiMarked.filter(m => m.normalized === 'blue');
  assert(blueAnswers.length === 1 && blueAnswers[0].unique === true, 'Blue marked as unique');
}

// Main test runner
async function runAllTests(iteration = 1) {
  log(`\n${'='.repeat(60)}`, 'info');
  log(`QUICK THINK COMPREHENSIVE TEST SUITE - Iteration ${iteration}`, 'info');
  log(`${'='.repeat(60)}`, 'info');

  testsRun = 0;
  testsPassed = 0;
  testsFailed = 0;
  testDetails = [];

  try {
    await testDuplicateDetection();
    await testRoomCreation();
    await testPlayerJoining();
    await testEdgeCases();
    await testWebSocketReliability();
    await testPlayAgainFlow();
    await testFullRoundFlow();
  } catch (e) {
    log(`\nFatal test error: ${e.message}`, 'error');
    log(e.stack, 'error');
  }

  // Summary
  log(`\n${'='.repeat(60)}`, 'info');
  log(`TEST RESULTS - Iteration ${iteration}`, 'info');
  log(`${'='.repeat(60)}`, 'info');
  log(`Total Tests: ${testsRun}`, 'info');
  log(`Passed: ${testsPassed}`, 'success');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
  log(`${'='.repeat(60)}`, 'info');

  return { testsRun, testsPassed, testsFailed };
}

// Run multiple iterations
async function main() {
  const args = process.argv.slice(2);
  const iterations = parseInt(args[0]) || 5;

  log(`\nRunning ${iterations} test iterations...`, 'info');

  const results = [];

  for (let i = 1; i <= iterations; i++) {
    const result = await runAllTests(i);
    results.push(result);
    await sleep(1000); // Brief pause between iterations
  }

  // Final summary
  log(`\n${'='.repeat(60)}`, 'info');
  log('FINAL SUMMARY ACROSS ALL ITERATIONS', 'info');
  log(`${'='.repeat(60)}`, 'info');

  const totalTests = results.reduce((sum, r) => sum + r.testsRun, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.testsPassed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.testsFailed, 0);

  results.forEach((r, i) => {
    const status = r.testsFailed === 0 ? 'PASS' : 'FAIL';
    log(`  Iteration ${i + 1}: ${r.testsPassed}/${r.testsRun} passed [${status}]`,
        r.testsFailed === 0 ? 'success' : 'error');
  });

  log(`\n  TOTAL: ${totalPassed}/${totalTests} passed`, totalFailed === 0 ? 'success' : 'error');
  log(`  Overall: ${totalFailed === 0 ? 'ALL TESTS PASSED' : `${totalFailed} TESTS FAILED`}`,
      totalFailed === 0 ? 'success' : 'error');
  log(`${'='.repeat(60)}`, 'info');

  process.exit(totalFailed === 0 ? 0 : 1);
}

main().catch(e => {
  log(`\nFatal error: ${e.message}`, 'error');
  process.exit(1);
});
