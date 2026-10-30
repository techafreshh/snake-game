// Snake canvas renderer: draws grid, food and snake. No game logic here.
(function () {
  'use strict';

  function draw(canvas, state, config) {
    var ctx = canvas.getContext('2d');
    var cell = config.CELL_PX;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.food) {
      ctx.fillStyle = '#33ff33';
      ctx.fillRect(state.food.x * cell, state.food.y * cell, cell, cell);
    }

    for (var i = 0; i < state.snake.length; i++) {
      // Head is brighter so it stays readable at a glance.
      ctx.fillStyle = i === 0 ? '#99ff99' : '#33ff33';
      ctx.fillRect(state.snake[i].x * cell, state.snake[i].y * cell, cell, cell);
    }
  }

  window.SnakeRender = {
    draw: draw
  };
})();
