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
    GOLDEN_CHANCE: 0.15,
    GOLDEN_SCORE: 50,
    GOLDEN_GROWTH: 2,
    GOLDEN_LIFETIME_MS: 8000,
    GOLDEN_BLINK_MS: 2000,
    SLOW_FACTOR: 1.6,
    SLOW_DURATION_MS: 5000,
    SLOW_LIFETIME_MS: 8000,
    SLOW_BLINK_MS: 2000,
    BEST_KEY: 'snake-best',
    MODE_WRAP_KEY: 'snake-mode-wrap',
    OBSTACLES_KEY: 'snake-mode-obstacles',
    PRE_SPAWN_BLOCKS: 3,
    OBSTACLE_SAFE_RADIUS: 4,
    PARTICLE_COUNT: 10,
    PARTICLE_MS: 400,
    MAX_PARTICLES: 120,
    POP_MS: 700,
    POP_RISE_PX: 48,
    MAX_POPS: 8
  };

  var state = {
    snake: [],
    prevSnake: [],
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: 5, y: 5 },
    // At most one golden apple on board: { x, y, spawnedAt } or null.
    // It expires at spawnedAt + CONFIG.GOLDEN_LIFETIME_MS (wall clock).
    golden: null,
    // At most one slow-time pickup on board: { x, y, spawnedAt } or null.
    // Shares the single power-up slot with the golden apple.
    slow: null,
    // Effect-expiry timestamp (wall clock); active while Date.now() < slowUntil.
    slowUntil: 0,
    // Death timestamp (wall clock); drives the red-green flash + shake.
    diedAt: 0,
    score: 0,
    best: 0,
    wrap: false,
    obstaclesEnabled: false,
    obstacles: [],
    obstacleBlocks: [],
    isNewBest: false,
    foodsEaten: 0,
    // Last eat event for renderer juice: { x, y, kind, points, id } or null.
    // kind is 'food' | 'golden' | 'slow'. Never cleared except on reset.
    lastEat: null,
    status: 'title'
  };

  var canvas = null;
  var accumulator = 0;
  var lastTime = 0;
  var eatSeq = 0;
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
    state.golden = null;
    state.slow = null;
    state.slowUntil = 0;
    state.diedAt = 0;
    state.lastEat = null;
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

  // Golden apple: scarce timed pickup. At most one on board; the spawn
  // cell avoids snake cells, the fresh food cell and obstacles (if any).
  function spawnGolden() {
    if (state.golden || state.slow) {
      return;
    }
    var free = [];
    var x;
    var y;
    for (x = 0; x < CONFIG.GRID_SIZE; x++) {
      for (y = 0; y < CONFIG.GRID_SIZE; y++) {
        if (isOnSnake(x, y)) {
          continue;
        }
        if (state.food && state.food.x === x && state.food.y === y) {
          continue;
        }
        if (state.slow && state.slow.x === x && state.slow.y === y) {
          continue;
        }
        if (isOnObstacle(x, y)) {
          continue;
        }
        free.push({ x: x, y: y });
      }
    }
    if (free.length === 0) {
      return;
    }
    var cell = free[Math.floor(Math.random() * free.length)];
    state.golden = { x: cell.x, y: cell.y, spawnedAt: Date.now() };
  }

  // Wall-clock expiry sweep; safe to call on every step and frame.
  function updateGolden(now) {
    if (!state.golden) {
      return;
    }
    var t = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
    if (t - state.golden.spawnedAt >= CONFIG.GOLDEN_LIFETIME_MS) {
      state.golden = null;
    }
  }

  // Slow-time: defensive timed pickup. Same single-slot rules as golden:
  // never spawns while any pickup is on board; avoids snake, food,
  // the golden cell and obstacles.
  function spawnSlow() {
    if (state.golden || state.slow) {
      return;
    }
    var free = [];
    var x;
    var y;
    for (x = 0; x < CONFIG.GRID_SIZE; x++) {
      for (y = 0; y < CONFIG.GRID_SIZE; y++) {
        if (isOnSnake(x, y)) {
          continue;
        }
        if (state.food && state.food.x === x && state.food.y === y) {
          continue;
        }
        if (state.golden && state.golden.x === x && state.golden.y === y) {
          continue;
        }
        if (isOnObstacle(x, y)) {
          continue;
        }
        free.push({ x: x, y: y });
      }
    }
    if (free.length === 0) {
      return;
    }
    var cell = free[Math.floor(Math.random() * free.length)];
    state.slow = { x: cell.x, y: cell.y, spawnedAt: Date.now() };
  }

  // Wall-clock expiry sweep; safe to call on every step and frame.
  function updateSlow(now) {
    if (!state.slow) {
      return;
    }
    var t = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
    if (t - state.slow.spawnedAt >= CONFIG.SLOW_LIFETIME_MS) {
      state.slow = null;
    }
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
  // While slow-time is active the interval is multiplied by SLOW_FACTOR.
  function getTickMs() {
    var base = Math.max(CONFIG.MIN_TICK_MS, CONFIG.TICK_MS * Math.pow(CONFIG.SPEED_DECAY, state.foodsEaten));
    if (Date.now() < state.slowUntil) {
      return Math.max(CONFIG.MIN_TICK_MS, base * CONFIG.SLOW_FACTOR);
    }
    return base;
  }

  // Milliseconds of slow-time effect left; 0 when inactive. For the HUD.
  function getSlowRemaining() {
    var left = state.slowUntil - Date.now();
    return left > 0 ? left : 0;
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

  function pause() {
    if (state.status !== 'playing') {
      return;
    }
    state.status = 'paused';
    accumulator = 0;
  }

  function resume() {
    if (state.status !== 'paused') {
      return;
    }
    state.status = 'playing';
    accumulator = 0;
  }

  function togglePause() {
    if (state.status === 'playing') {
      pause();
    } else if (state.status === 'paused') {
      resume();
    }
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
        state.diedAt = Date.now();
        return;
      }
    }
    // Expire the golden apple first so a stale pickup can never be
    // eaten on its expiry tick.
    updateGolden(Date.now());
    updateSlow(Date.now());
    // Self death. The tail cell is allowed when it will move away,
    // i.e. when this step does not grow (no food and no golden eat).
    var eating = state.food && nx === state.food.x && ny === state.food.y;
    var goldenEating = state.golden && nx === state.golden.x && ny === state.golden.y;
    var slowEating = state.slow && nx === state.slow.x && ny === state.slow.y;
    var growing = eating || goldenEating;
    for (var i = 0; i < state.snake.length; i++) {
      if (!growing && i === state.snake.length - 1) {
        continue;
      }
      if (state.snake[i].x === nx && state.snake[i].y === ny) {
        maybeSaveBest();
        state.isNewBest = (state.score > 0 && state.score >= state.best);
        state.status = 'over';
        state.diedAt = Date.now();
        return;
      }
    }

    if (state.obstaclesEnabled && isOnObstacle(nx, ny)) {
      maybeSaveBest();
      state.isNewBest = (state.score > 0 && state.score >= state.best);
      state.status = 'over';
      state.diedAt = Date.now();
      return;
    }

    state.snake.unshift({ x: nx, y: ny });
    if (eating) {
      state.score += CONFIG.SCORE_PER_FOOD;
      state.lastEat = { x: nx, y: ny, kind: 'food', points: CONFIG.SCORE_PER_FOOD, id: ++eatSeq };
      maybeSaveBest();
      state.foodsEaten += 1;
      placeFood();
      if (state.obstaclesEnabled && state.foodsEaten % 5 === 0) {
        spawnObstacles(1);
      }
      // Scarce post-food spawn: only one power-up on board at a time.
      if (!state.golden && !state.slow && Math.random() < CONFIG.GOLDEN_CHANCE) {
        if (Math.random() < 0.5) {
          spawnGolden();
        } else {
          spawnSlow();
        }
      }
    } else {
      state.snake.pop();
    }
    if (goldenEating) {
      // The unshift/pop above nets 0 for a non-food step; duplicating
      // the tail GOLDEN_GROWTH times yields the immediate +2 length.
      state.score += CONFIG.GOLDEN_SCORE;
      state.lastEat = { x: nx, y: ny, kind: 'golden', points: CONFIG.GOLDEN_SCORE, id: ++eatSeq };
      var tail = state.snake[state.snake.length - 1];
      for (var gi = 0; gi < CONFIG.GOLDEN_GROWTH; gi++) {
        state.snake.push({ x: tail.x, y: tail.y });
      }
      state.golden = null;
      maybeSaveBest();
    }
    if (slowEating) {
      // Defensive pickup: no score and no growth, only the slowdown.
      // Refreshes the effect window when eaten while already active.
      state.slow = null;
      state.slowUntil = Date.now() + CONFIG.SLOW_DURATION_MS;
      state.lastEat = { x: nx, y: ny, kind: 'slow', points: 0, id: ++eatSeq };
    }
    if (wrapped) {
      // Suppress interpolation streak across the board: the renderer
      // lerps prevSnake -> snake, so anchor prev head at the wrapped head.
      state.prevSnake[0] = { x: nx, y: ny };
    }
  }

  function frame(now) {
    // Golden/slow despawn runs on wall-clock time every frame, so expiry
    // happens even between ticks and while the snake idles. Skipped while
    // paused so timed pickups do not expire mid-pause.
    if (state.status !== 'paused') {
      updateGolden(Date.now());
      updateSlow(Date.now());
    }
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
    pause: pause,
    resume: resume,
    togglePause: togglePause,
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
    getSlowRemaining: getSlowRemaining,
    placeFood: placeFood,
    spawnGolden: spawnGolden,
    updateGolden: updateGolden,
    spawnSlow: spawnSlow,
    updateSlow: updateSlow,
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
