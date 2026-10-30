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
      if (window.SnakeAudio) {
        window.SnakeAudio.unlock();
        window.SnakeAudio.play('start');
      }
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
    var slowEl = document.getElementById('slow');
    if (slowEl) {
      var slowLeft = (typeof window.SnakeGame.getSlowRemaining === 'function')
        ? window.SnakeGame.getSlowRemaining()
        : 0;
      slowEl.textContent = slowLeft > 0 ? 'SLOW ' + Math.ceil(slowLeft / 1000) + 's' : '';
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
    var obstaclesOn = (typeof window.SnakeGame.isObstaclesEnabled === 'function')
      ? window.SnakeGame.isObstaclesEnabled()
      : !!st.obstaclesEnabled;
    var obstaclesBtn = document.getElementById('obstacles-toggle');
    if (obstaclesBtn) {
      obstaclesBtn.textContent = obstaclesOn ? 'OBSTACLES: ON' : 'OBSTACLES: OFF';
      obstaclesBtn.setAttribute('aria-pressed', obstaclesOn ? 'true' : 'false');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.SnakeGame.init('game');
    var lastScore = 0;
    var lastStatus = 'title';
    window.SnakeGame.setOnFrame(function (st) {
      if (window.SnakeAudio) {
        if (st.score > lastScore) {
          window.SnakeAudio.play('eat');
        }
        if (lastStatus !== 'over' && st.status === 'over') {
          window.SnakeAudio.play('death');
        }
      }
      lastScore = st.score;
      lastStatus = st.status;
      syncDom(st);
    });
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
    var obstaclesBtn = document.getElementById('obstacles-toggle');
    if (obstaclesBtn) {
      obstaclesBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var cur = window.SnakeGame.isObstaclesEnabled();
        window.SnakeGame.setObstaclesEnabled(!cur);
        if (window.SnakeGame.getState().status === 'title') {
          window.SnakeGame.resetGame();
        }
        syncDom(window.SnakeGame.getState());
      });
    }
    syncDom(window.SnakeGame.getState());

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'm' || ev.key === 'M') {
        if (window.SnakeAudio) {
          window.SnakeAudio.toggleMuted();
        }
        return;
      }
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
