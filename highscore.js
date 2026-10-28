/* global Phaser */
// Persistent all-time high score, kept apart from game.js so features can be developed independently.
// It reads scene.score every frame, so it works with any scoring rule (1 point per coin, double points, ...).
window.CoinDashHighScore = (() => {
  const STORAGE_KEY = 'coinDash.highScore';

  // Any access to localStorage can throw (blocked cookies, privacy mode, sandboxed iframes),
  // so every call is guarded and the in-memory value keeps working for this page load.
  function load() {
    try {
      const value = Number.parseInt(window.localStorage.getItem(STORAGE_KEY), 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (e) {
      return 0;
    }
  }

  function save(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch (e) {
      // Storage unavailable or full: the record still lasts until the page is closed.
    }
  }

  let best = load();

  // Records a score and returns true if it set a new all-time high.
  function submit(score) {
    if (!Number.isFinite(score) || score <= best) return false;
    best = Math.floor(score);
    save(best);
    return true;
  }

  // Adds a "Best" readout to the scene's HUD and keeps it in sync with scene.score.
  function attach(scene) {
    const text = scene.add.text(scene.scale.width - 18, 12, '', { font: '18px monospace', color: '#ffffff' })
      .setOrigin(1, 0)
      .setDepth(10);
    let beaten = false;
    const refresh = () => {
      if (submit(scene.score)) beaten = true;
      text.setText(`Best: ${best}${beaten ? ' NEW!' : ''}`);
      text.setColor(beaten ? '#ffd166' : '#ffffff');
    };
    refresh();
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, refresh);
    // Scene event listeners survive scene.restart(), so remove ours to avoid stacking them.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, refresh);
    });
  }

  return { attach, submit, get: () => best };
})();
