// Snake canvas renderer: draws grid, food and snake. No game logic here.
// draw(canvas, state, config, alpha) lerps each segment from
// state.prevSnake[i] to state.snake[i] in cell units, then scales to pixels.
(function () {
  'use strict';

  // Eat juice pools: renderer-owned, driven by state.lastEat events.
  // Capped so over-cap spawns drop the oldest; never allocate per frame
  // outside spawns.
  var particles = [];
  var pops = [];
  var lastT = 0;
  var seenEatId = null;
  var MAX_PARTICLES = 120;
  var MAX_POPS = 8;
  var BURST_N = 10;
  var PARTICLE_MS = 400;
  var POP_MS = 700;
  var POP_RISE_PX = 48;

  function draw(canvas, state, config, alpha) {
    var ctx = canvas.getContext('2d');
    var cell = config.CELL_PX;
    var a = (typeof alpha === 'number' && isFinite(alpha))
      ? Math.min(Math.max(alpha, 0), 1)
      : 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.obstacles && state.obstacles.length > 0) {
      ctx.fillStyle = '#808080';
      for (var b = 0; b < state.obstacles.length; b++) {
        ctx.fillRect(state.obstacles[b].x * cell, state.obstacles[b].y * cell, cell, cell);
      }
    }

    if (state.food) {
      ctx.fillStyle = '#33ff33';
      ctx.fillRect(state.food.x * cell, state.food.y * cell, cell, cell);
    }

    // Golden apple: 5-point gold star with a green edge. Skipped while
    // expired, and square-wave blinked in the final blink window.
    if (state.golden) {
      var lifetime = config.GOLDEN_LIFETIME_MS || 8000;
      var blinkMs = config.GOLDEN_BLINK_MS || 2000;
      var elapsed = Date.now() - state.golden.spawnedAt;
      var remaining = lifetime - elapsed;
      if (remaining > 0) {
        var off = remaining <= blinkMs && (Math.floor(elapsed / 125) % 2 === 1);
        if (!off) {
          drawGoldenStar(ctx, state.golden.x, state.golden.y, cell);
        }
      }
    }

    // Slow-time: cyan clock glyph with two hands. Skipped while expired,
    // and square-wave blinked in the final blink window like golden.
    if (state.slow) {
      var slowLifetime = config.SLOW_LIFETIME_MS || 8000;
      var slowBlinkMs = config.SLOW_BLINK_MS || 2000;
      var slowElapsed = Date.now() - state.slow.spawnedAt;
      var slowRemaining = slowLifetime - slowElapsed;
      if (slowRemaining > 0) {
        var slowOff = slowRemaining <= slowBlinkMs && (Math.floor(slowElapsed / 125) % 2 === 1);
        if (!slowOff) {
          drawClock(ctx, state.slow.x, state.slow.y, cell);
        }
      }
    }

    var prev = state.prevSnake;
    var canLerp = prev &&
      prev.length === state.snake.length;
    for (var i = 0; i < state.snake.length; i++) {
      var cur = state.snake[i];
      var fx = cur.x;
      var fy = cur.y;
      if (canLerp && prev[i]) {
        fx = prev[i].x + (cur.x - prev[i].x) * a;
        fy = prev[i].y + (cur.y - prev[i].y) * a;
      }
      // Head is brighter so it stays readable at a glance.
      ctx.fillStyle = i === 0 ? '#99ff99' : '#33ff33';
      ctx.fillRect(fx * cell, fy * cell, cell, cell);
    }

    drawEffects(ctx, state, config, cell);
  }

  // One burst plus one score pop per new lastEat id, then per-frame
  // advance/fade of both pools. Slow pickups burst without pop text.
  function drawEffects(ctx, state, config, cell) {
    var now = Date.now();
    var dt;
    if (!lastT) {
      dt = 0.016;
    } else {
      dt = (now - lastT) / 1000;
      if (!(dt >= 0) || !(dt <= 0.05)) {
        dt = dt < 0 ? 0 : 0.05;
      }
    }
    lastT = now;

    var burstN = config.PARTICLE_COUNT || BURST_N;
    var particleMs = config.PARTICLE_MS || PARTICLE_MS;
    var popMs = config.POP_MS || POP_MS;
    var risePx = config.POP_RISE_PX || POP_RISE_PX;
    var maxParticles = config.MAX_PARTICLES || MAX_PARTICLES;
    var maxPops = config.MAX_POPS || MAX_POPS;

    var eat = state.lastEat;
    if (!eat) {
      if (particles.length > 0 || pops.length > 0) {
        particles.length = 0;
        pops.length = 0;
      }
      seenEatId = null;
    } else if (eat.id !== seenEatId) {
      seenEatId = eat.id;
      spawnBurst(eat, cell, now, burstN, maxParticles);
      var text = null;
      if (eat.kind === 'food' || eat.kind === 'golden') {
        if (typeof eat.points === 'number' && eat.points > 0) {
          text = '+' + eat.points;
        } else if (eat.kind === 'golden') {
          text = '+' + (config.GOLDEN_SCORE || 50);
        } else {
          text = '+' + (config.SCORE_PER_FOOD || 10);
        }
      }
      if (text) {
        pops.push({
          x: (eat.x + 0.5) * cell,
          y: (eat.y + 0.5) * cell,
          text: text,
          born: now
        });
        while (pops.length > maxPops) {
          pops.shift();
        }
      }
    }

    if (particles.length === 0 && pops.length === 0) {
      return;
    }

    ctx.save();

    var k;
    for (k = particles.length - 1; k >= 0; k--) {
      if (now - particles[k].born >= particleMs) {
        particles.splice(k, 1);
      }
    }
    for (k = pops.length - 1; k >= 0; k--) {
      if (now - pops[k].born >= popMs) {
        pops.splice(k, 1);
      }
    }

    for (k = 0; k < particles.length; k++) {
      var p = particles[k];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      var age = now - p.born;
      var t = age / particleMs;
      if (t < 0) {
        t = 0;
      }
      if (t > 1) {
        t = 1;
      }
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = (k % 2 === 0) ? '#33ff33' : '#99ff99';
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    if (pops.length > 0) {
      ctx.globalAlpha = 1;
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (k = 0; k < pops.length; k++) {
        var pop = pops[k];
        var page = now - pop.born;
        var pt = page / popMs;
        if (pt < 0) {
          pt = 0;
        }
        if (pt > 1) {
          pt = 1;
        }
        ctx.globalAlpha = 1 - pt;
        ctx.fillStyle = '#fff';
        ctx.fillText(pop.text, pop.x, pop.y - pt * risePx);
      }
    }

    ctx.restore();
  }

  // Burst of green squares from the eaten cell centre. Random angle at
  // 40-160 px/s and 3-6 px size; born stamp drives the 400ms fade.
  function spawnBurst(eat, cell, now, burstN, maxParticles) {
    var cx = (eat.x + 0.5) * cell;
    var cy = (eat.y + 0.5) * cell;
    for (var i = 0; i < burstN; i++) {
      var ang = Math.random() * Math.PI * 2;
      var speed = 40 + Math.random() * 120;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        size: 3 + Math.random() * 3,
        born: now
      });
    }
    while (particles.length > maxParticles) {
      particles.shift();
    }
  }

  function resetEffects() {
    particles.length = 0;
    pops.length = 0;
    seenEatId = null;
    lastT = 0;
  }

  function counts() {
    return { particles: particles.length, pops: pops.length };
  }

  // 5-point star centered in the golden cell: gold fill, green edge.
  function drawGoldenStar(ctx, gx, gy, cell) {
    var cx = (gx + 0.5) * cell;
    var cy = (gy + 0.5) * cell;
    var outer = cell * 0.45;
    var inner = cell * 0.2;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var ang = -Math.PI / 2 + (i * Math.PI) / 5;
      var px = cx + r * Math.cos(ang);
      var py = cy + r * Math.sin(ang);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#33ff33';
    ctx.stroke();
  }

  // Clock glyph centered in the slow cell: cyan ring with two hands.
  function drawClock(ctx, sx, sy, cell) {
    var cx = (sx + 0.5) * cell;
    var cy = (sy + 0.5) * cell;
    var r = cell * 0.38;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#33ffff';
    ctx.lineWidth = Math.max(2, cell * 0.08);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.7);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.55, cy);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  window.SnakeRender = {
    draw: draw,
    resetEffects: resetEffects,
    counts: counts
  };
})();
