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

  window.SnakeRender = {
    draw: draw
  };
})();
