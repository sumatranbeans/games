const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const os = require('os');
const path = require('path');

const { GameState, PHASES, TIMERS } = require('./game/GameState');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

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

const LOCAL_IP = getLocalIP();

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

app.use('/tv', express.static(path.join(__dirname, 'public/tv')));
app.use('/controller', express.static(path.join(__dirname, 'public/controller')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

app.get('/api/qrcode/:roomCode', async (req, res) => {
  try {
    const url = `http://${LOCAL_IP}:${PORT}/controller/?room=${req.params.roomCode}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    res.json({ qrCode: qrDataUrl, url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

function broadcastToRoom(roomCode, message, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const msgString = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (player.ws && player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(msgString);
    }
  }

  if (room.tvClients) {
    for (const tvWs of room.tvClients) {
      if (tvWs && tvWs !== excludeWs && tvWs.readyState === WebSocket.OPEN) {
        tvWs.send(msgString);
      }
    }
  }
}

function sendStateUpdate(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const state = room.getPublicState();
  broadcastToRoom(roomCode, { type: 'GAME_STATE', payload: state });
}

function startPhaseTimer(roomCode, duration, onComplete) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  room.setTimer(duration);
  sendStateUpdate(roomCode);

  room.timerInterval = setInterval(() => {
    const remaining = room.decrementTimer();
    broadcastToRoom(roomCode, { type: 'TIMER', payload: { remaining } });

    if (remaining <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      if (onComplete) onComplete();
    }
  }, 1000);
}

function transitionToPhase(roomCode, phase) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.setPhase(phase);

  switch (phase) {
    case PHASES.WORD_REVEAL:
      room.startRound();
      startPhaseTimer(roomCode, TIMERS.WORD_REVEAL, () => {
        transitionToPhase(roomCode, PHASES.BIDDING);
      });
      break;

    case PHASES.BIDDING:
      room.lastBidTime = Date.now();
      startPhaseTimer(roomCode, TIMERS.BIDDING, () => {
        if (room.currentBidderId) {
          transitionToPhase(roomCode, PHASES.DESCRIBING);
        } else {
          if (room.isGameOver()) {
            transitionToPhase(roomCode, PHASES.GAME_OVER);
          } else {
            transitionToPhase(roomCode, PHASES.WORD_REVEAL);
          }
        }
      });

      room.bidIdleCheck = setInterval(() => {
        if (room.currentBidderId && room.lastBidTime) {
          const idleTime = (Date.now() - room.lastBidTime) / 1000;
          if (idleTime >= TIMERS.BIDDING_IDLE) {
            clearInterval(room.bidIdleCheck);
            clearInterval(room.timerInterval);
            room.timerInterval = null;
            transitionToPhase(roomCode, PHASES.DESCRIBING);
          }
        }
      }, 500);
      break;

    case PHASES.DESCRIBING:
      if (room.bidIdleCheck) {
        clearInterval(room.bidIdleCheck);
      }
      startPhaseTimer(roomCode, TIMERS.DESCRIBING, () => {
        if (!room.description) {
          room.description = '(No description given)';
        }
        transitionToPhase(roomCode, PHASES.VOTING);
      });
      break;

    case PHASES.VOTING:
      startPhaseTimer(roomCode, TIMERS.VOTING, () => {
        transitionToPhase(roomCode, PHASES.RESULTS);
      });
      break;

    case PHASES.RESULTS:
      const results = room.calculateResults();
      broadcastToRoom(roomCode, { type: 'ROUND_RESULTS', payload: results });

      startPhaseTimer(roomCode, TIMERS.RESULTS, () => {
        if (room.isGameOver()) {
          transitionToPhase(roomCode, PHASES.GAME_OVER);
        } else {
          transitionToPhase(roomCode, PHASES.WORD_REVEAL);
        }
      });
      break;

    case PHASES.GAME_OVER:
      const winners = room.getWinner();
      const scoreboard = room.getScoreboard();
      broadcastToRoom(roomCode, {
        type: 'GAME_OVER',
        payload: { winners, scoreboard }
      });
      break;
  }

  sendStateUpdate(roomCode);
}

wss.on('connection', (ws) => {
  let currentRoomCode = null;
  let currentPlayerId = null;
  let isTV = false;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const { type, payload } = message;

      switch (type) {
        case 'CREATE_ROOM': {
          const roomCode = generateRoomCode();
          const room = new GameState(roomCode);
          room.tvClients = new Set([ws]);
          rooms.set(roomCode, room);
          currentRoomCode = roomCode;
          isTV = true;

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            payload: { roomCode, serverUrl: `http://${LOCAL_IP}:${PORT}` }
          }));
          sendStateUpdate(roomCode);
          break;
        }

        case 'TV_JOIN': {
          const { roomCode } = payload;
          const room = rooms.get(roomCode);
          if (room) {
            if (!room.tvClients) room.tvClients = new Set();
            room.tvClients.add(ws);
            currentRoomCode = roomCode;
            isTV = true;
            sendStateUpdate(roomCode);
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: 'Room not found' }
            }));
          }
          break;
        }

        case 'JOIN': {
          const { roomCode, playerName } = payload;
          const room = rooms.get(roomCode);

          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: 'Room not found' }
            }));
            return;
          }

          const playerId = GameState.generatePlayerId();
          const result = room.addPlayer(playerId, playerName, ws);

          if (result.success) {
            currentRoomCode = roomCode;
            currentPlayerId = playerId;

            ws.send(JSON.stringify({
              type: 'JOINED',
              payload: { playerId, playerName, color: result.player.color }
            }));

            broadcastToRoom(roomCode, {
              type: 'PLAYER_JOINED',
              payload: {
                playerId,
                playerName,
                playerCount: room.players.size,
                players: Array.from(room.players.values()).map(p => ({
                  id: p.id, name: p.name, color: p.color
                }))
              }
            });

            sendStateUpdate(roomCode);
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: result.error }
            }));
          }
          break;
        }

        case 'START_GAME': {
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          if (currentPlayerId !== room.hostId && !isTV) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: 'Only the host can start the game' }
            }));
            return;
          }

          const settings = payload?.settings || {};
          const result = room.startGame(settings);

          if (result.success) {
            broadcastToRoom(currentRoomCode, { type: 'GAME_STARTED', payload: {} });
            transitionToPhase(currentRoomCode, PHASES.WORD_REVEAL);
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: result.error }
            }));
          }
          break;
        }

        case 'BID': {
          const room = rooms.get(currentRoomCode);
          if (!room || !currentPlayerId) return;

          const result = room.placeBid(currentPlayerId, payload.wordCount);

          if (result.success) {
            broadcastToRoom(currentRoomCode, {
              type: 'BID_PLACED',
              payload: result
            });
            sendStateUpdate(currentRoomCode);
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: result.error }
            }));
          }
          break;
        }

        case 'SUBMIT_DESCRIPTION': {
          const room = rooms.get(currentRoomCode);
          if (!room || !currentPlayerId) return;

          const result = room.submitDescription(currentPlayerId, payload.description);

          if (result.success) {
            if (room.timerInterval) {
              clearInterval(room.timerInterval);
              room.timerInterval = null;
            }

            broadcastToRoom(currentRoomCode, {
              type: 'DESCRIPTION_SUBMITTED',
              payload: { description: result.description, wordCount: result.wordCount }
            });

            transitionToPhase(currentRoomCode, PHASES.VOTING);
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: result.error }
            }));
          }
          break;
        }

        case 'VOTE': {
          const room = rooms.get(currentRoomCode);
          if (!room || !currentPlayerId) return;

          const result = room.submitVote(currentPlayerId, payload.vote);

          if (result.success) {
            broadcastToRoom(currentRoomCode, {
              type: 'VOTE_RECEIVED',
              payload: { votesReceived: room.votes.size, totalVoters: room.players.size - 1 }
            });

            if (result.allVoted) {
              if (room.timerInterval) {
                clearInterval(room.timerInterval);
                room.timerInterval = null;
              }
              transitionToPhase(currentRoomCode, PHASES.RESULTS);
            }
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: result.error }
            }));
          }
          break;
        }

        case 'RESTART_GAME': {
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          room.setPhase(PHASES.LOBBY);
          room.currentRound = 0;
          room.usedWords.clear();
          for (const player of room.players.values()) {
            player.score = 0;
          }

          broadcastToRoom(currentRoomCode, { type: 'GAME_RESTARTED', payload: {} });
          sendStateUpdate(currentRoomCode);
          break;
        }
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        if (isTV) {
          room.tvClients?.delete(ws);
        } else if (currentPlayerId) {
          room.removePlayer(currentPlayerId);
          broadcastToRoom(currentRoomCode, {
            type: 'PLAYER_LEFT',
            payload: { playerId: currentPlayerId }
          });
          sendStateUpdate(currentRoomCode);
        }

        if (room.players.size === 0 && (!room.tvClients || room.tvClients.size === 0)) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          if (room.bidIdleCheck) clearInterval(room.bidIdleCheck);
          rooms.delete(currentRoomCode);
        }
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('  ALIAS AUCTION - Minimal Variant');
  console.log('='.repeat(50));
  console.log('');
  console.log(`  Server running at: http://${LOCAL_IP}:${PORT}`);
  console.log('');
  console.log(`  TV Display: http://${LOCAL_IP}:${PORT}/tv`);
  console.log('');
  console.log('  Open TV Display and scan QR code to join!');
  console.log('='.repeat(50));
  console.log('');
});
