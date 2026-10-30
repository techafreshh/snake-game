# Snake 🐍

A green-on-black, Nokia-inspired snake game. Vanilla JS + Canvas — no frameworks, no build step, no npm. The only third-party code is three tiny vendored assets (~8 KB total: ZzFX, canvas-confetti, Press Start 2P).

Built by the [pi-dark-factory](https://github.com/techafreshh/pi-dark-factory) — the PRD (`.agents/PRDs/PRD.md`) is sliced into GitHub issues, and unattended agent laps deliver each issue through plan → implement → verify → review → squash-merge.

## Run it

Open `index.html` in any browser (double-click works — no server needed), or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Controls

| Input | Action |
|---|---|
| Arrows / WASD | Direction |
| Swipe (touch) | Direction |
| Space / Enter / tap | Start · restart |
| P | Pause |
| M | Mute |

## Modes

- **Classic** — walls kill (default)
- **Wrap** — edges teleport to the opposite side
- **Obstacles** — random blocks spawn as you grow

Power-ups appear occasionally: the **golden apple** (+50 pts, grows +2) and **slow-time** (snake slows for 5 s).

## Deploy (operator)

Cloudflare Pages deployment is a human step — see the operator checklist in the PRD:

```bash
npx wrangler login
npx wrangler pages project create snake-game --production-branch=main
npx wrangler pages deploy . --project-name=snake-game   # → https://snake-game.pages.dev
```

## Repo notes

- `main` is written exclusively by factory laps via squash-merged PRs.
- `vendor/` holds third-party classic `<script>` builds (no npm, no CDN). `fonts/` holds the self-hosted pixel font.
- CI: `node --check` on all `js/*.js` on every PR.
