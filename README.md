# Snake

A green-on-black, Nokia-inspired snake game. Vanilla JS + Canvas — no frameworks, no build step, no npm.

## Why this exists

Snake games live or die on **feel**. This one is built around tight controls (input queue with reversal guard, fixed-timestep loop with interpolated rendering), an instant-play loop (press an arrow and you are playing, one key restarts on death), and cheap replay variety (speed curve, Classic/Wrap modes, obstacles, power-ups) to earn "one more try".

## Quickstart

```bash
git clone https://github.com/techafreshh/snake-game.git
cd snake-game
python3 -m http.server 8000
# -> http://localhost:8000
```

No install step: there is no `package.json` and no build. Any static server works. You can also double-click `index.html` — the game runs over `file://` with no server needed.

> [!NOTE]
> Sound needs a user gesture first (browser autoplay policy): the shared audio context unlocks on the first key, pointer, or touch input.

## Usage

Press any arrow (or swipe/tap on touch) on the title overlay to start. On death, Space, Enter, or tap restarts instantly.

### Controls

| Input | Action |
|---|---|
| Arrow keys / WASD | Steer (also starts the game from the title screen) |
| Swipe (touch) | Steer (swipes over 24 px re-anchor, so a continuous drag can chain turns) |
| Space / Enter | Start, restart after game over, resume from pause |
| P | Pause / resume |
| M | Mute / unmute |

Additional behavior worth knowing:

- Switching tabs auto-pauses mid-game (the `blur` handler pauses while `playing`).
- Steering keys pressed while paused resume the game instead of buffering a turn.
- Touch targets on `<button>` elements are ignored by the swipe handler, so the mode buttons stay tappable.
- `touch-action: none` is set on the page, board, and overlays so play never scrolls or zooms.

### Modes and power-ups

Mode buttons sit on the title overlay (CLASSIC / WRAP) and above the board (OBSTACLES toggle); a SOUND toggle lives in the score bar. Mode choices persist across sessions (see [Configuration](#configuration)).

- **Classic** (default) — walls kill.
- **Wrap** — edges teleport to the opposite side (interpolation is anchored so the snake does not streak across the board).
- **Obstacles** — 3 blocks pre-spawn at game start (kept clear of the snake head by a safe radius), plus 1 more block every 5 foods eaten. Hitting a block kills.

Scoring and speed, exactly as coded in `js/game.js`:

- Regular food: **+10 points**. Each food eaten also speeds the snake up: tick interval starts at **150 ms** and decays by **0.975** per food, floored at **60 ms**.
- Golden apple (gold star): **+50 points**, grows **+2** segments. Spawns after eating with **15%** chance.
- Slow-time (cyan clock): no points, no growth — multiplies the tick interval by **1.6** for **5 s** (HUD shows a `SLOW Ns` countdown). Re-eating while active refreshes the window.

Power-up rules: golden and slow share a **single slot** — at most one pickup is on board, and a new one never spawns while one is present. Each expires **8 s** after spawning (wall clock) and blinks during the final **2 s**. Expiry does not run while paused.

### Presentation details

- DPR-aware canvas: the bitmap is sized to CSS pixels times `devicePixelRatio`, clamped to 3, and re-fit on resize/orientation change.
- Death reads instantly: a red/green full-canvas flash for 300 ms plus a short canvas shake, then the game-over overlay with final score.
- A new best fires a single confetti burst — skipped when the player prefers reduced motion, and independent of mute state.
- Sound is fully procedural via the vendored ZzFX synth (eat chomp, rising power-up arpeggio, descending death buzz, start tick). Zero audio files ship with the repo.

## Configuration

All persistence is `localStorage` (plain values, no backend). A corrupt or missing mute flag is normalized to unmuted (`"0"`) on boot.

| Key | Values | Meaning |
|---|---|---|
| `snake-best` | number (e.g. `"120"`) | Best score; updated whenever the live score passes it |
| `snake-muted` | `"1"` / `"0"` | Sound muted / audible |
| `snake-mode-wrap` | `"1"` / `"0"` | Wrap mode / Classic mode |
| `snake-mode-obstacles` | `"1"` / `"0"` | Obstacles on / off |

Clear them to reset: `localStorage.clear()` in devtools, or remove keys individually.

## Project structure

```
index.html   overlays (title / pause / game-over), score bar, mode buttons, script order
style.css    green-on-black theme, self-hosted Press Start 2P @font-face, responsive board
js/game.js   engine: 24x24 grid model, state machine, fixed-timestep loop, scoring, power-ups
js/render.js renderer: grid/food/snake, DPR canvas fit, eat particles, score pops, death flash, confetti
js/main.js   DOM wiring: keyboard input, overlay/score sync, mode buttons, boot, auto-pause
js/audio.js  procedural SFX: ZzFX patches, lazy AudioContext unlock, mute flag
js/touch.js  touch input: 24 px swipe threshold, 500 ms tap window, overlay binding
vendor/      third-party classic <script> builds: canvas-confetti (~10.7 KB), zzfx (~1.7 KB)
fonts/       self-hosted Press Start 2P latin-subset woff2 (~12.5 KB)
```

Third-party code is exactly the two vendored scripts plus the one self-hosted font — no CDN requests, no npm packages. Script load order in `index.html` is `zzfx.js`, `canvas-confetti.min.js`, then `audio.js`, `game.js`, `render.js`, `main.js`, `touch.js`.

CI runs `node --check` on all `js/*.js` on every push and PR.

## Limitations

- Timed pickups expire on wall-clock time, so a golden apple or slow-time pickup can despawn while the snake idles on a long tick; expiry is only frozen while paused.
- Only one power-up exists at a time — a second one can never be on the board simultaneously.
- Best score is local only (`localStorage`): no accounts, no backend, no leaderboard.
- Very small/portrait viewports shrink the board via CSS (`min(480px, 100vw - 32px, 100dvh - 260px)`); the 24x24 grid stays playable but cells get small.
- Grid, tick timings, and spawn chances are constants in `js/game.js` — there is no settings UI beyond the mode/sound buttons.

## Deploy (operator)

Cloudflare Pages deployment is a human step — see the operator checklist in `.agents/PRDs/PRD.md`:

```bash
npx wrangler login
npx wrangler pages project create snake-game --production-branch=main
npx wrangler pages deploy . --project-name=snake-game   # -> https://snake-game.pages.dev
```

Redeploy after notable merges with the same `npx wrangler pages deploy .` command; for headless deploys set `CLOUDFLARE_API_TOKEN` instead of `npx wrangler login`.
