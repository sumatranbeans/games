# QUICK THINK - Agent Build Instructions

## Your Mission

Build the Quick Think game with **3 complete, standalone visual variants**. Each variant is a separate codebase in its own folder.

---

## Game Summary

A category appears, players type answers fast, but duplicate answers are eliminated. Think fast AND think different.

**Tagline**: *"Name it before the buzzer—but don't repeat anyone!"*

---

## Complete Game Rules

### Setup
- 3-6 players
- TV displays shared game board
- Phones are controllers

### Game Flow (per round)

**1. Category Reveal (3 seconds)**
- TV dramatically reveals category
- "Things that are RED"
- Players see but CANNOT type yet

**2. Think Time (3 seconds)**
- Countdown: 3... 2... 1...
- Players prepare mentally
- Phone shows "Get ready..."

**3. Type Phase (10 seconds)**
- "GO!" appears
- Players type ONE answer on phone
- Can change answer until time runs out
- Phone shows character count
- TV shows "Players typing..."

**4. Lock In (instant)**
- All answers locked simultaneously
- TV shows "Revealing answers..."
- Brief suspense moment

**5. Reveal & Eliminate (5 seconds)**
- Answers appear one by one
- Duplicates are crossed out with X
- Unique answers get checkmark
- Sound effects for eliminate/score

**6. Scoring (3 seconds)**
- +1 point for each unique answer
- 0 points for duplicates
- Scores update on TV

### Scoring
- Unique answer: +1 point
- Duplicate answer: 0 points
- Invalid/blank: 0 points

### Category Types

| Type | Examples |
|------|----------|
| Objects | "Things in a kitchen", "Round things" |
| Colors | "Things that are RED", "Yellow foods" |
| Places | "Countries in Europe", "Beach destinations" |
| People | "Famous scientists", "Cartoon characters" |
| Abstract | "Things that make you happy", "Reasons to celebrate" |
| Actions | "Things you do in the morning", "Sports" |
| Pop Culture | "Disney movies", "Video games" |

### Category Lists

**Objects:**
Things in a kitchen, Round things, Things with wheels, Things that are soft, Things made of metal, Things you find at the beach, Things in a classroom, Things that make noise, Things you wear, Things in a toolbox, Things at a playground, Things in a bathroom, Things that grow, Things you plug in, Things in a hospital

**Colors:**
Things that are RED, Things that are BLUE, Things that are GREEN, Yellow foods, Orange things, Purple things, Pink things, White things, Black things, Brown animals

**Places:**
Countries in Europe, Cities in America, Beach destinations, Mountain locations, Famous landmarks, Places to eat, Places to shop, Cold places, Hot places, Places to visit

**People:**
Famous scientists, Cartoon characters, Superheroes, Historical figures, Musicians, Athletes, Movie stars, Book characters, Inventors, Artists

**Abstract:**
Things that make you happy, Reasons to celebrate, Things that are scary, Things that are funny, Things you're grateful for, Things you dream about, Childhood memories, Things you do for fun, Things that smell good, Things that taste sweet

**Actions:**
Things you do in the morning, Sports, Hobbies, Dance moves, Things you do outside, Things you do on vacation, Things you do at a party, Things you do quietly, Things you do fast, Things you do slowly

### Game Length
- Quick: 5 rounds
- Standard: 10 rounds
- Extended: 15 rounds

### Tie-Breaker
If tied, sudden death round - first unique answer wins.

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
- `/QuickThink/v1-playful/`
- `/QuickThink/v2-minimal/`
- `/QuickThink/v3-retro/`

Each is a **complete, standalone codebase**.

---

## VARIANT 1: v1-playful

### Visual Style Guide

**Colors:**
- Primary: Electric blue (#3B82F6)
- Secondary: Energetic orange (#F97316)
- Accent: Bright yellow (#EAB308)
- Success: Green (#22C55E)
- Eliminated: Red (#EF4444)
- Background: Light blue gradient

**Typography:**
- Headers: Bold, dynamic (Google Fonts: "Poppins" bold)
- Timer: Extra bold, large
- Answers: Clean, readable

**UI Elements:**
- Speed lines / motion blur effects
- Pulsing timer
- Explosion effect when timer ends
- Checkmarks and X marks animated
- Player cards with cute avatars

**TV Display:**
- Category in large, central display
- Dramatic countdown animation
- Answer reveal as cards flipping
- "UNIQUE!" and "ELIMINATED!" stamps

**Phone Controller:**
- Large text input field
- Character counter
- Clear visual feedback

---

## VARIANT 2: v2-minimal

### Visual Style Guide

**Colors:**
- Primary: Black (#000000)
- Background: White (#FFFFFF)
- Accent: Blue (#2563EB)
- Success: Green text
- Eliminated: Red strikethrough

**Typography:**
- All: "Inter" font family
- Category: Large, bold, centered
- Answers: Medium weight, list format

**UI Elements:**
- No decorations
- Simple transitions (fade, slide)
- Timer as clean number countdown
- Minimal visual feedback

**TV Display:**
- Category dominates screen
- Clean answer list
- Strikethrough for duplicates
- Simple score table

**Phone Controller:**
- Single text input
- Timer number only
- Minimal UI chrome

---

## VARIANT 3: v3-retro

### Visual Style Guide

**Colors:**
- Primary: Gold (#FFD700)
- Secondary: Red (#FF0000)
- Background: Deep blue (#000080)
- Text: White with glow

**Typography:**
- Headers: Pixel font (Google Fonts: "Press Start 2P")
- Answers: Monospace

**UI Elements:**
- Game show aesthetic
- Flashing lights effect
- Retro countdown beeps
- Slot machine style reveal
- CRT glow effects

**TV Display:**
- Game show board aesthetic
- "SURVEY SAYS" style reveal
- Dramatic elimination crosses
- Arcade high score format

**Phone Controller:**
- Chunky retro buttons
- Green phosphor text input
- Terminal aesthetic

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
    ├── categories.js
    └── scoring.js
```

---

## Git Workflow

**Commit continuously** as you build. Suggested commit points:

1. Initial project setup
2. Basic server with WebSocket
3. TV display - lobby/join screen
4. Controller - join flow
5. Game state management
6. Category reveal phase
7. Typing phase implementation
8. Answer collection and locking
9. Duplicate detection algorithm
10. Reveal animation
11. Scoring and results
12. Styling and polish
13. Final testing

**Commit message format:**
```
[QuickThink/v1] Implement duplicate detection

- Add case-insensitive comparison
- Trim whitespace from answers
- Mark duplicates in game state
```

---

## Implementation Guide

### server.js Key Functions

```javascript
// Must implement:
createRoom()
joinRoom(code, name)
startGame(code)
startRound(code)           // Reveal category
collectAnswer(code, playerId, answer)
lockAnswers(code)          // When timer ends
findDuplicates(answers)    // Return marked answers
calculateScores(code)
```

### Duplicate Detection Algorithm

```javascript
function findDuplicates(answers) {
  // answers = [{ playerId, answer }, ...]

  // Normalize answers
  const normalized = answers.map(a => ({
    ...a,
    normalized: a.answer.toLowerCase().trim()
  }));

  // Count occurrences
  const counts = {};
  normalized.forEach(a => {
    counts[a.normalized] = (counts[a.normalized] || 0) + 1;
  });

  // Mark duplicates
  return normalized.map(a => ({
    playerId: a.playerId,
    answer: a.answer,
    unique: counts[a.normalized] === 1
  }));
}
```

### TV Display Phases

```javascript
// Must handle:
LOBBY            // QR code, players, start
CATEGORY_REVEAL  // Dramatic category display
COUNTDOWN        // 3... 2... 1... GO!
TYPING           // "Players are typing..."
REVEAL           // Show answers one by one
SCORING          // Update scores
GAME_OVER        // Final results
```

### Controller Phases

```javascript
// Must handle:
JOIN       // Enter name
WAITING    // Watch TV
COUNTDOWN  // "Get ready..."
TYPING     // Text input, timer
LOCKED     // "Answer submitted!"
REVEAL     // Watch TV
```

---

## Quality Checklist

Before considering a variant complete:

- [ ] Server starts without errors
- [ ] QR code works for joining
- [ ] 3+ players can join
- [ ] Category displays correctly
- [ ] Countdown works (3-2-1-GO)
- [ ] All players can type answers
- [ ] Answers lock simultaneously
- [ ] Duplicates are correctly identified
- [ ] Case-insensitive matching works
- [ ] Reveal animation shows each answer
- [ ] Scoring is correct (+1 unique, 0 duplicate)
- [ ] Game ends after set rounds
- [ ] Winner announced correctly
- [ ] Can restart without refresh
- [ ] Works on actual phones
- [ ] Styling matches variant guide

---

## Start Building!

Begin with v1-playful, then v2-minimal, then v3-retro. Commit and push continuously.
