# Brainstorm Record — Snake

Ideation session, 2026-10-30 (initial discovery, `brainstorm-ideas-new` skill). Product thesis: snake games live or die on **feel** — the differentiator is tight controls, smoothness, and juice, plus just enough novelty to earn replays. Success metric: the "one more try" loop.

## Ideas by perspective

### Product Manager (market fit, differentiation)
1. Progressive speed curve — speeds up per food; the classic tension engine
2. Best-score persistence (localStorage) — the core retention hook
3. Game modes: Classic vs Wrap-around — near-free differentiation
4. Power-ups (golden apple, slow-time, shrink) — strategy beyond reflexes
5. Daily challenge / shareable score — social hook, heavier to validate

### Product Designer (UX, engagement)
1. Instant play — press an arrow, you're playing; one-key restart on death
2. Juice — interpolated movement, particle bursts, death shake/flash
3. Mobile support — swipe gestures on top of keyboard
4. Clear state affordances — live score + best, readable game-over overlay
5. Visual identity — retro-CRT neon vs clean minimal; optional sound

### Software Engineer (technical foundations)
1. Fixed-timestep loop + interpolation on Canvas — buttery motion architecture
2. Input queue with reversal guard — the #1 fix for tight controls
3. Web Audio synthesized SFX — zero asset files, big feel payoff
4. Zero-dependency vanilla JS, no build step — ship fast, host anywhere
5. Headless engine separation — enables an AI demo snake later

## Top 5 prioritized (core value → speed to validate → differentiation)

1. **Tight controls** (input queue + fixed timestep + interpolation) — the game lives or dies on feel
2. **Instant-play loop + best-score persistence** — the "one more try" engine
3. **Speed curve + Classic/Wrap modes** — cheap replay variety
4. **Juice + sound** — perceived quality
5. **Mobile swipe controls** — reach

Deferred for v1: power-up variety, daily challenges, leaderboards, AI demo, themes. See the PRD §13 for the post-MVP list.

## Decisions made with the user

| Decision | Choice |
|---|---|
| Stack | Vanilla JS + Canvas, no build step |
| Visual style | Classic green-on-black, Nokia-ish |
| v1 features | Sound effects, mobile touch, power-ups, obstacle mode |
| Libraries added | ZzFX (procedural SFX), canvas-confetti (NEW BEST), Press Start 2P (self-hosted pixel font) |
| Deployment | Cloudflare Pages via Wrangler direct upload (operator checklist in PRD) |
| Build model | pi-dark-factory: PRD → sliced issues → unattended laps (instabox mode) |

## beUI / game-UI library evaluation (asked & answered)

beUI (React component library) was evaluated and rejected: it requires React + a build step, and the game's DOM surface is tiny — all feel lives on canvas. Game-UI library research found no standalone HUD ecosystem for vanilla JS; ZzFX + canvas-confetti were adopted as the only worthwhile additions.
