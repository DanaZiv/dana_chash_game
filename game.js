/* global Phaser, COIN_DASH, CoinDashTheme, CoinDashSounds */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.paused = false;
    this.lives = c.lives;
    this.invincibleUntil = 0;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.theme = new CoinDashTheme(this);
    // Hearts sit in the themed HUD bar between the coin counter and the title (HUD depth is 7).
    this.hearts = [];
    for (let i = 0; i < c.lives; i++) this.hearts.push(this.add.graphics({ x: 200 + i * 30, y: 22 }).setDepth(7));
    this.updateHearts();
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.theme.dressUp(this.player, this.coin, this.drones);
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.theme.collectSparkle(this.coin.x, this.coin.y);
      CoinDashSounds.coin();
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.loseLife());
    // The themed HUD bar uses the top-right corner for TIME, so the sound label sits just below it.
    CoinDashSounds.attach(this, { x: c.width - 12, y: 50, size: 14 });
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R,P');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.pauseOverlay = this.add.container(c.width / 2, c.height / 2, [
      this.add.rectangle(0, 0, 320, 110, 0x0a1120, 0.9),
      this.add.text(0, -12, 'PAUSED', { font: '36px monospace', color: '#ffd166' }).setOrigin(0.5),
      this.add.text(0, 28, 'Press P to resume', { font: '16px monospace', color: '#ffffff' }).setOrigin(0.5)
    ]).setDepth(10).setVisible(false);
    this.countingDown = false;
    this.countdownText = this.add.text(c.width / 2, c.height / 2, '',
      { font: 'bold 96px monospace', color: '#ffd166', stroke: '#0a1120', strokeThickness: 8 }
    ).setOrigin(0.5).setDepth(10).setVisible(false);
  }

  togglePause() {
    // Ignore P after the round ends or while a resume countdown is running.
    if (this.finished || this.countingDown) return;
    if (this.paused) {
      this.startResumeCountdown();
      return;
    }
    this.paused = true;
    // Freeze the round timer by remembering how much time was left.
    this.remainingMs = this.deadline - this.time.now;
    this.invincibleRemainingMs = Math.max(0, this.invincibleUntil - this.time.now);
    this.physics.pause();
    this.pauseOverlay.setVisible(true);
  }

  startResumeCountdown() {
    // The scene clock keeps ticking while physics is paused, so it drives the countdown.
    this.countingDown = true;
    this.pauseOverlay.setVisible(false);
    let count = 3;
    this.countdownText.setText(String(count)).setVisible(true);
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        count--;
        if (count > 0) {
          this.countdownText.setText(String(count));
          return;
        }
        this.countdownText.setText('GO!');
        this.resumeGame();
        this.time.delayedCall(600, () => {
          if (this.countdownText.text === 'GO!') this.countdownText.setVisible(false);
        });
      }
    });
  }

  resumeGame() {
    this.countingDown = false;
    this.paused = false;
    this.deadline = this.time.now + this.remainingMs;
    this.invincibleUntil = this.time.now + this.invincibleRemainingMs;
    this.physics.resume();
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

  // Hearts are drawn from two circles and a triangle, so the game still needs no image assets.
  updateHearts() {
    const colors = COIN_DASH.colors;
    this.hearts.forEach((heart, i) => {
      heart.clear().fillStyle(i < this.lives ? colors.heart : colors.heartEmpty, 1);
      heart.fillCircle(-5, -3, 6).fillCircle(5, -3, 6).fillTriangle(-10.5, 0, 10.5, 0, 0, 11);
    });
  }

  isInvincible() { return this.time.now < this.invincibleUntil; }

  loseLife() {
    if (this.finished || this.isInvincible()) return;
    this.lives = Math.max(0, this.lives - 1);
    this.updateHearts();
    CoinDashSounds.hit();
    if (this.lives === 0) {
      this.player.setAlpha(1);
      this.finish('A mushroom caught you!');
      return;
    }
    this.invincibleUntil = this.time.now + COIN_DASH.invincibilityMs;
  }

  update() {
    if (this.finished || this.paused) return;
    // Blink while invincible; uses scene time so it freezes with the rest of the scene.
    this.player.setAlpha(this.isInvincible() && Math.floor(this.time.now / 100) % 2 === 0 ? 0.25 : 1);
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.theme.updateHud(this.score, seconds);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    CoinDashSounds.gameOver();
    this.theme.showGameOver(reason, this.score);
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
  scene: CoinDash
});
