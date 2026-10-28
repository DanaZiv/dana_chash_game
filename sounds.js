// Retro arcade sound effects, synthesised with the Web Audio API (no audio files).
// Kept apart from gameplay: game.js only calls CoinDashSounds.coin()/hit()/gameOver()
// and attach(scene). Future features (lives, pause, theme) can call the same API.
(function () {
  const MASTER_VOLUME = 0.18;   // overall loudness; individual sounds stay well below this
  const STORAGE_KEY = 'coinDash.muted';

  let ctx = null;
  let master = null;
  let muted = readMuted();
  let lastHitAt = 0;
  const listeners = [];

  function readMuted() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function saveMuted() {
    try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (e) { /* storage unavailable */ }
  }

  // Browsers only allow audio after a user gesture, so the context is created lazily
  // and resumed on the first key press or click.
  function unlock() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function ready() {
    return ctx && ctx.state === 'running' && !muted;
  }

  // One square/triangle "chip" note with a quick attack and exponential decay.
  function tone(freq, start, duration, { type = 'square', volume = 0.5, slideTo = null } = {}) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(start, duration, volume) {
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(gain).connect(master);
    src.start(start);
  }

  const Sounds = {
    // Bright rising arpeggio: a cheerful "bling".
    coin() {
      if (!ready()) return;
      const t = ctx.currentTime;
      tone(1046.5, t, 0.06, { volume: 0.35 });          // C6
      tone(1568.0, t + 0.05, 0.07, { volume: 0.35 });   // G6
      tone(2093.0, t + 0.10, 0.22, { volume: 0.3 });    // C7, ringing tail
    },

    // Quick downward zap with a crunch of noise.
    hit() {
      if (!ready()) return;
      const t = ctx.currentTime;
      lastHitAt = t;
      tone(520, t, 0.22, { volume: 0.45, slideTo: 90 });
      noise(t, 0.12, 0.25);
    },

    // Slow descending minor phrase ending on a low wobble.
    gameOver() {
      if (!ready()) return;
      // If a hit sound just played (base game: collision ends the round), let it finish first.
      const t = Math.max(ctx.currentTime, lastHitAt + 0.25);
      const notes = [[784.0, 0.16], [622.3, 0.16], [523.3, 0.16], [392.0, 0.5]]; // G5 Eb5 C5 G4
      let at = t;
      for (const [freq, len] of notes) {
        tone(freq, at, len, { type: 'triangle', volume: 0.55 });
        tone(freq / 2, at, len, { type: 'square', volume: 0.12 });
        at += len * 0.9;
      }
      tone(196.0, at, 0.45, { type: 'square', volume: 0.18, slideTo: 130.8 });   // G3 → C3
    },

    isMuted() { return muted; },

    setMuted(value) {
      muted = Boolean(value);
      saveMuted();
      if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.01);
      listeners.forEach(fn => fn(muted));
    },

    toggleMute() { Sounds.setMuted(!muted); },

    onMuteChange(fn) { listeners.push(fn); },

    unlock,

    // Adds the speaker indicator to a Phaser scene's HUD and keeps it in sync.
    // Optional { x, y, size } lets a themed HUD move the label out of its way.
    attach(scene, { x = window.COIN_DASH.width - 18, y = 12, size = 18 } = {}) {
      const label = scene.add.text(x, y, '', {
        font: `${size}px monospace`, color: '#ffffff', stroke: '#1b1010', strokeThickness: 3
      }).setOrigin(1, 0).setDepth(1000);
      const render = () => label.setText(muted ? '🔇 Sound OFF [M]' : '🔊 Sound ON [M]')
        .setAlpha(muted ? 0.6 : 1);
      render();
      listeners.push(render);
      scene.events.once('shutdown', () => {
        const i = listeners.indexOf(render);
        if (i >= 0) listeners.splice(i, 1);
      });
      return label;
    }
  };

  // Window-level listeners so M works even if a scene is paused (e.g. pause countdown).
  window.addEventListener('keydown', event => {
    unlock();
    if ((event.key === 'm' || event.key === 'M') && !event.repeat) Sounds.toggleMute();
  });
  window.addEventListener('pointerdown', unlock);

  window.CoinDashSounds = Sounds;
})();
