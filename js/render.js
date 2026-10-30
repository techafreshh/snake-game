// Snake canvas renderer: draws grid, food and snake. No game logic here.
// draw(canvas, state, config, alpha) lerps each segment from
// state.prevSnake[i] to state.snake[i] in cell units, then scales to pixels.
(function () {
  'use strict';

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
    draw: draw
  };
})();
