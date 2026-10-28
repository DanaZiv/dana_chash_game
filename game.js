/* global Phaser, COIN_DASH, COIN_DASH_LEVELS, COIN_DASH_POWERUPS, CoinDashTutorial */
// Several coins are always on the field; a collected coin reappears elsewhere at once.
const COIN_RULES = { count: 6, doubleChance: 0.25, doubleColor: 0xff922b, minGap: 45 };

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;   // points; read it with getScore() or listen for 'score-changed'
    this.coins = 0;        // total coins collected this round
    this.levelCoins = 0;   // coins collected in the current level
    this.level = 1;
    this.finished = false;
    this.banner = null;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    const hudFont = { font: '18px monospace', color: '#ffffff' };
    this.hud = this.add.text(18, 12, '', hudFont);
    this.levelText = this.add.text(170, 12, '', { ...hudFont, color: '#71e8ce', fontStyle: 'bold' });
    this.timeText = this.add.text(c.width - 18, 12, '', hudFont).setOrigin(1, 0);
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coinGroup = this.physics.add.group();
    for (let i = 0; i < COIN_RULES.count; i++) {
      const coin = this.add.circle(0, 0, 9, c.colors.coin);
      this.coinGroup.add(coin);
      coin.body.setCircle(9);
      coin.label = this.add.text(0, 0, '2', { font: 'bold 13px monospace', color: '#4a2500' })
        .setOrigin(0.5);
      this.placeCoin(coin);
    }
    this.drones = this.physics.add.group();
    // Level 1: the original three drones, placed and aimed as before.
    for (let i = 0; i < c.droneCount; i++) {
      COIN_DASH_LEVELS.createEnemy(this, 'drone', 90 + i * 270, 100, 35 + i * 105);
    }
    // Fresh manager per round, so restarting clears every active effect.
    this.powerUps = new COIN_DASH_POWERUPS.Manager(this, 372, 22, 80);
    this.physics.add.overlap(this.player, this.coinGroup, (player, coin) => this.collectCoin(coin));
    this.physics.add.overlap(this.player, this.drones, (player, drone) => {
      if (COIN_DASH_LEVELS.isHarmful(drone, this.time.now)) this.finish('A drone caught you!');
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  getScore() { return this.score; }

  // A double coin is worth 2; the Double points power-up doubles whatever the coin is worth.
  pointsForCoin(coin) {
    return (coin.isDouble ? 2 : 1) * (this.powerUps.isActive('double') ? 2 : 1);
  }

  collectCoin(coin) {
    if (this.finished) return;
    this.coins++;
    this.levelCoins++;
    this.score += this.pointsForCoin(coin);
    this.events.emit('score-changed', this.score);
    this.placeCoin(coin);
    if (this.levelCoins >= COIN_DASH_LEVELS.coinsForLevel(this.level)) {
      this.levelCoins = 0;
      this.levelUp(this.level + 1);
    }
  }

  levelUp(level) {
    this.level = level;
    const wanted = COIN_DASH_LEVELS.enemyKindsForLevel(level);
    const added = wanted.slice(this.drones.getLength());
    added.forEach(kind => COIN_DASH_LEVELS.spawnEnemy(this, kind));
    const { kinds, speedFactorForLevel } = COIN_DASH_LEVELS;
    const faster = speedFactorForLevel(level) > speedFactorForLevel(level - 1);
    this.showBanner(`LEVEL ${level}`, added.length
      ? added.map(k => `New enemy: ${kinds[k].name} - ${kinds[k].hint}`).join('\n')
      : (faster ? 'Enemies are faster' : 'Keep going!'));
  }

  showBanner(title, subtitle) {
    const c = COIN_DASH;
    if (this.banner) this.banner.destroy();
    const banner = this.banner = this.add.text(c.width / 2, c.height / 2 - 60, `${title}\n${subtitle}`, {
      font: 'bold 26px monospace', color: '#71e8ce', align: 'center',
      stroke: '#0a1120', strokeThickness: 6
    }).setOrigin(0.5);
    this.tweens.add({ targets: banner, alpha: 0, delay: 900, duration: 600,
      onComplete: () => { banner.destroy(); if (this.banner === banner) this.banner = null; } });
  }

  placeCoin(coin) {
    const c = COIN_DASH;
    // Avoid spawning the coin underneath the player or on top of another coin.
    const others = this.coinGroup.getChildren().filter(other => other !== coin && other.placed);
    let x, y, tries = 0;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (++tries < 50 &&
      (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60 ||
       others.some(o => Phaser.Math.Distance.Between(x, y, o.x, o.y) < COIN_RULES.minGap)));
    coin.isDouble = Math.random() < COIN_RULES.doubleChance;
    coin.placed = true;
    coin.setFillStyle(coin.isDouble ? COIN_RULES.doubleColor : c.colors.coin);
    coin.setScale(coin.isDouble ? 1.4 : 1);
    coin.setPosition(x, y);
    coin.body.reset(x, y);
    coin.label.setPosition(x, y).setVisible(coin.isDouble);
  }

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const powerUps = this.powerUps;
    powerUps.update(this.player);
    const speed = COIN_DASH.playerSpeed * (powerUps.isActive('speed') ? 2 : 1);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);
    this.player.body.setVelocity(direction.x, direction.y);
    COIN_DASH_LEVELS.updateEnemies(this, {
      level: this.level, slow: powerUps.isActive('slow'), shrink: powerUps.isActive('shrink')
    });
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Score: ${this.score}`);
    this.levelText.setText(
      `Level ${this.level} · ${this.levelCoins}/${COIN_DASH_LEVELS.coinsForLevel(this.level)}`);
    this.timeText.setText(`Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 520, 170, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\nScore: ${this.score} (${this.coins} coins) · Level ${this.level}\nPress R to try again`,
      { font: '22px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
    this.events.emit('round-over', { score: this.score, coins: this.coins, level: this.level });
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: [CoinDashTutorial, CoinDash]
});
