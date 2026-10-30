// DOM wiring: keyboard input, overlay/score updates, boot.
(function () {
  'use strict';

  var DIRS = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    W: [0, -1],
    s: [0, 1],
    S: [0, 1],
    a: [-1, 0],
    A: [-1, 0],
    d: [1, 0],
    D: [1, 0]
  };

  function beginOrRestart() {
    var st = window.SnakeGame.getState();
    if (st.status === 'title' || st.status === 'over') {
      window.SnakeGame.start();
    }
  }

  function syncDom(st) {
    var score = document.getElementById('score');
    var best = document.getElementById('best');
    var title = document.getElementById('title-overlay');
    var over = document.getElementById('gameover-overlay');
    var finalScore = document.getElementById('final-score');
    var newBest = document.getElementById('new-best');
    if (score) {
      score.textContent = 'SCORE ' + st.score;
    }
    if (best) {
      best.textContent = 'BEST ' + st.best;
    }
    if (title) {
      title.classList.toggle('hidden', st.status !== 'title');
    }
    if (over) {
      over.classList.toggle('hidden', st.status !== 'over');
    }
    if (finalScore && st.status === 'over') {
      finalScore.textContent = 'SCORE ' + st.score;
    }
    if (newBest) {
      newBest.classList.toggle('hidden', !(st.status === 'over' && st.isNewBest));
    }
    var wrap = (typeof window.SnakeGame.getWrap === 'function')
      ? window.SnakeGame.getWrap()
      : !!st.wrap;
    var classicBtn = document.getElementById('mode-classic');
    var wrapBtn = document.getElementById('mode-wrap');
    if (classicBtn) {
      classicBtn.classList.toggle('selected', !wrap);
      classicBtn.setAttribute('aria-pressed', !wrap ? 'true' : 'false');
    }
    if (wrapBtn) {
      wrapBtn.classList.toggle('selected', !!wrap);
      wrapBtn.setAttribute('aria-pressed', wrap ? 'true' : 'false');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.SnakeGame.init('game');
    window.SnakeGame.setOnFrame(syncDom);
    var classicBtn = document.getElementById('mode-classic');
    var wrapBtn = document.getElementById('mode-wrap');
    if (classicBtn) {
      classicBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        window.SnakeGame.setWrap(false);
        syncDom(window.SnakeGame.getState());
      });
    }
    if (wrapBtn) {
      wrapBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        window.SnakeGame.setWrap(true);
        syncDom(window.SnakeGame.getState());
      });
    }
    syncDom(window.SnakeGame.getState());

    document.addEventListener('keydown', function (ev) {
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        beginOrRestart();
        return;
      }
      var d = DIRS[ev.key];
      if (d) {
        ev.preventDefault();
        beginOrRestart();
        window.SnakeGame.setDirection(d[0], d[1]);
      }
    });
  });
})();
