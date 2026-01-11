# Testing Instructions for Game Variants

## Overview

This document provides instructions for continuously testing all game variants as they are developed.

**Games:** Alias Auction, Quick Think
**Variants per game:** v1-playful, v2-minimal, v3-retro
**Total:** 6 separate applications to test

---

## Environment Setup

### Requirements
- Node.js v18 or higher
- npm v8 or higher
- Multiple devices on same WiFi network:
  - 1 device with large screen (TV/monitor/laptop) for display
  - 2-6 phones/tablets for controllers

### Network Requirements
- All devices must be on the same local network
- Firewall must allow connections on port 3000
- If testing on same machine, use multiple browser tabs

---

## Running a Variant

```bash
# Navigate to variant folder
cd /Games/AliasAuction/v1-playful

# Install dependencies (first time only)
npm install

# Start server
npm start

# Server will display:
# > Server running on http://192.168.x.x:3000
# > Open /tv on your TV display
```

**Access Points:**
- TV Display: `http://[LOCAL_IP]:3000/tv`
- Controller: Scan QR code, or `http://[LOCAL_IP]:3000/controller?room=[CODE]`

---

## Continuous Testing Workflow

As the development agents build, you should:

1. **Monitor for new code** - Check git commits in both game folders
2. **Test as variants become functional** - Don't wait for completion
3. **Report issues immediately** - So dev agents can fix while context is fresh
4. **Re-test after fixes** - Verify issues are resolved

---

## Test Scenarios

### A. Connection Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Server Start | Run `npm start` | Server starts, displays local IP |
| TV Connect | Open /tv in browser | Lobby screen with QR code appears |
| QR Code Works | Scan QR with phone | Controller page opens |
| Player Join | Enter name, tap Join | Name appears on TV player list |
| Multiple Players | 3-6 devices join | All names appear, count updates |
| Player Disconnect | Close phone browser | Player removed from list |
| Reconnection | Refresh phone browser | Player can rejoin |

### B. Alias Auction Game Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Game Start | Host taps Start | Word reveal phase begins |
| Word Display | Watch TV | Target word shown to all |
| Initial Bid | Any player bids | Bid shows as "5 words" |
| Lower Bid | Another player bids | Only lower numbers available |
| Bid Timer | Wait 30 seconds | Bidding ends automatically |
| Quick End | Bid "1 word" | Bidding ends immediately |
| Description Prompt | After bidding | Winning bidder sees input |
| Submit Description | Type and submit | Description sent |
| Description Reveal | After submission | TV shows description |
| Vote Buttons | Non-bidders see | Success/Fail buttons |
| Vote Counting | All vote | Majority determines outcome |
| Success Score | If votes pass | Bidder gets points |
| Fail Score | If votes fail | Bidder loses 2 points |
| Round End | After scoring | Next round begins |
| Game End | After all rounds | Final scores, winner |
| New Game | Tap Play Again | Returns to lobby |

### C. Quick Think Game Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Game Start | Host taps Start | Category reveal begins |
| Category Display | Watch TV | Category shown |
| Countdown | Watch TV | 3... 2... 1... GO! |
| Input Enabled | After GO! | Phone text input active |
| Type Answer | Type on phone | Characters appear |
| Timer Running | During typing | Countdown visible |
| Answer Lock | Timer hits 0 | All inputs locked |
| Reveal Phase | After lock | Answers revealed |
| Duplicate Detection | Same answers | Both marked eliminated |
| Unique Detection | Unique answer | Marked with checkmark |
| Case Insensitive | "Apple" vs "apple" | Treated as duplicate |
| Whitespace | " apple " vs "apple" | Treated as duplicate |
| Scoring | After reveal | +1 unique, 0 duplicate |
| Round End | After scoring | Next category |
| Game End | After all rounds | Final scores |

### D. Visual/UX Tests

| Test | Variant | Check |
|------|---------|-------|
| Color Scheme | All | Colors match style guide |
| Typography | All | Fonts load correctly |
| Animations | v1-playful | Bounce, wiggle, confetti |
| Minimal Style | v2-minimal | Clean, no decorations |
| Retro Style | v3-retro | Pixel fonts, CRT effects |
| Mobile Layout | All | Thumb-friendly buttons |
| TV Readability | All | Readable from 10 feet |
| Timer Visibility | All | Timer clear and prominent |

### E. Edge Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Empty Answer | Submit blank | Handled gracefully |
| Very Long Answer | Type 200+ chars | Character limit enforced |
| Special Characters | Use emoji, symbols | Handled gracefully |
| Rapid Clicks | Spam bid button | Only one bid registers |
| Mid-Game Join | Join during game | Waits or joins next round |
| Host Leaves | Close host browser | Game continues or new host |
| All Players Leave | Everyone disconnects | Room cleaned up |

### F. Performance Tests

| Test | Check |
|------|-------|
| Fast Updates | Actions appear within 100ms |
| Sync Accuracy | TV and phones show same state |
| Timer Sync | All devices same countdown |
| Memory Stable | Play 10+ rounds, no leaks |
| Rapid Rounds | Quick back-to-back works |

---

## Issue Reporting Format

```markdown
## Issue: [Brief Title]

**Game**: Alias Auction / Quick Think
**Variant**: v1-playful / v2-minimal / v3-retro
**Phase**: Lobby / Bidding / Voting / etc.

**Steps to Reproduce**:
1. [First step]
2. [Second step]
3. [What you did]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Devices**:
- TV: [Browser, OS]
- Phone: [Browser, OS]

**Console Errors** (if any):
```
[Error messages]
```

**Priority**: Critical / High / Medium / Low
```

---

## Checklist Per Variant

```markdown
## [Game] - [Variant] Test Results

### Connection
- [ ] Server starts
- [ ] QR code displays
- [ ] Players can join (3+ devices)
- [ ] Player names display

### Core Gameplay
- [ ] Game starts
- [ ] All phases transition
- [ ] Inputs work
- [ ] Scoring accurate
- [ ] Game ends properly
- [ ] Can restart

### Visual
- [ ] Styling matches guide
- [ ] Animations work
- [ ] TV readable from distance
- [ ] Mobile-friendly

### Edge Cases
- [ ] Handles disconnection
- [ ] Handles empty/invalid input
- [ ] No console errors

### Performance
- [ ] Responsive (< 100ms)
- [ ] Synced across devices
- [ ] Stable over multiple games

**Status**: PASS / FAIL / NEEDS FIXES
**Issues Found**: [List issue IDs]
```

---

## Test Priority Order

1. **Critical Path First**: Join -> Start -> Play Round -> Score -> End
2. **Multi-Player**: Always test with 3+ actual devices
3. **Visual Variants**: Test each variant's unique styling
4. **Edge Cases**: Test after core flow works

---

## Folders to Monitor

```
/Games/AliasAuction/v1-playful/
/Games/AliasAuction/v2-minimal/
/Games/AliasAuction/v3-retro/
/Games/QuickThink/v1-playful/
/Games/QuickThink/v2-minimal/
/Games/QuickThink/v3-retro/
```

Test each as it becomes runnable. Report issues to development agents.
