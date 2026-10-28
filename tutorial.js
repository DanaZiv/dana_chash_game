/* global Phaser, COIN_DASH, COIN_DASH_LEVELS, COIN_DASH_POWERUPS */
// Level 0: instruction screen shown once before the first round.
class CoinDashTutorial extends Phaser.Scene {
  constructor() { super('Tutorial'); }

  create() {
    const c = COIN_DASH;
    const cx = c.width / 2;
    const body = { font: '17px monospace', color: '#e5edf7' };
    this.add.grid(cx, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.add.rectangle(cx, c.height / 2, c.width - 40, c.height - 30, 0x0a1120, 0.88)
      .setStrokeStyle(1, 0x34445e);

    this.add.text(cx, 42, 'LEVEL 0 · TUTORIAL', { font: 'bold 28px monospace', color: '#71e8ce' })
      .setOrigin(0.5);

    const left = 70;
    this.add.text(left, 82, 'Move with the ARROW KEYS or WASD.', body);

    this.add.circle(left + 9, 128, 9, c.colors.coin);
    this.add.text(left + 30, 118,
      `Collect coins for points. Every ${COIN_DASH_LEVELS.rules.coinsPerLevel} coins = next level.`, body);

    const kinds = COIN_DASH_LEVELS.kinds;
    Object.keys(kinds).forEach((kind, i) => {
      this.add.rectangle(left + 9 + i * 26, 166, 18, 18, kinds[kind].color);
    });
    this.add.text(left + 110, 156, 'Avoid enemies - one touch ends the round.', body);
    this.add.text(left + 110, 178, 'New kinds appear as levels go up.', { ...body, color: '#9fb0c8' });

    this.add.text(left, 216, 'Collect power-ups. Each one lasts 5 SECONDS:', body);
    const P = COIN_DASH_POWERUPS;
    P.order.forEach((type, i) => {
      const x = 145 + i * 170;
      P.makeIcon(this, type, x, 272, 1.4);
      this.add.text(x, 310, P.types[type].label, { font: '15px monospace', color: '#e5edf7' })
        .setOrigin(0.5);
    });

    this.add.text(cx, 352,
      `You have ${c.roundSeconds} seconds. Press R during a round to restart.`,
      { ...body, color: '#9fb0c8' }).setOrigin(0.5);

    const button = this.add.rectangle(cx, 420, 260, 54, 0x71e8ce)
      .setInteractive({ useHandCursor: true });
    this.add.text(cx, 420, 'START', { font: 'bold 24px monospace', color: '#0a1120' }).setOrigin(0.5);
    this.add.text(cx, 462, 'or press ENTER / SPACE', { font: '14px monospace', color: '#9fb0c8' })
      .setOrigin(0.5);
    button.on('pointerover', () => button.setFillStyle(0xa5f3e1));
    button.on('pointerout', () => button.setFillStyle(0x71e8ce));
    button.on('pointerdown', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
  }

  startGame() {
    this.scene.start('CoinDash');
  }
}
