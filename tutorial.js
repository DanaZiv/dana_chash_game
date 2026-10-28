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
    this.add.text(left, 74, 'Move with the ARROW KEYS or WASD.', body);

    const step = COIN_DASH_LEVELS.rules.coinsPerLevel;
    this.add.circle(left + 9, 112, 9, c.colors.coin);
    this.add.text(left + 30, 102, 'Coin = 1 point.', body);
    this.add.circle(left + 222, 112, 12, 0xff922b);
    this.add.text(left + 222, 112, '2', { font: 'bold 13px monospace', color: '#4a2500' }).setOrigin(0.5);
    this.add.text(left + 245, 102, 'Big orange coin = 2 points.', body);
    this.add.text(left, 132,
      `Level N needs N x ${step} coins (${step}, ${step * 2}, ${step * 3}, ...) to go up.`, body);

    const kinds = COIN_DASH_LEVELS.kinds;
    Object.keys(kinds).forEach((kind, i) => {
      this.add.rectangle(left + 9 + i * 26, 174, 18, 18, kinds[kind].color);
    });
    this.add.text(left + 110, 164, 'Avoid enemies - one touch ends the round.', body);
    this.add.text(left + 110, 186, 'New kinds appear as levels go up.', { ...body, color: '#9fb0c8' });

    this.add.text(left, 222, 'Collect power-ups. Each one lasts 5 SECONDS:', body);
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
