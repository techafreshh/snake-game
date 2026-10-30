# PRD: Snake

| | |
|---|---|
| **Status** | Draft v1 |
| **Date** | 2026-10-30 |
| **Owner** | techafresh |
| **Related docs** | `BRAINSTORM.md` (ideation record, to be written at build time) |

---

## 1. Executive Summary

**Snake** is a browser-based take on the classic arcade game, built as a no-build vanilla JavaScript + Canvas application — the only third-party code is three tiny vendored assets (~8 KB total: ZzFX, canvas-confetti, and a self-hosted pixel font). The product bets on one thing: snake games live or die on *feel*. Every decision — buffered input, fixed-timestep simulation with interpolated rendering, synthesized sound, death juice — serves making the core loop feel tight and premium rather than tutorial-grade.

The visual identity is a classic green-on-black, Nokia-inspired blocky look: instantly readable, nostalgic, and cheap to render at 60 FPS. On top of the classic loop the game layers near-free replay variety — Classic vs Wrap modes, an obstacle mode, and two power-ups — plus a persistent best score that powers the "one more try" loop.

Deployment targets **Cloudflare Pages** via direct upload with Wrangler, giving a free, globally distributed HTTPS URL with a one-command redeploy. There is no backend, no build step, and no accounts; the entire product is static files that also run by double-clicking `index.html`.

**Core value proposition**: the tightest-feeling, most polished snake game you can open in one tap — instant play, zero friction, real juice.

**MVP goal statement**: Ship a publicly playable at `https://snake-game.pages.dev` that supports keyboard and touch play, Classic/Wrap/Obstacle modes, power-ups, synthesized sound, and best-score persistence — with zero console errors and no external dependencies.

---

## 2. Mission

> Make the web's best-feeling snake game — one file bundle anyone can play instantly, on any device, forever free.

**Core principles**

1. **Feel first** — control responsiveness and motion smoothness outrank every new feature.
2. **Instant play** — land on the page, press an arrow or swipe; you are playing. No menus, no accounts, no loading.
3. **No build, no npm** — no frameworks, no build step, no package manager. Third-party code is limited to tiny vendored classic-script files (ZzFX, canvas-confetti) plus a self-hosted font; the game code is the product.
4. **One more try** — death must be fast to understand and faster to retry; the best score is always in view.
5. **Own your code** — static files only; hosting is swappable, the game never depends on a backend.

---

## 3. Target Users

**Persona 1 — "Desk-break Dana" (primary, desktop)**
- Plays in a browser tab during short breaks using arrow keys or WASD.
- Technically comfortable but unwilling to sign up for anything.
- Needs: instant start, one-key restart, visible best score to beat.

**Persona 2 — "Commuter Casey" (primary, mobile)**
- Plays on a phone with one thumb, often one-handed, possibly offline-quality connectivity.
- Needs: swipe controls that never get misread as page scroll, large tap targets, no layout break at small viewports.

**Persona 3 — techafresh (maintainer)**
- Developer-owner who wants a small, readable codebase and a one-command deploy.

**Shared pain points addressed**: tutorial-grade snake clones feel unresponsive (dropped quick-turns, jumpy movement), bury the player in menus, and die on mobile.

---

## 4. MVP Scope

### In Scope

**Core Functionality**
- [x] 24×24 grid snake: movement, food eating, growth, self-collision and wall-collision death
- [x] Fixed-timestep game loop (accumulator pattern) with interpolated rendering
- [x] Input queue (max 2 buffered turns) with reversal guard
- [x] Progressive speed curve: tick interval 150 ms → 60 ms floor, shrinking per food eaten
- [x] Game modes: **Classic** (walls kill) and **Wrap** (edges portal), toggleable on the title screen
- [x] **Obstacle mode**: random 2–3 cell blocks, spawning away from the spawn zone; one new block per 5 foods
- [x] Power-ups: **Golden apple** (+50 pts, grows snake by 2) and **Slow-time** (tick interval ×1.6 for 5 s); ~15% spawn chance per food, 8 s despawn with blink warning
- [x] Score + best score with localStorage persistence and "NEW BEST!" flash
- [x] Pause (P key) and auto-pause on window blur

**UX / UI**
- [x] Instant-play title screen ("press any arrow / swipe / tap")
- [x] Always-visible score bar (current + best)
- [x] Game-over overlay with final score and one-key/tap instant restart
- [x] Juice: particle burst on eat, screen shake + flash on death, score pop text
- [x] Green-on-black Nokia-ish visual theme, blocky sprites

**Technical**
- [x] Ship a CI workflow (`.github/workflows/ci.yml`) as the first deliverable: run `node --check` on every `js/*.js` file on every PR
- [x] ZzFX-powered procedural SFX (eat, power-up, death, start) — no audio files
- [x] Self-hosted pixel font (Press Start 2P woff2) for HUD and overlays — no CDN, works offline
- [x] canvas-confetti celebration burst on "NEW BEST!"
- [x] Mute toggle (M key + button), persisted
- [x] Mobile support: swipe gestures (24 px threshold), tap to start/restart, `touch-action: none`
- [x] Responsive canvas with devicePixelRatio-aware scaling

**Deployment**
- [x] Cloudflare Pages deployment via Wrangler direct upload
- [x] README with run, controls, and deploy instructions

### Out of Scope (deferred)

**Core Functionality**
- [ ] Online leaderboards / accounts
- [ ] Daily challenge (seeded board) or shareable score
- [ ] Additional power-up types (shrink, magnet, ghost)
- [ ] Multiplayer (local or networked)

**Technical**
- [ ] PWA / offline install support
- [ ] AI demo snake on the title screen (requires engine reuse work)
- [ ] Theme/skin system, CRT shader effects
- [ ] Gamepad support
- [ ] Analytics

**Deployment**
- [ ] Git-connected auto-deploys (CI) — direct upload only for MVP
- [ ] Custom domain setup

---

## 5. User Stories

1. **As a casual player, I want to start playing within one second of opening the page, so that I get instant fun without menus or loading.**
   *Example*: Open `https://snake-game.pages.dev`, press `→` — the snake immediately starts moving.

2. **As a player, I want buffered, responsive controls, so that quick double-turns always register and never kill me unfairly.**
   *Example*: While moving right, press `↑` then `←` within one tick — the snake goes up, then left; it never reverses into its own neck.

3. **As a player, I want my best score saved locally, so that I always have a target to beat.**
   *Example*: Score 120, close the browser, return tomorrow — "BEST 120" is still shown; beating it triggers a "NEW BEST!" flash.

4. **As a player, I want game modes, so that the game stays fresh after I master Classic.**
   *Example*: Toggle Wrap on the title screen — the snake exits the right edge and reappears on the left.

5. **As a player, I want power-ups, so that there is strategy beyond pure reflexes.**
   *Example*: Grab a blinking golden apple before it despawns — +50 points and the snake grows by 2.

6. **As a mobile player, I want swipe controls, so that I can play comfortably on my phone.**
   *Example*: Swipe left anywhere on the canvas — the snake turns left and the page does not scroll.

7. **As a player, I want clear game-over feedback, so that I understand why I died and can retry instantly.**
   *Example*: Hitting a wall triggers a flash + shake, the overlay shows the final score, and tapping restarts immediately.

**Technical stories**

8. **As the developer, I want a fixed-timestep simulation with interpolated rendering, so that gameplay is consistent across 60/120/144 Hz displays and motion stays smooth.**

9. **As the developer, I want game logic separated from rendering, audio, and input, so that future features (e.g., an AI demo) can reuse the pure engine.**

10. **As the developer, I want deployment to be one command, so that updates go live in seconds.**
    *Example*: Run `npx wrangler pages deploy .` — the new build is live on `snake-game.pages.dev`.

---

## 6. Core Architecture & Patterns

**Approach**: A single-page static app. Plain `<script>` tags loaded in dependency order (not ES modules) so the game works from both `file://` and any HTTP server with zero tooling.

```
snake-game/
├── index.html      # canvas + DOM overlays (title, score bar, game over) + script tags
├── style.css       # green-on-black theme, pixel font, responsive layout, touch-action: none
├── js/
│   ├── game.js     # config constants, state machine, loop, all game logic
│   ├── render.js   # canvas drawing, particles, screen shake
│   ├── audio.js    # ZzFX-powered procedural SFX
│   ├── touch.js    # swipe gestures + tap handling
│   └── main.js     # DOM wiring: keyboard, buttons, mode toggles, score display
├── vendor/         # third-party libs, vendored classic <script> builds (no npm/CDN)
│   ├── zzfx.js
│   └── canvas-confetti.min.js
├── fonts/          # self-hosted Press Start 2P (woff2 subset)
└── README.md
```

**Key patterns**

- **State machine**: `TITLE → PLAYING ⇄ PAUSED → GAME_OVER → PLAYING`. All transitions explicit; input handling is per-state.
- **Fixed-timestep loop**: `requestAnimationFrame` drives an accumulator; simulation advances in fixed ticks (150 ms → 60 ms floor). Render interpolates positions between the previous and current tick for smooth motion regardless of display refresh rate. Frame delta is clamped to avoid spiral-of-death after tab switches.
- **Input queue**: directional inputs push into a queue (max depth 2); each tick consumes one, validated against the last *applied* direction (reversal guard) — not the last pressed key.
- **Separation of concerns**: `game.js` holds pure state + logic (no DOM/canvas access); `render.js`, `audio.js`, `touch.js` are consumers. Enables headless testing and future AI demo.
- **Persistence**: localStorage for best score, mute, and mode preferences (see §10).
- **Lazy audio**: `AudioContext` created on first user gesture to satisfy browser autoplay policies.

---

## 7. Tools/Features (Specification)

### 7.1 Core gameplay
| Parameter | Value |
|---|---|
| Grid | 24 × 24 cells |
| Start position | Center, length 3, moving right |
| Tick interval | 150 ms at start; −2.5% per food eaten; floor 60 ms |
| Growth per food | +1 segment (+2 for golden apple) |
| Score per food | 10 (golden apple: 50) |
| Death | Wall hit (Classic), self-collision (all modes); obstacles kill in Obstacle mode |

### 7.2 Modes (title-screen toggles, persisted)
- **Classic** — walls are lethal (default).
- **Wrap** — edges teleport to the opposite side.
- **Obstacles** (independent toggle) — pre-spawned 2–3 cell gray blocks; one extra block per 5 foods eaten; never spawn within 4 cells of the snake head or on food/power-up/snake cells.

### 7.3 Power-ups
| Power-up | Appearance | Effect | Lifetime |
|---|---|---|---|
| Golden apple | Star shape, bright gold-green | +50 pts, grow +2 | 8 s, blinks final 2 s |
| Slow-time | Clock glyph | Tick interval ×1.6 for 5 s | 8 s, blinks final 2 s |

Spawn rule: after each food eaten, ~15% chance to spawn one power-up on a free cell (only one on the board at a time).

### 7.4 Juice & audio
- Particle burst (8–12 green squares) on eating anything; score pop text at the eaten cell.
- Death: red-green flash + ~150 ms screen shake.
- SFX synthesized with **ZzFX** (procedural, zero audio files): eat chomp, power-up rising arpeggio, death descending buzz, start tick. Parameters tuned in the ZzFX editor and checked into `audio.js`. Master mute persisted.
- "NEW BEST!" flash on the game-over overlay when the record is beaten, plus a **canvas-confetti** burst (skipped when the OS prefers reduced motion).
- HUD and overlay text set in **Press Start 2P** (self-hosted woff2, monospace fallback) at sizes that stay legible on mobile.

### 7.5 Controls
| Input | Action |
|---|---|
| Arrows / WASD | Direction (queued) |
| Space / Enter | Start / restart |
| P | Pause toggle |
| M | Mute toggle |
| Swipe (24 px threshold) | Direction on touch devices |
| Tap | Start / restart on touch devices |

---

## 8. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | Vanilla JavaScript (ES2020+) | Plain scripts, no modules — `file://` compatible |
| Rendering | HTML5 Canvas 2D | devicePixelRatio-aware, 60 FPS target |
| UI shell | HTML + CSS3 | DOM overlays for title/score/game-over; canvas for the play field |
| Audio | Web Audio API | Oscillator-based synthesis, zero asset files |
| Storage | localStorage | Best score, mute, mode preferences |
| SFX | ZzFX (~1 KB) | Procedural Web Audio synthesis; vendored classic script |
| Celebration | canvas-confetti (~6 KB) | UMD classic script; fires on NEW BEST |
| Typography | Press Start 2P (self-hosted woff2) | Pixel font, no CDN, offline-safe |
| Frameworks/deps | **None** | No npm, no build step; third-party code vendored as plain `<script>` files |
| Deployment | Cloudflare Pages + Wrangler CLI (`npx wrangler`) | Direct upload of static files; free tier |

**Browser support**: evergreen Chrome, Edge, Firefox, Safari (desktop + mobile). No IE/legacy support.

---

## 9. Security & Configuration

**Security scope**: The product has no backend, no accounts, no network calls after load, and stores no personal data. accordingly:
- In scope: correct localStorage usage (non-sensitive prefs only), no `eval`/inline event handlers, no third-party network requests at runtime (ZzFX, canvas-confetti, and the pixel font are all vendored/self-hosted), HTTPS enforced automatically by `*.pages.dev`.
- Out of scope: authentication, authorization, rate limiting, GDPR/PIPEDA workflows (no PII collected).

**Configuration management**: All tuning constants (grid size, tick speeds, spawn rates, palette) live at the top of `js/game.js` as a single `CONFIG` object — no environment variables needed.

**Deployment considerations**: Cloudflare Pages serves static assets with automatic TLS, HTTP/3, and global CDN caching; immutable asset caching is default. Deploys are atomic with instant rollback via the Cloudflare dashboard. Wrangler authentication is a one-time browser OAuth flow (or `CLOUDFLARE_API_TOKEN` for headless deploys).

---

## 10. API Specification

**N/A — client-only product.** There are no HTTP endpoints.

The storage contract (localStorage keys) is the only external interface:

| Key | Type | Purpose |
|---|---|---|
| `snake-best` | number | Best score ever achieved |
| `snake-muted` | boolean ("0"/"1") | Sound preference |
| `snake-mode-wrap` | boolean ("0"/"1") | Wrap mode selection |
| `snake-mode-obstacles` | boolean ("0"/"1") | Obstacle mode selection |

---

## 11. Success Criteria

**MVP success = the game is live at `https://snake-game.pages.dev`, playable end-to-end on desktop and mobile, with zero console errors.**

**Functional requirements**
- [ ] CI workflow (`node --check` on all `js/*.js`) is green on every PR
- [ ] Snake moves, eats, grows, and dies correctly in all mode combinations
- [ ] Quick double-turn inputs always register (reversal never possible)
- [ ] Best score persists across reloads and browser restarts
- [ ] Both power-ups spawn, apply their effects, and despawn with blink warning
- [ ] Obstacle mode spawns blocks that kill but never spawn on the snake/food
- [ ] Swipe controls work; the page never scrolls or zooms during play on mobile
- [ ] All four ZzFX SFX play; mute persists
- [ ] "NEW BEST!" triggers the confetti burst; it is skipped under reduced motion
- [ ] Pause works via P and on window blur
- [ ] Game runs correctly both from `file://` and the deployed URL

**Quality indicators**
- [ ] 60 FPS rendering on a mid-range phone and any desktop display (60/120/144 Hz)
- [ ] Input-to-turn latency ≤ 1 tick in all cases
- [ ] Zero console errors/warnings on load and during 5 minutes of play
- [ ] Zero external network requests at runtime (all assets self-hosted)
- [ ] No layout break at 390 × 844 (iPhone) and 768 × 1024 (tablet) viewports

**User experience goals**
- Playable within 1 second of page load; restart requires exactly one input
- Death cause is always visually obvious (flash/shake points at the collision)

---

## 12. Implementation Phases

### Phase 1 — Playable core (est. ~2 h)
**Goal**: The classic loop feels great; everything else is deferred.
- Scaffold `index.html` + `style.css` (canvas, score bar, overlays, theme) with self-hosted Press Start 2P in `fonts/`
- `js/game.js`: state machine, grid model, fixed-timestep loop + accumulator + interpolation, input queue with reversal guard, food spawn, collisions, score + best persistence
- `js/render.js`: snake (with eyes), food, score bar, game-over overlay

**Validation**: 30 s uninterrupted local play session with no errors; double-turn test passes; refresh retains best score.

### Phase 2 — Modes, power-ups, audio (est. ~1.5 h)
**Goal**: Replay variety and feel depth.
- Wrap mode, Obstacle mode spawner
- Power-up spawner (golden apple, slow-time) with despawn blink
- Vendor ZzFX into `vendor/`; `js/audio.js`: ZzFX-tuned SFX (eat, power-up, death, start), mute toggle, lazy AudioContext

**Validation**: Each mode toggle changes behavior correctly; power-up effects verified; sounds play after first gesture; mute persists.

### Phase 3 — Juice, mobile, polish (est. ~1.5 h)
**Goal**: Premium feel and full reach.
- Particles, screen shake + death flash, score pops, "NEW BEST!" flash + canvas-confetti burst (vendored into `vendor/`)
- `js/touch.js`: swipe + tap; `js/main.js` wiring (keyboard, buttons, blur auto-pause)
- Responsive verification at phone/tablet viewports

**Validation**: 390 × 844 viewport playthrough via swipe only; no page scroll; juice effects render without frame drops.

### Phase 4 — Hardening & release-readiness
**Goal**: The game is verifiably complete and deploy-ready. Cloudflare deployment itself is an operator step (see checklist below) — it is never a factory issue.
- CI green on every PR (`node --check` on all `js/*.js`)
- Scenario gates pass: static serving, all assets resolve, correct 404 handling
- Audit §11 success criteria; close any gaps as final issues

**Validation**: CI + scenario evidence shows every §11 checkbox demonstrably true.

### Operator checklist (human-only — never slice into factory issues)

These steps need interactive auth or VPS access that factory laps must never hold:

- [ ] **Before the first lap** (VPS-side): `foreman bake snake-game` — bakes the instabox snapshot this repo's laps boot from
- [ ] `npx wrangler login` (browser OAuth; free Cloudflare account if none exists yet)
- [ ] `npx wrangler pages project create snake-game --production-branch=main`
- [ ] `npx wrangler pages deploy . --project-name=snake-game` → https://snake-game.pages.dev
- [ ] After notable merges: `npx wrangler pages deploy .` to refresh the live site

---

## 13. Future Considerations

- **Online leaderboard** — natural fit now that we deploy on Cloudflare: a Worker + KV or D1 storing top scores; no accounts required (name-on-submit).
- **Daily challenge** — date-seeded food/obstacle layout, share-your-score text.
- **PWA offline** — add a service worker + manifest so the game installs and plays offline.
- **AI demo snake** — the pure engine from §6 makes a pathfinding autoplayer cheap; run it behind the title screen.
- **Power-up variety** — shrink, ghost (pass through self), magnet.
- **Theme system** — CRT scanline shader, Game Boy palette, high-contrast mode.
- **Gamepad support** — Gamepad API for couch play.

---

## 14. Risks & Mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Controls feel mushy (dropped quick-turns, jumpy motion) | Fatal to core value | Buffered input queue + reversal guard + interpolation are Phase 1 gates; playtest before any feature work |
| 2 | Mobile browser quirks: page scroll/zoom stealing swipes, audio blocked | Breaks primary mobile experience | `touch-action: none`, viewport meta, swipe threshold tuning; `AudioContext` created only on first user gesture; test at 390 × 844 in Phase 3 |
| 3 | Frame-rate variance (120/144 Hz screens, background tab) breaks simulation speed | Erratic gameplay | Accumulator pattern with clamped frame delta; simulation is dt-independent |
| 4 | Wrangler auth friction during deploy (OAuth browser flow on WSL) | Deployment blocked mid-session | Pause for user to complete login; document `CLOUDFLARE_API_TOKEN` alternative in README |
| 5 | Scope creep (leaderboards, themes, AI demo) | MVP never ships | §4 Out-of-Scope list is binding; new ideas go to §13 |

---

## 15. Appendix

**Project structure**: see §6.

**Deployment endpoints**
- Production: `https://snake-game.pages.dev`
- Preview: `https://<branch>.snake-game.pages.dev`
- Redeploy: `npx wrangler pages deploy .`

**Key references**
- Cloudflare Pages — direct upload: https://developers.cloudflare.com/pages/get-started/direct-upload/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/commands/#pages-deploy
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Fixed-timestep game loop: https://gafferongames.com/post/fix_your_timestep/
- ZzFX (procedural SFX): https://github.com/killedbyapixel/ZzFX
- canvas-confetti: https://github.com/catdad/canvas-confetti
- Press Start 2P: https://fonts.google.com/specimen/Press+Start+2P
