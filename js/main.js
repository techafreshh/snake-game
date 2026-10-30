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
      var gameCanvas = document.getElementById('game');
      if (gameCanvas) {
        gameCanvas.style.transform = '';
      }
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
    var pause = document.getElementById('pause-overlay');
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
    if (pause) {
      pause.classList.toggle('hidden', st.status !== 'paused');
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
    // Normalize a missing or corrupt mute flag to unmuted ("0").
    try {
      var muteRaw = window.localStorage.getItem('snake-muted');
      if (muteRaw !== '0' && muteRaw !== '1') {
        window.localStorage.setItem('snake-muted', '0');
      }
    } catch (e) {}
    function refreshMuteButton() {
      var muteBtn = document.getElementById('mute-toggle');
      if (!muteBtn || !window.SnakeAudio) {
        return;
      }
      muteBtn.textContent = window.SnakeAudio.isMuted() ? 'SOUND: OFF' : 'SOUND: ON';
    }
    refreshMuteButton();
    var muteToggle = document.getElementById('mute-toggle');
    if (muteToggle) {
      muteToggle.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (window.SnakeAudio) {
          window.SnakeAudio.toggleMuted();
          refreshMuteButton();
        }
      });
    }
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
      var shakeCanvas = document.getElementById('game');
      if (shakeCanvas) {
        var shaking = st.status === 'over' &&
          typeof st.diedAt === 'number' && st.diedAt &&
          (Date.now() - st.diedAt) < 150;
        if (shaking) {
          var dx = Math.floor(Math.random() * 13) - 6;
          var dy = Math.floor(Math.random() * 13) - 6;
          if (dx === 0 && dy === 0) {
            dx = 6;
          }
          shakeCanvas.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        } else {
          shakeCanvas.style.transform = '';
        }
      }
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
    var overOverlay = document.getElementById('gameover-overlay');
    if (overOverlay) {
      overOverlay.addEventListener('click', function () {
        beginOrRestart();
      });
    }
    syncDom(window.SnakeGame.getState());

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'm' || ev.key === 'M') {
        if (window.SnakeAudio) {
          window.SnakeAudio.toggleMuted();
          refreshMuteButton();
        }
        return;
      }
      if (ev.key === 'p' || ev.key === 'P') {
        window.SnakeGame.togglePause();
        return;
      }
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        if (window.SnakeGame.getState().status === 'paused') {
          window.SnakeGame.resume();
          return;
        }
        beginOrRestart();
        return;
      }
      var d = DIRS[ev.key];
      if (d) {
        ev.preventDefault();
        if (window.SnakeGame.getState().status === 'paused') {
          window.SnakeGame.resume();
        } else {
          beginOrRestart();
        }
        window.SnakeGame.setDirection(d[0], d[1]);
      }
    });
    window.addEventListener('blur', function () {
      if (window.SnakeGame.getState().status === 'playing') {
        window.SnakeGame.pause();
      }
    });
  });
})();
