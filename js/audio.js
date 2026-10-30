// Procedural SFX: ZzFX patches for eat/power/death/start. No audio files.
// Unlocks the shared AudioContext on first user gesture (autoplay policy).
(function () {
  'use strict';

  var MUTE_KEY = 'snake-muted';
  var POWER_STEP_MS = 90;

  // ZzFX parameter arrays: eat is a short square chomp, death a descending
  // saw buzz, start a single tick, power a rising arpeggio of three blips.
  var SOUNDS = {
    eat: [1, 0.05, 700, 0.02, 0.07, 0.12, 5, 1.6],
    power: [
      [1, 0.05, 523, 0.02, 0.09, 0.12, 1, 1.6],
      [1, 0.05, 659, 0.02, 0.09, 0.12, 1, 1.6],
      [1, 0.05, 784, 0.02, 0.12, 0.15, 1, 1.8]
    ],
    death: [1, 0.05, 220, 0.02, 0.5, 0.35, 2, 1, 0, 0, 0, 0, 0, 0, -8],
    start: [1, 0.05, 900, 0.01, 0.06, 0.1, 1, 1.2]
  };

  function loadMuted() {
    try {
      return window.localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  var muted = loadMuted();

  // Shared context created lazily by vendor/zzfx.js on first play.
  // Never constructed here, so module load stays silent (autoplay policy).
  function context() {
    try {
      if (typeof zzfxX !== 'undefined' && zzfxX) {
        return zzfxX;
      }
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.zzfxX) {
        return window.zzfxX;
      }
    } catch (e) {}
    return null;
  }

  // Resume a suspended context. Never creates one: creation happens only
  // inside zzfx() on an unmuted play, so muted playback stays silent.
  function unlock() {
    var ctx = context();
    if (!ctx) {
      return;
    }
    try {
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume();
      }
    } catch (e) {}
  }

  function playPatch(params) {
    try {
      if (typeof zzfx === 'function') {
        zzfx.apply(null, params);
      }
    } catch (e) {}
    // The lazy context may have just been created suspended; resume it.
    unlock();
  }

  // Muted or unknown patches return before touching the context, so they
  // neither sound nor create/resume anything.
  function play(name) {
    if (muted) {
      return;
    }
    var s = SOUNDS[name];
    if (!s) {
      return;
    }
    unlock();
    if (typeof s[0] === 'number') {
      playPatch(s);
      return;
    }
    // Sequenced patch (power arpeggio): schedule each step in order.
    for (var i = 0; i < s.length; i++) {
      (function (params, delay) {
        window.setTimeout(function () {
          if (!muted) {
            playPatch(params);
          }
        }, delay);
      })(s[i], i * POWER_STEP_MS);
    }
  }

  function setMuted(v) {
    muted = !!v;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch (e) {}
  }

  function isMuted() {
    return muted;
  }

  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  function gestureHandler() {
    unlock();
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('keydown', gestureHandler);
    document.addEventListener('pointerdown', gestureHandler);
    document.addEventListener('touchstart', gestureHandler);
  }

  window.SnakeAudio = {
    SOUNDS: SOUNDS,
    unlock: unlock,
    play: play,
    setMuted: setMuted,
    isMuted: isMuted,
    toggleMuted: toggleMuted
  };
})();
