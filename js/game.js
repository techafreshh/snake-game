// Snake engine: grid model, state machine, fixed-timestep loop.
// No DOM or canvas access here except the canvas id passed to init().
(function () {
  'use strict';

  var CONFIG = {
    GRID_SIZE: 24,
    TICK_MS: 150,
    CELL_PX: 20,
    SCORE_PER_FOOD: 10
  };

  var state = {
    snake: [],
    dir: { x: 1, y: 0 },
    queuedDir: null,
    food: { x: 5, y: 5 },
    score: 0,
    status: 'title'
  };

  var canvas = null;
  var acc = 0;
  var lastTime = 0;
  var onFrame = null;

  function resetGame() {
    var c = Math.floor(CONFIG.GRID_SIZE / 2);
    state.snake = [
      { x: c, y: c },
      { x: c - 1, y: c },
      { x: c - 2, y: c }
    ];
    state.dir = { x: 1, y: 0 };
    state.queuedDir = null;
    state.score = 0;
    state.status = 'title';
    acc = 0;
    placeFood();
  }

  function isOnSnake(x, y) {
    for (var i = 0; i < state.snake.length; i++) {
      if (state.snake[i].x === x && state.snake[i].y === y) {
        return true;
      }
    }
    return false;
  }

  function placeFood() {
    var free = [];
    var x;
    var y;
    for (x = 0; x < CONFIG.GRID_SIZE; x++) {
      for (y = 0; y < CONFIG.GRID_SIZE; y++) {
        if (!isOnSnake(x, y)) {
          free.push({ x: x, y: y });
        }
      }
    }
    if (free.length === 0) {
      state.food = null;
      return;
    }
    state.food = free[Math.floor(Math.random() * free.length)];
  }

  // Guard against reversing into the snake's own neck: compare with
  // the last applied direction, not the last pressed key.
  function setDirection(x, y) {
    if ((x === -state.dir.x && y === -state.dir.y) || (x === state.dir.x && y === state.dir.y)) {
      return;
    }
    if (state.queuedDir && x === -state.dir.x && y === -state.dir.y) {
      return;
    }
    state.queuedDir = { x: x, y: y };
  }

  function start() {
    if (state.status === 'playing') {
      return;
    }
    if (state.status === 'over') {
      resetGame();
    }
    state.status = 'playing';
  }

  function step() {
    if (state.status !== 'playing') {
      return;
    }
    if (state.queuedDir) {
      // Re-check reversal at apply time so a fast double-turn
      // can never reverse into the neck.
      if (!(state.queuedDir.x === -state.dir.x && state.queuedDir.y === -state.dir.y)) {
        state.dir = state.queuedDir;
      }
      state.queuedDir = null;
    }
    var head = state.snake[0];
    var nx = head.x + state.dir.x;
    var ny = head.y + state.dir.y;

    // Wall death (Classic rules: walls kill).
    if (nx < 0 || ny < 0 || nx >= CONFIG.GRID_SIZE || ny >= CONFIG.GRID_SIZE) {
      state.status = 'over';
      return;
    }
    // Self death. The tail cell is allowed when it will move away,
    // i.e. when this step does not eat food.
    var eating = state.food && nx === state.food.x && ny === state.food.y;
    for (var i = 0; i < state.snake.length; i++) {
      if (!eating && i === state.snake.length - 1) {
        continue;
      }
      if (state.snake[i].x === nx && state.snake[i].y === ny) {
        state.status = 'over';
        return;
      }
    }

    state.snake.unshift({ x: nx, y: ny });
    if (eating) {
      state.score += CONFIG.SCORE_PER_FOOD;
      placeFood();
    } else {
      state.snake.pop();
    }
  }

  function frame(now) {
    if (!lastTime) {
      lastTime = now;
    }
    var dt = now - lastTime;
    lastTime = now;
    // Clamp delta so a background tab does not cause a death spiral.
    if (dt > 1000) {
      dt = 1000;
    }
    if (state.status === 'playing') {
      acc += dt;
      while (acc >= CONFIG.TICK_MS) {
        step();
        acc -= CONFIG.TICK_MS;
        if (state.status !== 'playing') {
          acc = 0;
          break;
        }
      }
    }
    if (window.SnakeRender && canvas) {
      window.SnakeRender.draw(canvas, state, CONFIG);
    }
    if (onFrame) {
      onFrame(state);
    }
  }

  function loop(now) {
    frame(now);
    window.requestAnimationFrame(loop);
  }

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    resetGame();
    if (window.SnakeRender && canvas) {
      window.SnakeRender.draw(canvas, state, CONFIG);
    }
    window.requestAnimationFrame(loop);
  }

  window.SnakeGame = {
    CONFIG: CONFIG,
    init: init,
    start: start,
    resetGame: resetGame,
    setDirection: setDirection,
    step: step,
    placeFood: placeFood,
    getState: function () {
      return state;
    },
    setOnFrame: function (cb) {
      onFrame = cb;
    }
  };
})();
