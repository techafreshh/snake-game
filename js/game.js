// Snake engine: grid model, state machine, fixed-timestep loop.
// No DOM or canvas access here except the canvas id passed to init().
(function () {
  'use strict';

  var CONFIG = {
    GRID_SIZE: 24,
    TICK_MS: 150,
    MIN_TICK_MS: 60,
    SPEED_DECAY: 0.975,
    CELL_PX: 20,
    SCORE_PER_FOOD: 10
  };

  var state = {
    snake: [],
    prevSnake: [],
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: 5, y: 5 },
    score: 0,
    foodsEaten: 0,
    status: 'title'
  };

  var canvas = null;
  var accumulator = 0;
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
    state.queue = [];
    state.score = 0;
    state.foodsEaten = 0;
    state.status = 'title';
    accumulator = 0;
    lastTime = 0;
    placeFood();
    snapshotPrev();
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
  // the last effective direction (queue tail if buffered, else the
  // last applied direction), so quick double-turns queue fairly.
  function setDirection(x, y) {
    var last = state.dir;
    if (state.queue.length > 0) {
      last = state.queue[state.queue.length - 1];
    }
    if ((x === last.x && y === last.y) || (x === -last.x && y === -last.y)) {
      return;
    }
    if (state.queue.length >= 2) {
      return;
    }
    state.queue.push({ x: x, y: y });
  }

  // Live tick interval: base decays per food eaten, floored at the minimum.
  function getTickMs() {
    return Math.max(CONFIG.MIN_TICK_MS, CONFIG.TICK_MS * Math.pow(CONFIG.SPEED_DECAY, state.foodsEaten));
  }

  // Deep-copy the snake so the renderer can lerp prev -> current.
  function snapshotPrev() {
    state.prevSnake = state.snake.map(function (seg) {
      return { x: seg.x, y: seg.y };
    });
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
    if (state.queue.length > 0) {
      // Re-check reversal at apply time so a queued turn that went
      // stale can never reverse into the neck.
      var entry = state.queue.shift();
      if (!(entry.x === -state.dir.x && entry.y === -state.dir.y)) {
        state.dir = entry;
      }
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
      state.foodsEaten += 1;
      placeFood();
    } else {
      state.snake.pop();
    }
  }

  function frame(now) {
    if (!lastTime) {
      lastTime = now;
    }
    var dt = Math.min(now - lastTime, 100);
    lastTime = now;
    var alpha = 1;
    if (state.status === 'playing') {
      accumulator += dt;
      var tickMs = getTickMs();
      while (accumulator >= tickMs) {
        snapshotPrev();
        step();
        accumulator -= tickMs;
        tickMs = getTickMs();
        if (state.status !== 'playing') {
          accumulator = 0;
          break;
        }
      }
      alpha = Math.min(Math.max(accumulator / tickMs, 0), 1);
    } else {
      accumulator = 0;
    }
    if (window.SnakeRender && canvas) {
      window.SnakeRender.draw(canvas, state, CONFIG, alpha);
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
      window.SnakeRender.draw(canvas, state, CONFIG, 1);
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
    frame: frame,
    loop: loop,
    getAccumulator: function () {
      return accumulator;
    },
    getAlpha: function () {
      return Math.min(Math.max(accumulator / getTickMs(), 0), 1);
    },
    getTickMs: getTickMs,
    placeFood: placeFood,
    getState: function () {
      return state;
    },
    setOnFrame: function (cb) {
      onFrame = cb;
    }
  };
})();
