# Technical Architecture for Multiplayer Family Games

## Overview

This document defines the technical architecture for two multiplayer family games:
1. **Alias Auction** - Bidding word game
2. **Quick Think** - Speed category game

Both use a TV + phone controller setup with local network WebSocket communication.

---

## Tech Stack

### Server-Side
- **Node.js** - Lightweight, fast to prototype
- **Express.js** - Minimal HTTP server for serving static files
- **ws** - WebSocket library for real-time bidirectional communication

### Client-Side (TV Display & Phone Controllers)
- **Vanilla HTML/CSS/JavaScript** - Simple, no framework overhead
- **CSS Animations** - For visual feedback
- **qrcode** npm package - Generate QR codes for joining

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        LOCAL NETWORK                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              NODE.JS SERVER (Host Machine)           │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │   Express   │  │  WebSocket  │  │    Game     │  │    │
│  │  │   Server    │  │   Server    │  │    State    │  │    │
│  │  │  (Port 3000)│  │  (ws://)    │  │   Manager   │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│              │                    │                          │
│              │ HTTP (initial)     │ WebSocket (real-time)    │
│              │                    │                          │
│  ┌───────────┴────────┐  ┌───────┴───────────────────────┐  │
│  │    TV DISPLAY      │  │      PHONE CONTROLLERS        │  │
│  │  (/tv endpoint)    │  │    (/controller endpoint)     │  │
│  │                    │  │                               │  │
│  │  - Game board      │  │  Phone 1  Phone 2  Phone 3   │  │
│  │  - Scores          │  │    │        │        │       │  │
│  │  - Timer           │  │  Player   Player   Player    │  │
│  │  - QR Code (join)  │  │    A        B        C       │  │
│  └────────────────────┘  └───────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Connection Flow

1. **Server Start**: Node.js server starts on local machine (e.g., `192.168.1.100:3000`)
2. **TV Opens**: Navigate to `http://192.168.1.100:3000/tv` on TV browser
3. **QR Generated**: TV displays QR code containing `http://192.168.1.100:3000/controller?room=XXXX`
4. **Players Scan**: Players scan QR with phone cameras
5. **Controller Loads**: Phone browser opens controller interface
6. **WebSocket Connect**: All clients establish WebSocket connections
7. **Game Ready**: When enough players joined, host can start game

---

## WebSocket Event Protocol

### Connection Events

```javascript
// Client -> Server: Player wants to join
{
  "type": "JOIN",
  "payload": {
    "playerName": "Marcus",
    "roomCode": "ABCD"
  }
}

// Server -> All: Player joined notification
{
  "type": "PLAYER_JOINED",
  "payload": {
    "playerId": "p1",
    "playerName": "Marcus",
    "playerCount": 3,
    "players": [{ "id": "p1", "name": "Marcus" }, ...]
  }
}
```

### Game State Events

```javascript
// Server -> All: Game state update
{
  "type": "GAME_STATE",
  "payload": {
    "phase": "BIDDING" | "DESCRIBING" | "VOTING" | "RESULTS" | "LOBBY",
    "currentWord": "GIRAFFE",
    "currentBid": 3,
    "currentBidder": "p2",
    "timer": 15,
    "scores": { "p1": 5, "p2": 3, "p3": 7 },
    "round": 2,
    "totalRounds": 5
  }
}

// Server -> All: Timer tick
{
  "type": "TIMER",
  "payload": { "remaining": 10 }
}

// Client -> Server: Host starts game
{
  "type": "START_GAME",
  "payload": { "settings": { "rounds": 5, "difficulty": "medium" } }
}

// Server -> All: Game ended
{
  "type": "GAME_OVER",
  "payload": {
    "winner": "p3",
    "finalScores": { "p1": 12, "p2": 8, "p3": 15 }
  }
}
```

### Alias Auction Events

```javascript
// Client -> Server: Player places a bid
{
  "type": "BID",
  "payload": {
    "playerId": "p1",
    "wordCount": 3
  }
}

// Client -> Server: Player submits description
{
  "type": "SUBMIT_DESCRIPTION",
  "payload": {
    "playerId": "p1",
    "description": "tall spotted animal"
  }
}

// Client -> Server: Player votes
{
  "type": "VOTE",
  "payload": {
    "playerId": "p2",
    "vote": true  // true = success, false = failure
  }
}
```

### Quick Think Events

```javascript
// Client -> Server: Player submits answer
{
  "type": "SUBMIT_ANSWER",
  "payload": {
    "playerId": "p1",
    "answer": "ladybug"
  }
}

// Server -> All: Reveal answers with duplicates marked
{
  "type": "REVEAL_ANSWERS",
  "payload": {
    "answers": [
      { "playerId": "p1", "answer": "apple", "unique": false },
      { "playerId": "p2", "answer": "apple", "unique": false },
      { "playerId": "p3", "answer": "ladybug", "unique": true }
    ]
  }
}
```

---

## Folder Structure (Per Variant)

Each variant is a complete standalone codebase:

```
/v1-playful (or v2-minimal, v3-retro)
├── package.json
├── server.js
├── /public
│   ├── /tv
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   ├── /controller
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── /assets
│       ├── /sounds
│       └── /images
└── /game
    ├── GameState.js
    ├── words.js (or categories.js)
    └── scoring.js
```

---

## Setup and Run Instructions

```bash
# For any variant:
cd /Games/[GameName]/[variant]
npm install
npm start

# Server will output:
# > Game server running at http://192.168.x.x:3000
# > TV Display: http://192.168.x.x:3000/tv
# > Open TV Display and scan QR code to join!
```

---

## Key Implementation Notes

1. **All game state is server-side** - Clients just display and send input
2. **WebSocket for all real-time communication** - HTTP only for initial page load
3. **QR code contains full URL** - Including room code parameter
4. **Timer managed server-side** - Broadcast ticks to keep clients synced
5. **Answers/bids lock simultaneously** - Server controls timing
