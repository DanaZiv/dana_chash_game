/* global Phaser, COIN_DASH */
// Level progression and enemy behaviours. Level 1 is the original game (three bouncing
// drones at the original speed); level N ends after N x `coinsPerLevel` coins.
window.COIN_DASH_LEVELS = (() => {
  const rules = {
    coinsPerLevel: 5,         // level 1 needs 5 coins, level 2 needs 10, level 3 needs 15 ...
    maxEnemies: 8,            // upper limit, reached at level 6
    speedStepPerLevel: 0.05,  // +5% enemy speed per level above 1 ...
    maxSpeedFactor: 1.3,      // ... capped at +30%
    spawnGraceMs: 1200,       // new enemies blink and are harmless for this long
    minSpawnDistance: 200     // new enemies never appear right next to the player
  };

  // `speed` is a multiple of COIN_DASH.droneSpeed.
  const kinds = {
    drone:  { name: 'Drone',  color: COIN_DASH.colors.drone, size: 26, speed: 1,
              hint: 'bounces off the walls' },
    fast:   { name: 'Racer',  color: 0xff9f43, size: 22, speed: 1.6,
              hint: 'small and fast' },
    chaser: { name: 'Hunter', color: 0xb388ff, size: 26, speed: 0.75,
              hint: 'slowly follows you' },
    zigzag: { name: 'Zigzag', color: 0x4dabf7, size: 24, speed: 1.1,
              hint: 'weaves in a wave pattern' }
  };

  // Enemies added on top of the original drones, one per level from level 2.
  const extraKinds = ['fast', 'chaser', 'zigzag', 'fast', 'chaser'];

  function coinsForLevel(level) {
    return level * rules.coinsPerLevel;
  }

  function enemyKindsForLevel(level) {
    const list = Array(COIN_DASH.droneCount).fill('drone');
    for (let i = 0; i < level - 1 && list.length < rules.maxEnemies; i++) {
      list.push(extraKinds[i % extraKinds.length]);
    }
    return list;
  }

  function speedFactorForLevel(level) {
    return Math.min(rules.maxSpeedFactor, 1 + (level - 1) * rules.speedStepPerLevel);
  }

  function createEnemy(scene, kind, x, y, angleDeg) {
    const spec = kinds[kind];
    const enemy = scene.add.rectangle(x, y, spec.size, spec.size, spec.color);
    scene.drones.add(enemy);
    enemy.body.setCollideWorldBounds(true).setBounce(1, 1);
    const angle = angleDeg * Math.PI / 180;
    const speed = spec.speed * COIN_DASH.droneSpeed;
    enemy.kind = kind;
    enemy.heading = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    enemy.phase = Math.random() * Math.PI * 2;
    enemy.harmlessUntil = 0;
    enemy.body.setVelocity(enemy.heading.x * speed, enemy.heading.y * speed);
    return enemy;
  }

  // Adds an enemy mid-round at a safe distance from the player, with a short grace period.
  function spawnEnemy(scene, kind) {
    const c = COIN_DASH;
    let x, y, tries = 0;
    do {
      x = Phaser.Math.Between(40, c.width - 40);
      y = Phaser.Math.Between(90, c.height - 40);
    } while (++tries < 40 &&
      Phaser.Math.Distance.Between(x, y, scene.player.x, scene.player.y) < rules.minSpawnDistance);
    const enemy = createEnemy(scene, kind, x, y, Phaser.Math.Between(0, 359));
    enemy.harmlessUntil = scene.time.now + rules.spawnGraceMs;
    return enemy;
  }

  function isHarmful(enemy, now) {
    return now >= enemy.harmlessUntil;
  }

  // Recomputes every enemy's velocity and size from its base values each frame, so
  // power-up effects never accumulate and vanish as soon as they expire.
  // effects: { level, slow, shrink }
  function updateEnemies(scene, effects) {
    const now = scene.time.now;
    const bounds = scene.physics.world.bounds;
    const multiplier = speedFactorForLevel(effects.level) * (effects.slow ? 0.5 : 1);
    scene.drones.getChildren().forEach(enemy => {
      enemy.setScale(effects.shrink ? 0.5 : 1);
      const speed = kinds[enemy.kind].speed * COIN_DASH.droneSpeed * multiplier;
      const body = enemy.body;
      if (enemy.kind === 'chaser') {
        const toPlayer = new Phaser.Math.Vector2(scene.player.x - enemy.x, scene.player.y - enemy.y);
        if (toPlayer.length() > 1) toPlayer.normalize().scale(speed);
        body.setVelocity(toPlayer.x, toPlayer.y);
      } else if (enemy.kind === 'zigzag') {
        const h = enemy.heading;
        const half = body.halfWidth + 1;
        if (enemy.x <= bounds.left + half) h.x = Math.abs(h.x);
        if (enemy.x >= bounds.right - half) h.x = -Math.abs(h.x);
        if (enemy.y <= bounds.top + half) h.y = Math.abs(h.y);
        if (enemy.y >= bounds.bottom - half) h.y = -Math.abs(h.y);
        const wave = Math.sin(now / 260 + enemy.phase) * 0.9;
        body.setVelocity((h.x - h.y * wave) * speed, (h.y + h.x * wave) * speed);
      } else {
        // Bouncers keep the direction the physics bounce gave them; only the magnitude is set.
        const v = body.velocity.clone();
        if (v.length() === 0) v.copy(enemy.heading);
        v.normalize().scale(speed);
        body.setVelocity(v.x, v.y);
      }
      const harmless = !isHarmful(enemy, now);
      enemy.setAlpha(harmless ? (Math.floor(now / 120) % 2 ? 0.25 : 0.75) : 1);
    });
  }

  return {
    rules, kinds, coinsForLevel, enemyKindsForLevel, speedFactorForLevel,
    createEnemy, spawnEnemy, isHarmful, updateEnemies
  };
})();
