# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flappy Bird clone with 5 swappable themes. HTML5 Canvas + vanilla JavaScript (ES modules, no bundler/transpiler). Includes single-player, customization (hats/colors), Firebase-backed leaderboard, and real-time multiplayer via Firebase Realtime Database.

## Development

**No build step.** Serve the project root with any static HTTP server and open `index.html`:
```
npx serve .
# or
python3 -m http.server 8000
```

**No tests or linter configured.** Manual browser testing only.

**Deployment:** Push to `master` triggers GitHub Actions → cPanel UAPI curl to pull on Nixihost. Hosted at owlex.dev/flappyanything. Cache-busting handled by `.htaccess` (no-cache for JS/CSS/HTML).

## Architecture

### Entry & Game Loop
- `index.html` loads Firebase SDK v10.14.1 via CDN, then `js/main.js` as ES module
- `js/main.js` initializes Firebase, InputHandler, Game, and responsive canvas sizing
- `js/game.js` is the central orchestrator: state machine + `requestAnimationFrame` loop with delta-time physics

### State Machine (in `game.js`)
Single-player: `MENU → READY → PLAYING → GAME_OVER`
Screens: `CUSTOMIZE`, `LEADERBOARD`
Multiplayer: `MP_LOBBY → MP_COUNTDOWN → MP_PLAYING → MP_GAME_OVER`

### Module Responsibilities
| Module | Role |
|--------|------|
| `themes.js` | Pure data objects for all 5 themes (background, player, pipe, UI, particles, sounds) |
| `bird.js` | Player entity: physics (gravity 1200, flap -380, max fall 600), 5 draw routines by `player.type`, hat drawing (`drawHat`/`HAT_ANCHORS` exported for renderer reuse) |
| `pipe.js` | Pipe pairs with 4 texture variants (standard/rock/sandstone/coral); optional seed param for deterministic MP spawning |
| `renderer.js` | All drawing: backgrounds, menus, game-over, particles, customization screen, leaderboard, MP lobby/HUD/ghost birds |
| `input.js` | Unified keyboard/mouse/touch/scroll → flap events + click position |
| `audio.js` | Web Audio API synthesis (no audio files), per-theme sound configs |
| `storage.js` | Dual-write high scores to localStorage + cookies (fallback for private browsing) |
| `customization.js` | 14 hats + 3 crown variants, 18 body colors, per-theme persistence to localStorage |
| `auth.js` | Firebase email/password auth (sign up, sign in, sign out, password reset) |
| `leaderboard.js` | Firebase RTDB `/leaderboard/{uid}`, top 50 by score |
| `lobby.js` | Firebase RTDB `/lobbies/{code}`, 6-char codes, max 8 players, status flow: waiting→countdown→playing→game_over |
| `multiplayer.js` | Remote bird simulation: flap events via `child_added`, state snapshots at 5Hz, lerp smoothing over 100ms |
| `prng.js` | Mulberry32 seeded PRNG for deterministic pipe sequences in multiplayer |

### Key Patterns
- **Adding a theme:** Only edit `themes.js` — add a new theme object and append its key to `THEME_ORDER`. No other files need changes.
- **Character drawing:** `player.type` switch in `bird.js` (bird/penguin/rocket/cactus/submarine), not polymorphism.
- **Canvas:** Fixed 400×600 logical resolution, CSS-scaled to fit window while preserving aspect ratio.
- **Collision:** AABB with 4px inset from visual bounds (forgiving hitbox).
- **Customization:** `bodyColor: null` means "use theme default color."
- **Crown hats:** Unlocked by leaderboard rank (gold=1st, silver=2nd, bronze=3rd); checked via `game.isCrownUnlocked()`.

### Firebase Structure
```
/leaderboard/{uid}  → { displayName, score, timestamp }
/lobbies/{code}/meta → { hostUid, themeId, status, seed, startTime, createdAt }
/lobbies/{code}/players/{uid} → { displayName, customization, alive, score, y, velocity, rotation, connected, flapSeq }
```
Firebase config is hardcoded in `main.js`. Security rules in `database.rules.json`.

### Multiplayer Sync Strategy
- Pipes are deterministic via shared seed broadcast in lobby meta
- Flap events sync instantly via Firebase `child_added`
- Position state pushed at 5Hz; remote birds interpolated with lerp
- All birds render at x=80; remote players drawn at 0.4 alpha with name labels
- Collision is local-only; game ends when ≤1 player alive
