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
    SCORE_PER_FOOD: 10,
    BEST_KEY: 'snake-best',
    MODE_WRAP_KEY: 'snake-mode-wrap',
    OBSTACLES_KEY: 'snake-mode-obstacles',
    PRE_SPAWN_BLOCKS: 3,
    OBSTACLE_SAFE_RADIUS: 4
  };

  var state = {
    snake: [],
    prevSnake: [],
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: 5, y: 5 },
    score: 0,
    best: 0,
    wrap: false,
    obstaclesEnabled: false,
    obstacles: [],
    obstacleBlocks: [],
    isNewBest: false,
    foodsEaten: 0,
    status: 'title'
  };

  var canvas = null;
  var accumulator = 0;
  var lastTime = 0;
  var onFrame = null;

  function loadBest() {
    try {
      var raw = window.localStorage.getItem(CONFIG.BEST_KEY);
      if (raw === null || raw === undefined) {
        return 0;
      }
      var n = parseInt(raw, 10);
      if (isNaN(n) || n < 0) {
        return 0;
      }
      return n;
    } catch (e) {
      return 0;
    }
  }

  function maybeSaveBest() {
    try {
      if (state.score > state.best) {
        state.best = state.score;
        window.localStorage.setItem(CONFIG.BEST_KEY, String(state.best));
      }
    } catch (e) {}
  }

  function loadWrap() {
    try {
      var raw = window.localStorage.getItem(CONFIG.MODE_WRAP_KEY);
      return raw === '1';
    } catch (e) {
      return false;
    }
  }

  function saveWrap() {
    try {
      window.localStorage.setItem(CONFIG.MODE_WRAP_KEY, state.wrap ? '1' : '0');
    } catch (e) {}
  }

  function loadObstaclesEnabled() {
    try {
      var raw = window.localStorage.getItem(CONFIG.OBSTACLES_KEY);
      return raw === '1';
    } catch (e) {
      return false;
    }
  }

  function saveObstaclesEnabled(v) {
    try {
      window.localStorage.setItem(CONFIG.OBSTACLES_KEY, v ? '1' : '0');
    } catch (e) {}
  }

  function isObstaclesEnabled() {
    return !!state.obstaclesEnabled;
  }

  function setObstaclesEnabled(v) {
    state.obstaclesEnabled = !!v;
    saveObstaclesEnabled(state.obstaclesEnabled);
    state.obstacles = [];
    state.obstacleBlocks = [];
    if (state.obstaclesEnabled && state.snake.length > 0) {
      spawnObstacles(CONFIG.PRE_SPAWN_BLOCKS);
    }
  }

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
    state.best = loadBest();
    state.wrap = loadWrap();
    state.obstaclesEnabled = loadObstaclesEnabled();
    state.obstacles = [];
    state.obstacleBlocks = [];
    state.isNewBest = false;
    state.foodsEaten = 0;
    state.status = 'title';
    accumulator = 0;
    lastTime = 0;
    placeFood();
    if (state.obstaclesEnabled) {
      spawnObstacles(CONFIG.PRE_SPAWN_BLOCKS);
    }
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

  function isOnObstacle(x, y) {
    for (var i = 0; i < state.obstacles.length; i++) {
      if (state.obstacles[i].x === x && state.obstacles[i].y === y) {
        return true;
      }
    }
    return false;
  }

  function isSafeObstacleCell(x, y, head) {
    if (isOnSnake(x, y)) {
      return false;
    }
    if (state.food && state.food.x === x && state.food.y === y) {
      return false;
    }
    if (isOnObstacle(x, y)) {
      return false;
    }
    if (head) {
      var d = Math.abs(x - head.x) + Math.abs(y - head.y);
      if (d <= CONFIG.OBSTACLE_SAFE_RADIUS) {
        return false;
      }
    }
    return true;
  }

  function tryPlaceObstacleBlock() {
    var head = state.snake.length > 0 ? state.snake[0] : null;
    for (var attempt = 0; attempt < 200; attempt++) {
      var size = Math.random() < 0.5 ? 2 : 3;
      var horizontal = Math.random() < 0.5;
      var maxX = horizontal ? CONFIG.GRID_SIZE - size : CONFIG.GRID_SIZE - 1;
      var maxY = horizontal ? CONFIG.GRID_SIZE - 1 : CONFIG.GRID_SIZE - size;
      var ax = Math.floor(Math.random() * (maxX + 1));
      var ay = Math.floor(Math.random() * (maxY + 1));
      var cells = [];
      var ok = true;
      for (var i = 0; i < size; i++) {
        var cx = horizontal ? ax + i : ax;
        var cy = horizontal ? ay : ay + i;
        if (!isSafeObstacleCell(cx, cy, head)) {
          ok = false;
          break;
        }
        cells.push({ x: cx, y: cy });
      }
      if (!ok) {
        continue;
      }
      // Re-check food in case it moved between predicate and commit.
      for (var j = 0; j < cells.length; j++) {
        if (state.food && state.food.x === cells[j].x && state.food.y === cells[j].y) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        continue;
      }
      for (var k = 0; k < cells.length; k++) {
        state.obstacles.push(cells[k]);
      }
      state.obstacleBlocks.push(cells);
      return true;
    }
    return false;
  }

  function spawnObstacles(n) {
    for (var i = 0; i < n; i++) {
      tryPlaceObstacleBlock();
    }
  }

  function placeFood() {
    var free = [];
    var x;
    var y;
    for (x = 0; x < CONFIG.GRID_SIZE; x++) {
      for (y = 0; y < CONFIG.GRID_SIZE; y++) {
        if (!isOnSnake(x, y) && !isOnObstacle(x, y)) {
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
    var wrapped = false;
    if (nx < 0 || ny < 0 || nx >= CONFIG.GRID_SIZE || ny >= CONFIG.GRID_SIZE) {
      if (state.wrap) {
        nx = (nx + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
        ny = (ny + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
        wrapped = true;
      } else {
        maybeSaveBest();
        state.isNewBest = (state.score > 0 && state.score >= state.best);
        state.status = 'over';
        return;
      }
    }
    // Self death. The tail cell is allowed when it will move away,
    // i.e. when this step does not eat food.
    var eating = state.food && nx === state.food.x && ny === state.food.y;
    for (var i = 0; i < state.snake.length; i++) {
      if (!eating && i === state.snake.length - 1) {
        continue;
      }
      if (state.snake[i].x === nx && state.snake[i].y === ny) {
        maybeSaveBest();
        state.isNewBest = (state.score > 0 && state.score >= state.best);
        state.status = 'over';
        return;
      }
    }

    if (state.obstaclesEnabled && isOnObstacle(nx, ny)) {
      maybeSaveBest();
      state.isNewBest = (state.score > 0 && state.score >= state.best);
      state.status = 'over';
      return;
    }

    state.snake.unshift({ x: nx, y: ny });
    if (eating) {
      state.score += CONFIG.SCORE_PER_FOOD;
      maybeSaveBest();
      state.foodsEaten += 1;
      placeFood();
      if (state.obstaclesEnabled && state.foodsEaten % 5 === 0) {
        spawnObstacles(1);
      }
    } else {
      state.snake.pop();
    }
    if (wrapped) {
      // Suppress interpolation streak across the board: the renderer
      // lerps prevSnake -> snake, so anchor prev head at the wrapped head.
      state.prevSnake[0] = { x: nx, y: ny };
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
    getWrap: function () {
      return state.wrap;
    },
    setWrap: function (v) {
      state.wrap = !!v;
      saveWrap();
    },
    isObstaclesEnabled: isObstaclesEnabled,
    setObstaclesEnabled: setObstaclesEnabled,
    setOnFrame: function (cb) {
      onFrame = cb;
    }
  };
})();
