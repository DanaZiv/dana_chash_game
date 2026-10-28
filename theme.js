/* global Phaser, COIN_DASH */
// Retro platformer look for Coin Dash. Everything here is cosmetic: the physics objects that
// game.js creates keep their original shapes and sizes, are hidden, and the sprites below
// follow them every frame. All art is generated from the pixel grids in this file.
// Depths stay below 10 so overlays drawn by other features (e.g. pause) appear on top.
(function () {
  const DEPTH = { background: 0, clouds: 1, glow: 2, coin: 3, enemy: 4, player: 5, fx: 6, hud: 7, gameOver: 9 };
  const FONT = '"Courier New", Courier, monospace';
  const OUTLINE = 0x1b1010;

  // Each grid row is one line of pixels; '.' is transparent.
  const HERO_PALETTE = {
    R: 0xe52521, r: 0x9c1414, W: 0xffffff, K: 0x111111, S: 0xffc89a, P: 0xf0907a,
    H: 0x5a2d0c, B: 0x2f63d8, Y: 0xffd23f, N: 0x6b3a12
  };
  const HERO_BODY = [
    '.....RRRRRR.....',
    '...RRRRRRRRRR...',
    '..RRRRRWWRRRRR..',
    '..RRRRWRRWRRRR..',
    '..RRRRRWWRRRRR..',
    '.rrrrrrrrrrrrrr.',
    '..HSSSSSSSSSSH..',
    '..SSWKSSSSWKSS..',
    '..SSWKSSSSWKSS..',
    '..SSSSSPPSSSSS..',
    '...SHHHHHHHHS...',
    '....SSSSSSSS....',
    '..RRBYBBBBYBRR..',
    '.SSRBBBBBBBBRSS.',
    '....BBBBBBBB....'
  ];
  const HERO_FEET = [
    ['.....BB..BB.....', '....NNN..NNN....'],
    ['...BBB....BBB...', '..NNNN....NNNN..']
  ];

  const SHROOM_PALETTE = {
    M: 0x9a4a1c, m: 0x6a2f10, K: 0x150a05, W: 0xffffff, T: 0xf3d2a2, t: 0xc99a62
  };
  const SHROOM_BODY = [
    '......mmmm......',
    '....mMMMMMMm....',
    '...MMMMMMMMMM...',
    '..MMMMMMMMMMMM..',
    '.MMKKMMMMMMKKMM.',
    '.MMMKKKMMKKKMMM.',
    'MMMMWWKMMKWWMMMM',
    'MMMMWKKMMKKWMMMM',
    'MMMMWKKMMKKWMMMM',
    'MMMMMMMMMMMMMMMM',
    'MMMKKKKKKKKKKMMM',
    '.MMKWMMMMMMWKMM.',
    '..mmmTTTTTTmmm..',
    '....TTttttTT....'
  ];
  const SHROOM_FEET = [
    ['..KKKTTTTTTKK...', '.KKKKKK...KKKK..'],
    ['...KKTTTTTTKKK..', '..KKKK...KKKKKK.']
  ];

  const SPARKLE = ['...W...', '...W...', '..WYW..', 'WWYYYWW', '..WYW..', '...W...', '...W...'];

  function pixelTexture(scene, key, rows, palette, px) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    const w = rows[0].length * px + 2;
    const h = rows.length * px + 2;
    // A one-pixel dark outline around the silhouette keeps sprites readable on any backdrop.
    g.fillStyle(OUTLINE, 1);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') g.fillRect(x * px, y * px, px + 2, px + 2);
    }));
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle(palette[ch], 1);
      g.fillRect(x * px + 1, y * px + 1, px, px);
    }));
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Coin frames are ellipses of decreasing width, which reads as a spin when cycled.
  function coinRows(halfWidth) {
    const rows = [];
    const cx = 4.5, cy = 5.5, ry = 6;
    for (let y = 0; y < 12; y++) {
      let row = '';
      for (let x = 0; x < 10; x++) {
        const dx = (x - cx) / halfWidth, dy = (y - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1) row += '.';
        else if (d > 0.6 || halfWidth < 1) row += 'o';
        else if (x < cx - halfWidth * 0.25 && y < cy - 1) row += 'h';
        else if (Math.abs(x - cx) < 0.6 && Math.abs(y - cy) < 3 && halfWidth > 2) row += 'o';
        else row += 'y';
      }
      rows.push(row);
    }
    return rows;
  }

  function createTextures(scene) {
    HERO_FEET.forEach((feet, i) =>
      pixelTexture(scene, `hero${i}`, HERO_BODY.concat(feet), HERO_PALETTE, 2));
    SHROOM_FEET.forEach((feet, i) =>
      pixelTexture(scene, `shroom${i}`, SHROOM_BODY.concat(feet), SHROOM_PALETTE, 2));
    const coinPalette = { y: 0xffd23f, o: 0xd98a00, h: 0xfff6c0 };
    [5, 3.6, 2.1, 0.8].forEach((hw, i) => pixelTexture(scene, `coin${i}`, coinRows(hw), coinPalette, 2));
    pixelTexture(scene, 'sparkle', SPARKLE, { W: 0xffffff, Y: 0xffe066 }, 2);

    if (!scene.textures.exists('glow')) {
      const g = scene.make.graphics({ add: false });
      for (let r = 24; r > 0; r -= 2) {
        g.fillStyle(0xffe680, 0.06);
        g.fillCircle(24, 24, r);
      }
      g.generateTexture('glow', 48, 48);
      g.destroy();
    }
    if (!scene.textures.exists('cloud')) {
      const g = scene.make.graphics({ add: false });
      const puffs = [[22, 30, 18], [44, 20, 22], [70, 26, 20], [90, 34, 14]];
      g.fillStyle(0xbfe0ff, 1);
      puffs.forEach(([x, y, r]) => g.fillCircle(x, y + 4, r));
      g.fillStyle(0xffffff, 1);
      puffs.forEach(([x, y, r]) => g.fillCircle(x, y, r));
      g.fillRect(22, 30, 68, 14);
      g.generateTexture('cloud', 112, 52);
      g.destroy();
    }
  }

  function createAnimations(scene) {
    const anims = [
      ['hero-walk', ['hero0', 'hero1'], 8],
      ['shroom-walk', ['shroom0', 'shroom1'], 5],
      ['coin-spin', ['coin0', 'coin1', 'coin2', 'coin3', 'coin2', 'coin1'], 10]
    ];
    anims.forEach(([key, frames, frameRate]) => {
      if (scene.anims.exists(key)) return;
      scene.anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate, repeat: -1 });
    });
  }

  // Deterministic randomness so the scenery is identical on every restart.
  function seededRandom(seed) {
    return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  }

  function drawBricks(g, x, y, cols, size) {
    for (let i = 0; i < cols; i++) {
      const bx = x + i * size;
      g.fillStyle(0x3a1405, 1).fillRect(bx, y, size, size);
      g.fillStyle(0xc84c0c, 1).fillRect(bx + 1, y + 1, size - 2, size - 2);
      g.fillStyle(0xf08850, 1).fillRect(bx + 1, y + 1, size - 2, 2);
      g.fillStyle(0x6b2008, 1);
      g.fillRect(bx + 1, y + size / 2 - 1, size - 2, 2);
      g.fillRect(bx + size / 2 - 1, y + 1, 2, size / 2 - 1);
      g.fillRect(bx + 4, y + size / 2, 2, size / 2 - 1);
      g.fillRect(bx + size - 6, y + size / 2, 2, size / 2 - 1);
    }
  }

  function drawPrizeBlock(g, x, y, size) {
    g.fillStyle(0x3a1405, 1).fillRect(x, y, size, size);
    g.fillStyle(0xf8a820, 1).fillRect(x + 1, y + 1, size - 2, size - 2);
    g.fillStyle(0xffd878, 1).fillRect(x + 1, y + 1, size - 2, 2);
    g.fillStyle(0x9a5200, 1);
    [[3, 3], [size - 5, 3], [3, size - 5], [size - 5, size - 5]].forEach(([dx, dy]) => g.fillRect(x + dx, y + dy, 2, 2));
    g.fillStyle(0x9a5200, 1).fillEllipse(x + size / 2 + 1, y + size / 2 + 1, 9, 12);
    g.fillStyle(0xfff3b0, 1).fillEllipse(x + size / 2, y + size / 2, 9, 12);
  }

  function drawPipe(g, x, top, bottom) {
    const bodyW = 40, lipW = 52, lipH = 16;
    g.fillStyle(0x0b3d10, 1).fillRect(x - bodyW / 2 - 2, top + lipH - 2, bodyW + 4, bottom - top - lipH + 2);
    g.fillStyle(0x2fae35, 1).fillRect(x - bodyW / 2, top + lipH, bodyW, bottom - top - lipH);
    g.fillStyle(0x9af07a, 1).fillRect(x - bodyW / 2 + 6, top + lipH, 6, bottom - top - lipH);
    g.fillStyle(0x15751c, 1).fillRect(x + bodyW / 2 - 9, top + lipH, 6, bottom - top - lipH);
    g.fillStyle(0x0b3d10, 1).fillRect(x - lipW / 2 - 2, top - 2, lipW + 4, lipH + 4);
    g.fillStyle(0x2fae35, 1).fillRect(x - lipW / 2, top, lipW, lipH);
    g.fillStyle(0x9af07a, 1).fillRect(x - lipW / 2 + 6, top + 2, 7, lipH - 4);
    g.fillStyle(0x15751c, 1).fillRect(x + lipW / 2 - 11, top + 2, 7, lipH - 4);
  }

  function drawHill(g, x, baseY, w, h, color) {
    g.fillStyle(0x1f5e1f, 1).fillEllipse(x, baseY, w + 6, h * 2 + 6);
    g.fillStyle(color, 1).fillEllipse(x, baseY, w, h * 2);
    g.fillStyle(0x2c7d2c, 1);
    g.fillEllipse(x - w * 0.15, baseY - h * 0.55, 8, 14);
    g.fillEllipse(x + w * 0.12, baseY - h * 0.45, 8, 14);
  }

  function drawBush(g, x, y, puffs) {
    for (let i = 0; i < puffs; i++) g.fillStyle(0x1f6b1f, 1).fillCircle(x + i * 18, y, 15);
    for (let i = 0; i < puffs; i++) g.fillStyle(0x5fd35f, 1).fillCircle(x + i * 18, y, 13);
    for (let i = 0; i < puffs; i++) g.fillStyle(0x9af07a, 1).fillCircle(x + i * 18 - 4, y - 5, 4);
  }

  function drawBackground(scene) {
    const { width: w, height: h } = COIN_DASH;
    const g = scene.add.graphics().setDepth(DEPTH.background);
    const top = 44, horizon = 360, groundY = h - 26;
    const sky = [0x5c94fc, 0x669cfc, 0x72a6fd, 0x80b1fd, 0x8fbcfe, 0x9fc8fe, 0xb0d4ff];
    const band = (horizon - top) / sky.length;
    sky.forEach((col, i) => g.fillStyle(col, 1).fillRect(0, top + i * band, w, band + 1));

    drawHill(g, 140, horizon + 30, 320, 150, 0x47b347);
    drawHill(g, 680, horizon + 30, 280, 190, 0x47b347);
    drawHill(g, 420, horizon + 30, 260, 95, 0x58c458);

    // Grass meadow with stripes, tufts and flowers.
    g.fillStyle(0x1f6b1f, 1).fillRect(0, horizon + 18, w, 3);
    for (let y = horizon + 21, i = 0; y < groundY; y += 16, i++) {
      g.fillStyle(i % 2 ? 0x6cc04a : 0x74c852, 1).fillRect(0, y, w, 16);
    }
    drawBush(g, 230, horizon + 18, 3);
    drawBush(g, 560, horizon + 18, 4);
    const rnd = seededRandom(7);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = horizon + 30 + rnd() * (groundY - horizon - 36);
      g.fillStyle(0x3f8f2f, 1).fillTriangle(x, y, x + 3, y - 7, x + 5, y);
      g.fillTriangle(x + 4, y, x + 8, y - 5, x + 9, y);
    }
    for (let i = 0; i < 18; i++) {
      const x = rnd() * w, y = horizon + 34 + rnd() * (groundY - horizon - 44);
      const petal = [0xffffff, 0xff6b6b, 0xffe066][i % 3];
      g.fillStyle(petal, 1);
      [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(([dx, dy]) => g.fillCircle(x + dx, y + dy, 2));
      g.fillStyle(0xf8a820, 1).fillCircle(x, y, 2);
    }

    drawPipe(g, 46, horizon - 20, groundY);
    drawPipe(g, w - 46, horizon + 10, groundY);

    // Ground row of bricks.
    for (let x = 0; x < w; x += 26) drawBricks(g, x, groundY, 1, 26);

    // Floating platforms in the sky.
    drawBricks(g, 150, 150, 3, 22);
    drawPrizeBlock(g, 216, 150, 22);
    drawBricks(g, 238, 150, 1, 22);
    drawBricks(g, 520, 120, 2, 22);
    drawPrizeBlock(g, 564, 120, 22);
    drawBricks(g, 586, 120, 2, 22);

    const clouds = [[90, 80, 1, 9], [330, 70, 0.8, 6], [610, 190, 1.1, 11], [740, 75, 0.7, 5], [200, 250, 0.6, 4]];
    return clouds.map(([x, y, s, speed]) => {
      const cloud = scene.add.image(x, y, 'cloud').setScale(s).setDepth(DEPTH.clouds).setAlpha(0.95);
      cloud.driftSpeed = speed;
      return cloud;
    });
  }

  function retroText(scene, x, y, text, size, color, extra) {
    return scene.add.text(x, y, text, Object.assign({
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color,
      stroke: '#1b1010', strokeThickness: Math.max(3, Math.round(size / 5)),
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true, stroke: true }
    }, extra || {}));
  }

  class CoinDashTheme {
    constructor(scene) {
      this.scene = scene;
      createTextures(scene);
      createAnimations(scene);
      this.clouds = drawBackground(scene);
      this.lastSeconds = null;
      this.sparkles = scene.add.particles(0, 0, 'sparkle', {
        speed: { min: 60, max: 170 }, angle: { min: 0, max: 360 }, scale: { start: 1, end: 0 },
        rotate: { min: 0, max: 180 }, lifespan: 450, gravityY: 120, emitting: false
      }).setDepth(DEPTH.fx);
      this.createHud();
      this.onPostUpdate = (time, delta) => this.follow(delta);
      scene.events.on('postupdate', this.onPostUpdate);
      scene.events.once('shutdown', () => scene.events.off('postupdate', this.onPostUpdate));
    }

    // Swap the plain shapes from game.js for sprites; the shapes keep their physics bodies.
    dressUp(player, coin, drones) {
      const scene = this.scene;
      this.player = player;
      this.coin = coin;
      player.setVisible(false);
      coin.setVisible(false);
      this.heroShadow = scene.add.ellipse(player.x, player.y, 24, 7, 0x000000, 0.25).setDepth(DEPTH.player);
      this.hero = scene.add.sprite(player.x, player.y, 'hero0').setDepth(DEPTH.player);
      this.coinGlow = scene.add.image(coin.x, coin.y, 'glow').setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: this.coinGlow, scale: 1.35, alpha: 0.6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.coinSprite = scene.add.sprite(coin.x, coin.y, 'coin0').setDepth(DEPTH.coin).play('coin-spin');
      this.enemies = drones.getChildren().map((drone, i) => {
        drone.setVisible(false);
        const sprite = scene.add.sprite(drone.x, drone.y, 'shroom0').setDepth(DEPTH.enemy).play('shroom-walk');
        sprite.anims.setProgress(i / 3);
        return { drone, sprite };
      });
      this.follow(0);
    }

    follow(delta) {
      const { width } = COIN_DASH;
      const paused = this.scene.physics.world.isPaused;
      if (!paused) {
        this.clouds.forEach(cloud => {
          cloud.x += cloud.driftSpeed * delta / 1000;
          if (cloud.x - cloud.displayWidth / 2 > width) cloud.x = -cloud.displayWidth / 2;
        });
      }
      if (!this.hero) return;
      const body = this.player.body;
      const moving = !paused && (body.velocity.x !== 0 || body.velocity.y !== 0);
      if (moving && !this.hero.anims.isPlaying) this.hero.play('hero-walk');
      if (!moving && this.hero.anims.isPlaying) this.hero.stop().setTexture('hero0');
      if (body.velocity.x !== 0) this.hero.setFlipX(body.velocity.x < 0);
      const bob = moving ? -Math.abs(Math.sin(this.scene.time.now / 70)) * 3 : 0;
      this.hero.setPosition(this.player.x, this.player.y - 3 + bob);
      this.hero.setAngle(moving ? Math.sign(body.velocity.x) * 5 : 0);
      this.heroShadow.setPosition(this.player.x, this.player.y + 15);
      this.coinSprite.setPosition(this.coin.x, this.coin.y);
      this.coinGlow.setPosition(this.coin.x, this.coin.y);
      this.enemies.forEach(({ drone, sprite }) => {
        sprite.setPosition(drone.x, drone.y - 2);
        if (drone.body.velocity.x !== 0) sprite.setFlipX(drone.body.velocity.x > 0);
        if (paused && sprite.anims.isPlaying) sprite.anims.pause();
        if (!paused && sprite.anims.isPaused) sprite.anims.resume();
      });
    }

    collectSparkle(x, y) {
      const scene = this.scene;
      this.sparkles.explode(14, x, y);
      const ring = scene.add.circle(x, y, 10).setStrokeStyle(3, 0xfff3b0).setDepth(DEPTH.fx);
      scene.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
      const plus = retroText(scene, x, y - 14, '+1', 18, '#fff3b0').setOrigin(0.5).setDepth(DEPTH.fx);
      scene.tweens.add({ targets: plus, y: y - 48, alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => plus.destroy() });
      scene.tweens.add({ targets: this.hudCoins, scale: 1.25, duration: 90, yoyo: true });
    }

    createHud() {
      const scene = this.scene;
      const { width } = COIN_DASH;
      const g = scene.add.graphics().setDepth(DEPTH.hud);
      g.fillStyle(0x1c1240, 1).fillRect(0, 0, width, 44);
      g.fillStyle(0x3a2a80, 1).fillRect(0, 0, width, 3);
      g.fillStyle(0xf8a820, 1).fillRect(0, 41, width, 3);
      g.fillStyle(0x9a5200, 1);
      for (let x = 6; x < width; x += 16) g.fillRect(x, 42, 4, 1);

      scene.add.sprite(26, 22, 'coin0').setDepth(DEPTH.hud).play('coin-spin');
      retroText(scene, 46, 22, 'COINS', 14, '#ffffff').setOrigin(0, 0.5).setDepth(DEPTH.hud);
      this.hudCoins = retroText(scene, 108, 22, '× 00', 22, '#ffd23f').setOrigin(0, 0.5).setDepth(DEPTH.hud);

      const title = 'COIN DASH';
      const colors = ['#ff5a4e', '#ffd23f', '#5fd35f', '#6fb7ff'];
      let x = width / 2 - title.length * 9;
      [...title].forEach((ch, i) => {
        retroText(scene, x, 22, ch, 22, colors[i % colors.length]).setOrigin(0, 0.5).setDepth(DEPTH.hud);
        x += 18;
      });

      retroText(scene, width - 150, 22, 'TIME', 14, '#ffffff').setOrigin(0, 0.5).setDepth(DEPTH.hud);
      this.hudTime = retroText(scene, width - 98, 22, '00', 22, '#ffffff').setOrigin(0, 0.5).setDepth(DEPTH.hud);
      const clock = scene.add.graphics().setDepth(DEPTH.hud);
      clock.fillStyle(0x1b1010, 1).fillCircle(width - 26, 22, 11);
      clock.fillStyle(0xffffff, 1).fillCircle(width - 26, 22, 9);
      clock.fillStyle(0x1b1010, 1).fillRect(width - 27, 15, 2, 8).fillRect(width - 26, 21, 6, 2);
    }

    updateHud(score, seconds) {
      this.hudCoins.setText(`× ${String(score).padStart(2, '0')}`);
      this.hudTime.setText(String(seconds).padStart(2, '0'));
      if (seconds === this.lastSeconds) return;
      this.lastSeconds = seconds;
      const hurry = seconds <= 10;
      this.hudTime.setColor(hurry ? '#ff5a4e' : '#ffffff');
      if (hurry && seconds > 0) {
        this.scene.tweens.add({ targets: this.hudTime, scale: 1.3, duration: 120, yoyo: true });
      }
    }

    showGameOver(reason, score) {
      const scene = this.scene;
      const { width, height } = COIN_DASH;
      if (this.hero && /caught/i.test(reason)) {
        this.hero.stop().setTexture('hero0').setTint(0xff9090);
        scene.tweens.add({ targets: this.hero, y: this.hero.y - 18, angle: 360, duration: 500, ease: 'Quad.Out' });
      }
      scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45).setDepth(DEPTH.gameOver);

      const panelW = 480, panelH = 270;
      const g = scene.add.graphics();
      g.fillStyle(0x1b1010, 1).fillRoundedRect(-panelW / 2 - 4, -panelH / 2 - 4, panelW + 8, panelH + 8, 14);
      g.fillStyle(0xc84c0c, 1).fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
      g.fillStyle(0x6b2008, 1);
      for (let y = -panelH / 2 + 14; y < panelH / 2; y += 14) g.fillRect(-panelW / 2 + 4, y, panelW - 8, 2);
      g.fillStyle(0x1b1010, 1).fillRoundedRect(-panelW / 2 + 14, -panelH / 2 + 14, panelW - 28, panelH - 28, 8);
      g.fillStyle(0x1c2a6b, 1).fillRoundedRect(-panelW / 2 + 17, -panelH / 2 + 17, panelW - 34, panelH - 34, 6);
      g.fillStyle(0xf8a820, 1);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) =>
        g.fillCircle(sx * (panelW / 2 - 7), sy * (panelH / 2 - 7), 4));

      const title = retroText(scene, 0, -78, 'GAME OVER', 46, '#ffd23f',
        { shadow: { offsetX: 4, offsetY: 4, color: '#e52521', blur: 0, fill: true, stroke: true } }).setOrigin(0.5);
      const why = retroText(scene, 0, -26, reason, 20, '#ffffff').setOrigin(0.5);
      const coinIcon = scene.add.sprite(-62, 26, 'coin0').setScale(1.4).play('coin-spin');
      const result = retroText(scene, -38, 26, `× ${score}`, 34, '#ffd23f').setOrigin(0, 0.5);
      const label = retroText(scene, 0, 62, score === 1 ? 'COIN COLLECTED' : 'COINS COLLECTED', 16, '#bfe0ff').setOrigin(0.5);
      const restart = retroText(scene, 0, 100, '▶ PRESS R TO PLAY AGAIN ◀', 20, '#5fd35f').setOrigin(0.5);

      const panel = scene.add.container(width / 2, height / 2, [g, title, why, coinIcon, result, label, restart])
        .setDepth(DEPTH.gameOver).setScale(0.4).setAlpha(0);
      scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 380, ease: 'Back.Out' });
      scene.tweens.add({ targets: restart, alpha: 0.25, duration: 520, yoyo: true, repeat: -1, delay: 400 });
      scene.tweens.add({ targets: title, y: -84, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.sparkles.setDepth(DEPTH.gameOver);
      this.sparkles.explode(30, width / 2, height / 2 - 78);
    }
  }

  window.CoinDashTheme = CoinDashTheme;
}());
