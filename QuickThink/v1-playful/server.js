// Quick Think - v1-playful Server
// Express + WebSocket game server

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');

const { GameState, PHASES, TIMING } = require('./game/GameState');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Store active game rooms
const rooms = new Map();

// Generate a random room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Generate player ID
function generatePlayerId() {
  return 'p_' + Math.random().toString(36).substr(2, 9);
}

// Serve static files
app.use('/tv', express.static(path.join(__dirname, 'public/tv')));
app.use('/controller', express.static(path.join(__dirname, 'public/controller')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/shared', express.static(path.join(__dirname, 'public/shared')));

// API endpoint to create a room
app.get('/api/create-room', (req, res) => {
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }

  const gameState = new GameState(roomCode);
  rooms.set(roomCode, gameState);

  const localIP = getLocalIP();
  const joinUrl = `http://${localIP}:${PORT}/controller?room=${roomCode}`;

  res.json({
    roomCode,
    joinUrl
  });
});

// API endpoint to generate QR code
app.get('/api/qr/:roomCode', async (req, res) => {
  const { roomCode } = req.params;
  const localIP = getLocalIP();
  const joinUrl = `http://${localIP}:${PORT}/controller?room=${roomCode}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    res.json({ qrDataUrl, joinUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Broadcast to all clients in a room
function broadcast(roomCode, message, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const messageStr = JSON.stringify(message);
  let playersSent = 0;
  let tvsSent = 0;

  room.players.forEach((player) => {
    if (player.ws && player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(messageStr);
      playersSent++;
    }
  });

  // Also send to TV clients
  if (room.tvClients) {
    room.tvClients.forEach(tvWs => {
      if (tvWs && tvWs.readyState === WebSocket.OPEN) {
        tvWs.send(messageStr);
        tvsSent++;
      }
    });
  }

  console.log(`[Broadcast] ${message.type} to room ${roomCode}: ${playersSent} players, ${tvsSent} TVs`);
}

// Send to specific client
function sendTo(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Game phase timers
function runCategoryReveal(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.startRound();
  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: {
      phase: PHASES.CATEGORY_REVEAL,
      category: room.currentCategory,
      round: room.currentRound,
      totalRounds: room.totalRounds
    }
  });

  setTimeout(() => runCountdown(roomCode), TIMING.CATEGORY_REVEAL);
}

function runCountdown(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.startCountdown();
  let count = 3;

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: { phase: PHASES.COUNTDOWN, timer: count }
  });

  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      broadcast(roomCode, {
        type: 'TIMER',
        payload: { remaining: count }
      });
    } else {
      clearInterval(countdownInterval);
      runTyping(roomCode);
    }
  }, 1000);
}

function runTyping(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.startTyping();
  let remaining = 10;

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: { phase: PHASES.TYPING, timer: remaining }
  });

  const typingInterval = setInterval(() => {
    remaining--;
    room.timerValue = remaining;

    broadcast(roomCode, {
      type: 'TIMER',
      payload: { remaining }
    });

    if (remaining <= 0) {
      clearInterval(typingInterval);
      runLockAndReveal(roomCode);
    }
  }, 1000);
}

function runLockAndReveal(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.lockAnswers();

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: { phase: PHASES.LOCKED }
  });

  // Brief pause before reveal
  setTimeout(() => {
    room.startReveal();

    broadcast(roomCode, {
      type: 'PHASE_CHANGE',
      payload: {
        phase: PHASES.REVEAL,
        totalAnswers: room.markedAnswers.length
      }
    });

    // Reveal answers one by one
    revealNextAnswer(roomCode);
  }, 1000);
}

function revealNextAnswer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const answer = room.revealNext();

  if (answer) {
    broadcast(roomCode, {
      type: 'REVEAL_ANSWER',
      payload: {
        playerName: answer.playerName,
        playerId: answer.playerId,
        answer: answer.answer,
        unique: answer.unique,
        revealIndex: room.revealIndex,
        totalAnswers: room.markedAnswers.length
      }
    });

    setTimeout(() => revealNextAnswer(roomCode), TIMING.REVEAL_PER_ANSWER);
  } else {
    // All answers revealed, move to scoring
    runScoring(roomCode);
  }
}

function runScoring(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const roundPoints = room.calculateScores();
  const detailedResults = room.getDetailedResults();

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: {
      phase: PHASES.SCORING,
      roundPoints,
      scores: room.scores,
      markedAnswers: room.markedAnswers,
      detailedResults
    }
  });

  setTimeout(() => {
    if (room.isGameOver()) {
      runGameOver(roomCode);
    } else {
      // Start next round
      runCategoryReveal(roomCode);
    }
  }, TIMING.SCORING);
}

function runGameOver(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const result = room.endGame();

  broadcast(roomCode, {
    type: 'PHASE_CHANGE',
    payload: {
      phase: PHASES.GAME_OVER,
      winners: result.winners,
      finalScores: result.finalScores,
      players: room.getPlayerList()
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  let playerId = null;
  let roomCode = null;
  let isTV = false;

  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      return;
    }

    const { type, payload } = message;

    switch (type) {
      case 'TV_JOIN': {
        // TV client joining a room
        roomCode = payload.roomCode;
        isTV = true;

        const room = rooms.get(roomCode);
        if (!room) {
          sendTo(ws, { type: 'ERROR', payload: { message: 'Room not found' } });
          return;
        }

        // Add TV client to room
        if (!room.tvClients) {
          room.tvClients = new Set();
        }
        room.tvClients.add(ws);

        sendTo(ws, {
          type: 'ROOM_STATE',
          payload: room.getState()
        });
        break;
      }

      case 'JOIN': {
        // Player joining a room
        roomCode = payload.roomCode;
        const playerName = payload.playerName;

        console.log(`[Server] Player "${playerName}" attempting to join room ${roomCode}`);

        const room = rooms.get(roomCode);
        if (!room) {
          console.log(`[Server] Room ${roomCode} not found`);
          sendTo(ws, { type: 'ERROR', payload: { message: 'Room not found' } });
          return;
        }

        playerId = generatePlayerId();
        const result = room.addPlayer(playerId, playerName, ws);

        if (!result.success) {
          console.log(`[Server] Failed to add player: ${result.error}`);
          sendTo(ws, { type: 'ERROR', payload: { message: result.error } });
          return;
        }

        console.log(`[Server] Player "${playerName}" joined as ${playerId}. Total players: ${room.players.size}`);

        // Confirm join to player
        sendTo(ws, {
          type: 'JOINED',
          payload: {
            playerId,
            playerName,
            roomCode,
            isHost: room.hostId === playerId
          }
        });

        // Broadcast updated player list
        const playerList = room.getPlayerList();
        console.log(`[Server] Broadcasting PLAYER_JOINED with ${playerList.length} players to room ${roomCode}`);

        broadcast(roomCode, {
          type: 'PLAYER_JOINED',
          payload: {
            playerId,
            playerName,
            players: playerList
          }
        });
        break;
      }

      case 'START_GAME': {
        console.log(`[Server] START_GAME received - roomCode: ${roomCode}, isTV: ${isTV}, playerId: ${playerId}`);

        const room = rooms.get(roomCode);
        if (!room) {
          console.log(`[Server] START_GAME failed - room not found for code: ${roomCode}`);
          sendTo(ws, { type: 'ERROR', payload: { message: 'Room not found' } });
          return;
        }

        console.log(`[Server] Room found - players: ${room.players.size}, hostId: ${room.hostId}`);

        // Only host can start (or TV can start on behalf of host)
        if (playerId !== room.hostId && !isTV) {
          console.log(`[Server] START_GAME denied - not host and not TV`);
          sendTo(ws, { type: 'ERROR', payload: { message: 'Only host can start' } });
          return;
        }

        const gameLength = payload?.gameLength || 'standard';
        console.log(`[Server] Starting game with length: ${gameLength}`);

        const result = room.startGame(gameLength);

        if (!result.success) {
          console.log(`[Server] startGame failed: ${result.error}`);
          sendTo(ws, { type: 'ERROR', payload: { message: result.error } });
          return;
        }

        console.log(`[Server] Game started successfully! Broadcasting to room ${roomCode}`);

        broadcast(roomCode, {
          type: 'GAME_STARTED',
          payload: {
            totalRounds: room.totalRounds
          }
        });

        // Start first round
        console.log(`[Server] Starting first round in 1 second...`);
        setTimeout(() => runCategoryReveal(roomCode), 1000);
        break;
      }

      case 'SUBMIT_ANSWER': {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.submitAnswer(playerId, payload.answer);

        // Confirm to player
        sendTo(ws, {
          type: 'ANSWER_RECEIVED',
          payload: { answer: payload.answer }
        });

        // Let TV know a player submitted (without revealing answer)
        broadcast(roomCode, {
          type: 'PLAYER_SUBMITTED',
          payload: { playerId }
        }, ws);
        break;
      }

      case 'PLAY_AGAIN': {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.reset();

        broadcast(roomCode, {
          type: 'GAME_RESET',
          payload: room.getState()
        });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        if (isTV) {
          room.tvClients?.delete(ws);
        } else if (playerId) {
          room.removePlayer(playerId);

          broadcast(roomCode, {
            type: 'PLAYER_LEFT',
            payload: {
              playerId,
              players: room.getPlayerList()
            }
          });

          // Clean up empty rooms
          if (room.players.size === 0 && (!room.tvClients || room.tvClients.size === 0)) {
            rooms.delete(roomCode);
          }
        }
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log('\n========================================');
  console.log('   QUICK THINK - v1-playful');
  console.log('========================================');
  console.log(`   Server running at http://${localIP}:${PORT}`);
  console.log(`   TV Display: http://${localIP}:${PORT}/tv`);
  console.log('========================================');
  console.log('   Open TV Display and scan QR code to join!');
  console.log('========================================\n');
});
