/* global Phaser, COIN_DASH, COIN_DASH_LEVELS, CoinDashTutorial */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;   // points; read it with getScore() or listen for 'score-changed'
    this.coins = 0;   // coins collected; drives level progression
    this.level = 1;
    this.finished = false;
    this.banner = null;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    const hudFont = { font: '18px monospace', color: '#ffffff' };
    this.hud = this.add.text(18, 12, '', hudFont);
    this.levelText = this.add.text(230, 12, '', { ...hudFont, color: '#71e8ce', fontStyle: 'bold' });
    this.timeText = this.add.text(c.width - 18, 12, '', hudFont).setOrigin(1, 0);
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    // Level 1: the original three drones, placed and aimed as before.
    for (let i = 0; i < c.droneCount; i++) {
      COIN_DASH_LEVELS.createEnemy(this, 'drone', 90 + i * 270, 100, 35 + i * 105);
    }
    this.physics.add.overlap(this.player, this.coin, () => this.collectCoin());
    this.physics.add.overlap(this.player, this.drones, (player, drone) => {
      if (COIN_DASH_LEVELS.isHarmful(drone, this.time.now)) this.finish('A drone caught you!');
    });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  getScore() { return this.score; }

  collectCoin() {
    if (this.finished) return;
    this.coins++;
    this.score++;
    this.events.emit('score-changed', this.score);
    this.placeCoin();
    const level = COIN_DASH_LEVELS.levelForCoins(this.coins);
    if (level > this.level) this.levelUp(level);
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

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    COIN_DASH_LEVELS.updateEnemies(this, { level: this.level, slow: false, shrink: false });
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Score: ${this.score}`);
    this.levelText.setText(`Level ${this.level}`);
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
