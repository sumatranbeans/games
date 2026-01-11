# ALIAS AUCTION - Agent Build Instructions

## Your Mission

Build the Alias Auction game with **3 complete, standalone visual variants**. Each variant is a separate codebase in its own folder.

---

## Game Summary

Players bid on how FEW words they can use to describe a target word. The lowest bidder must deliver their clue, and the group votes on whether it worked.

**Tagline**: *"I can describe it in THREE words!" "I can do it in TWO!"*

---

## Complete Game Rules

### Setup
- 3-6 players
- TV displays shared game board
- Phones are controllers

### Game Flow (per round)

**1. Word Reveal Phase (3 seconds)**
- TV shows target word to ALL players
- Everyone sees: "The word is: GIRAFFE"

**2. Bidding Phase (30 seconds max)**
- Starting bid: 5 words
- Players tap to bid lower: 4, 3, 2, 1
- Each bid must be lower than current
- Bidding ends when:
  - Timer expires, OR
  - Someone bids "1 word", OR
  - 5 seconds pass with no new bids

**3. Description Phase (20 seconds)**
- Lowest bidder sees: "Describe GIRAFFE in 3 words"
- They type their clue on their phone
- Other players wait (TV shows "Marcus is thinking...")
- When ready, description is revealed to all

**4. Voting Phase (15 seconds)**
- TV shows: "Marcus said: 'tall spotted animal' for GIRAFFE"
- All OTHER players vote: Success or Fail
- Majority wins (ties go to describer)

**5. Scoring Phase (5 seconds)**
- Success: Describer gets points based on word count bid
- Failure: Describer loses 2 points
- Display updated scores

### Scoring Table

| Words Used | Points if Success |
|------------|-------------------|
| 5 words    | +1 point         |
| 4 words    | +2 points        |
| 3 words    | +3 points        |
| 2 words    | +4 points        |
| 1 word     | +5 points (LEGENDARY!) |
| Failed     | -2 points        |

### Word Lists by Difficulty

**Easy**: CAT, PIZZA, HAPPY, HOUSE, BEACH, DOG, TREE, BALL, RAIN, SUN, BOOK, CHAIR, BIRD, FISH, FLOWER, MUSIC, DANCE, SLEEP, JUMP, RUN, SWIM, COOK, SMILE, LAUGH, CRY, COLD, HOT, BIG, SMALL, FAST, SLOW, RED, BLUE, GREEN, YELLOW, APPLE, BANANA, MILK, BREAD, WATER, DOOR, WINDOW, TABLE, BED, PHONE, CAR, TRAIN, PLANE, BOAT, BIKE

**Medium**: TELESCOPE, BIRTHDAY, SCIENTIST, ADVENTURE, MOUNTAIN, RAINBOW, LIBRARY, HOSPITAL, ELEPHANT, BUTTERFLY, VOLCANO, DINOSAUR, ASTRONAUT, SUPERHERO, RESTAURANT, CHOCOLATE, STRAWBERRY, UMBRELLA, FIREWORKS, ORCHESTRA, SUBMARINE, HELICOPTER, EARTHQUAKE, THUNDERSTORM, PHOTOGRAPHY, SKATEBOARD, TREEHOUSE, WATERFALL, GYMNASTICS, BASKETBALL

**Hard**: DEMOCRACY, FRUSTRATION, PROCRASTINATE, SERENDIPITY, NOSTALGIA, PHILOSOPHY, IMAGINATION, PERSEVERANCE, COLLABORATION, SUSTAINABILITY, EMBARRASSMENT, ENTHUSIASM, DETERMINATION, ACCOMPLISHMENT, EXTRAORDINARY, COMMUNICATION, RESPONSIBILITY, INDEPENDENCE, CIVILIZATION, OPPORTUNITY

### Game Length
- Quick: 5 rounds
- Standard: 7 rounds
- Extended: 10 rounds

---

## Technical Requirements

See `/docs/architecture.md` for full details.

**Key Points:**
- Node.js + Express + WebSocket (ws package)
- TV client at `/tv` endpoint
- Controller client at `/controller` endpoint
- QR code with local network IP for joining
- All game state managed server-side

---

## Build 3 Variants

Create each in its own folder:
- `/AliasAuction/v1-playful/`
- `/AliasAuction/v2-minimal/`
- `/AliasAuction/v3-retro/`

Each is a **complete, standalone codebase**.

---

## VARIANT 1: v1-playful

### Visual Style Guide

**Colors:**
- Primary: Vibrant purple (#7C3AED)
- Secondary: Hot pink (#EC4899)
- Accent: Sunny yellow (#FBBF24)
- Success: Lime green (#84CC16)
- Background: Light cream (#FFFBEB)

**Typography:**
- Headers: Rounded, bouncy font (Google Fonts: "Nunito" or "Quicksand")
- Body: Clean sans-serif

**UI Elements:**
- Large, rounded buttons with subtle shadows
- Playful animations (bounce, wiggle)
- Confetti on wins
- Player avatars as colorful circles with initials

**TV Display:**
- Large, centered word display
- Animated progress bar for timer
- Score board with player colors

**Phone Controller:**
- Big, thumb-friendly buttons
- Satisfying tap feedback
- Simple, uncluttered layout

---

## VARIANT 2: v2-minimal

### Visual Style Guide

**Colors:**
- Primary: Pure black (#000000)
- Background: Pure white (#FFFFFF)
- Accent: Deep orange (#FF5722)
- Gray tones: #F5F5F5, #E0E0E0, #9E9E9E

**Typography:**
- Headers: Bold, geometric sans-serif (Google Fonts: "Inter" or "Space Grotesk")
- Body: Light weight, lots of whitespace

**UI Elements:**
- Thin borders, no shadows
- Minimal animations (subtle fades only)
- No emojis, no decorations
- Focus on typography hierarchy

**TV Display:**
- Word displayed LARGE and centered
- Minimal chrome - content is king
- Timer as thin progress line
- Scores in small, elegant typography

**Phone Controller:**
- Text-based buttons
- Generous padding and spacing
- Almost no color except accent for CTAs

---

## VARIANT 3: v3-retro

### Visual Style Guide

**Colors:**
- Primary: Electric blue (#00D4FF)
- Secondary: Neon pink (#FF00FF)
- Accent: Bright green (#00FF00)
- Background: Dark purple/black (#1A0A2E)

**Typography:**
- Headers: Pixel font (Google Fonts: "Press Start 2P")
- Body: Monospace font

**UI Elements:**
- CRT screen effect (subtle scanlines, slight glow)
- Pixel-perfect borders
- 8-bit style animations
- "INSERT COIN" style messaging

**TV Display:**
- Arcade cabinet aesthetic
- High score table format
- Chunky, pixelated timer

**Phone Controller:**
- Arcade button aesthetic
- D-pad style navigation option
- Retro sound effects encouraged

---

## Folder Structure (Each Variant)

```
/v1-playful/
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
│       └── /sounds
└── /game
    ├── GameState.js
    ├── words.js
    └── scoring.js
```

---

## Git Workflow

**Commit continuously** as you build. Suggested commit points:

1. Initial project setup (package.json, folder structure)
2. Basic server with WebSocket
3. TV display - lobby/join screen
4. Controller - join flow
5. Game state management
6. Bidding phase implementation
7. Description phase implementation
8. Voting phase implementation
9. Scoring and results
10. Styling and polish
11. Final testing and fixes

**Commit message format:**
```
[AliasAuction/v1] Add bidding phase UI

- Implement bid buttons on controller
- Add current bid display on TV
- Handle bid WebSocket events
```

---

## Implementation Guide

### server.js Key Functions

```javascript
// Must implement:
createRoom()           // Generate 4-letter room code
joinRoom(code, name)   // Add player to room
startGame(code)        // Begin game
handleBid(code, playerId, wordCount)
handleDescription(code, playerId, text)
handleVote(code, playerId, vote)
broadcastState(code)   // Send state to all clients
```

### TV Display Phases

```javascript
// Must handle:
LOBBY        // QR code, player list, start button
WORD_REVEAL  // Show target word dramatically
BIDDING      // Current bid, who's bidding, timer
DESCRIBING   // "Player is thinking...", then reveal
VOTING       // Show description, await votes
RESULTS      // Show if success/fail, points awarded
GAME_OVER    // Final scores, winner celebration
```

### Controller Phases

```javascript
// Must handle:
JOIN         // Name input, waiting for game
BIDDING      // Bid buttons (lower than current)
DESCRIBING   // Text input (if you're the bidder)
VOTING       // Success/Fail buttons (if not bidder)
WAITING      // "Watch the TV!" message
RESULTS      // Your score update
```

---

## Quality Checklist

Before considering a variant complete:

- [ ] Server starts without errors
- [ ] QR code displays and is scannable
- [ ] 3+ players can join simultaneously
- [ ] Bidding works (lower bids only)
- [ ] Lowest bidder gets description prompt
- [ ] Description is revealed to all
- [ ] Voting works (majority rules)
- [ ] Scoring is correct
- [ ] Game ends after set rounds
- [ ] Winner is announced
- [ ] Can start new game without refresh
- [ ] Works on actual phones (not just desktop)
- [ ] Styling matches variant guide
- [ ] No console errors

---

## Start Building!

Begin with v1-playful, then v2-minimal, then v3-retro. Commit and push continuously.
