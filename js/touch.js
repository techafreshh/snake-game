// Touch input: 24px-threshold swipes queue turns, tap starts/restarts.
// No direction math beyond dominant-axis mapping; SnakeGame.setDirection
// owns the reversal guard and depth-2 queue cap.
(function () {
  'use strict';

  var SWIPE_THRESHOLD = 24;
  var TAP_MAX_MS = 500;

  var startX = 0;
  var startY = 0;
  var anchorX = 0;
  var anchorY = 0;
  var startTime = 0;
  var tracking = false;
  var touchId = null;

  function beginOrRestart() {
    if (typeof window.SnakeGame === 'undefined') {
      return;
    }
    var st = window.SnakeGame.getState();
    if (st.status === 'title' || st.status === 'over') {
      window.SnakeGame.start();
      if (window.SnakeAudio) {
        window.SnakeAudio.unlock();
        window.SnakeAudio.play('start');
      }
    }
  }

  function isButtonTarget(target) {
    return !!(target && typeof target.closest === 'function' && target.closest('button'));
  }

  function trackedTouch(touches) {
    for (var i = 0; i < touches.length; i++) {
      if (touches[i].identifier === touchId) {
        return touches[i];
      }
    }
    return null;
  }

  function onTouchStart(ev) {
    if (isButtonTarget(ev.target)) {
      return;
    }
    if (tracking) {
      return;
    }
    var t = ev.changedTouches[0];
    tracking = true;
    touchId = t.identifier;
    startX = t.clientX;
    startY = t.clientY;
    anchorX = t.clientX;
    anchorY = t.clientY;
    startTime = Date.now();
    ev.preventDefault();
  }

  function onTouchMove(ev) {
    if (!tracking) {
      return;
    }
    if (isButtonTarget(ev.target)) {
      return;
    }
    var t = trackedTouch(ev.changedTouches);
    if (!t) {
      return;
    }
    var dx = t.clientX - anchorX;
    var dy = t.clientY - anchorY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) {
      ev.preventDefault();
      return;
    }
    var dir;
    if (Math.abs(dx) >= Math.abs(dy)) {
      dir = dx > 0 ? [1, 0] : [-1, 0];
    } else {
      dir = dy > 0 ? [0, 1] : [0, -1];
    }
    if (window.SnakeGame) {
      beginOrRestart();
      window.SnakeGame.setDirection(dir[0], dir[1]);
    }
    anchorX = t.clientX;
    anchorY = t.clientY;
    ev.preventDefault();
  }

  function onTouchEnd(ev) {
    if (!tracking) {
      return;
    }
    var t = trackedTouch(ev.changedTouches);
    if (!t) {
      return;
    }
    var endX = t.clientX;
    var endY = t.clientY;
    var moved = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
    var dt = Date.now() - startTime;
    tracking = false;
    touchId = null;
    if (isButtonTarget(ev.target)) {
      return;
    }
    ev.preventDefault();
    if (moved < SWIPE_THRESHOLD && dt < TAP_MAX_MS) {
      beginOrRestart();
    }
  }

  function onTouchCancel(ev) {
    if (ev && ev.changedTouches) {
      var t = trackedTouch(ev.changedTouches);
      if (!t) {
        return;
      }
    }
    tracking = false;
    touchId = null;
  }

  function bind(el) {
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchCancel, { passive: false });
  }

  function init() {
    if (typeof window.SnakeGame === 'undefined') {
      return;
    }
    var canvas = document.getElementById('game');
    var overlays = document.querySelectorAll('.overlay');
    var bound = false;
    if (canvas) {
      bind(canvas);
      bound = true;
    }
    for (var i = 0; i < overlays.length; i++) {
      bind(overlays[i]);
      bound = true;
    }
    if (!bound) {
      var stage = document.querySelector('.stage');
      if (stage) {
        bind(stage);
      }
    }
  }

  window.SnakeTouch = {
    init: init
  };

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
