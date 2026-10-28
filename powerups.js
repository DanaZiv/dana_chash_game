/* global Phaser, COIN_DASH */
// Collectible power-ups. Effects are not applied here: the game asks `isActive(type)`
// each frame and derives speeds, sizes and points from its base values.
window.COIN_DASH_POWERUPS = (() => {
  const rules = {
    durationMs: 5000,             // every effect lasts exactly five seconds
    firstSpawnMs: [6000, 9000],   // first pickup appears 6-9 s into the round
    spawnGapMs: [7000, 11000],    // later pickups 7-11 s after the previous one goes
    lifetimeMs: 6000,             // an uncollected pickup disappears after 6 s
    pickupRadius: 26,             // player half-size + icon radius
    minSpawnDistance: 120
  };

  const types = {
    speed:  { label: 'Speed x2',     ring: 0xffe066, draw: drawLightning },
    slow:   { label: 'Slow enemies', ring: 0x8ce99a, draw: drawSnail },
    shrink: { label: 'Shrink enemies', ring: 0x74c0fc, draw: drawShrink },
    double: { label: 'Double points', ring: 0xffd166, draw: drawDouble }
  };
  const order = ['speed', 'slow', 'shrink', 'double'];

  function pts(list, s) { return list.map(([x, y]) => ({ x: x * s, y: y * s })); }

  function drawLightning(scene, g, s) {
    g.fillStyle(0xffe066);
    g.fillPoints(pts([[3, -13], [-7, 1], [-1, 1], [-4, 13], [7, -2], [1, -2], [5, -13]], s), true);
  }

  function drawSnail(scene, g, s) {
    g.fillStyle(0xc0eb75);
    g.fillRoundedRect(-11 * s, 3 * s, 21 * s, 5 * s, 2 * s);
    g.lineStyle(1.5 * s, 0xc0eb75);
    g.lineBetween(-9 * s, 4 * s, -11 * s, -4 * s);
    g.lineBetween(-7 * s, 4 * s, -6 * s, -4 * s);
    g.fillCircle(-11 * s, -4 * s, 1.4 * s);
    g.fillCircle(-6 * s, -4 * s, 1.4 * s);
    g.fillStyle(0xe8a35a);
    g.fillCircle(3 * s, -1 * s, 7 * s);
    g.lineStyle(1.5 * s, 0x7a4a1c);
    g.strokeCircle(3 * s, -1 * s, 4 * s);
    g.strokeCircle(3 * s, -1 * s, 1.5 * s);
  }

  function drawShrink(scene, g, s) {
    g.fillStyle(0x74c0fc);
    g.fillRect(-3 * s, -3 * s, 6 * s, 6 * s);
    g.lineStyle(2 * s, 0x74c0fc);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
      g.lineBetween(11 * dx * s, 11 * dy * s, 6.5 * dx * s, 6.5 * dy * s);
      g.fillTriangle(4.5 * dx * s, 4.5 * dy * s, 8.5 * dx * s, 4.5 * dy * s, 4.5 * dx * s, 8.5 * dy * s);
    });
  }

  function drawDouble(scene, g, s, container) {
    g.fillStyle(0xffd166);
    g.fillCircle(0, 0, 10.5 * s);
    g.lineStyle(1.5 * s, 0xc99a2e);
    g.strokeCircle(0, 0, 8.5 * s);
    container.add(scene.add.text(0, 0, 'x2', {
      font: `bold ${Math.round(11 * s)}px monospace`, color: '#5c3d00'
    }).setOrigin(0.5));
  }

  // A round badge with the type's symbol; used in the world, the HUD and the tutorial.
  function makeIcon(scene, type, x, y, scale = 1) {
    const spec = types[type];
    const container = scene.add.container(x, y);
    const badge = scene.add.circle(0, 0, 15 * scale, 0x0a1120, 0.9).setStrokeStyle(2 * scale, spec.ring);
    const g = scene.add.graphics();
    container.add([badge, g]);
    spec.draw(scene, g, scale, container);
    return container;
  }

  class Manager {
    constructor(scene, hudX, hudY) {
      this.scene = scene;
      this.expiresAt = {};   // type -> scene time when the effect ends
      this.pickup = null;
      this.lastType = null;
      this.nextSpawnAt = scene.time.now + Phaser.Math.Between(...rules.firstSpawnMs);
      this.hud = order.map((type, i) => {
        const icon = makeIcon(scene, type, hudX + i * 86, hudY, 0.65);
        const text = scene.add.text(hudX + i * 86 + 13, hudY, '', {
          font: '16px monospace', color: '#ffffff'
        }).setOrigin(0, 0.5);
        return { type, icon, text };
      });
    }

    isActive(type) {
      return (this.expiresAt[type] || 0) > this.scene.time.now;
    }

    remainingMs(type) {
      return Math.max(0, (this.expiresAt[type] || 0) - this.scene.time.now);
    }

    // Collecting a type that is already active refreshes its timer; it never stacks.
    activate(type) {
      this.expiresAt[type] = this.scene.time.now + rules.durationMs;
    }

    update(player) {
      const now = this.scene.time.now;
      Object.keys(this.expiresAt).forEach(type => {
        if (this.expiresAt[type] <= now) delete this.expiresAt[type];
      });

      if (this.pickup) {
        const p = this.pickup;
        if (Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y) < rules.pickupRadius) {
          this.activate(p.powerType);
          this.floatLabel(types[p.powerType].label + '!', p.x, p.y);
          this.removePickup(now);
        } else if (now >= p.despawnAt) {
          this.removePickup(now);
        } else {
          p.setAlpha(p.despawnAt - now < 1500 && Math.floor(now / 150) % 2 ? 0.35 : 1);
        }
      } else if (now >= this.nextSpawnAt) {
        this.spawn(player, now);
      }

      this.hud.forEach(({ type, icon, text }) => {
        const active = this.isActive(type);
        icon.setVisible(active);
        text.setVisible(active).setText(`${(this.remainingMs(type) / 1000).toFixed(1)}s`);
      });
    }

    spawn(player, now) {
      const c = COIN_DASH;
      const choices = order.filter(t => t !== this.lastType);
      const type = Phaser.Utils.Array.GetRandom(choices);
      let x, y, tries = 0;
      do {
        x = Phaser.Math.Between(40, c.width - 40);
        y = Phaser.Math.Between(90, c.height - 40);
      } while (++tries < 40 &&
        Phaser.Math.Distance.Between(x, y, player.x, player.y) < rules.minSpawnDistance);
      this.pickup = makeIcon(this.scene, type, x, y);
      this.pickup.powerType = type;
      this.pickup.despawnAt = now + rules.lifetimeMs;
      this.lastType = type;
      this.pickup.setScale(0.2);
      this.scene.tweens.add({ targets: this.pickup, scale: 1, duration: 250, ease: 'Back.Out' });
    }

    removePickup(now) {
      this.pickup.destroy();
      this.pickup = null;
      this.nextSpawnAt = now + Phaser.Math.Between(...rules.spawnGapMs);
    }

    floatLabel(message, x, y) {
      const label = this.scene.add.text(x, y - 20, message, {
        font: 'bold 16px monospace', color: '#ffffff', stroke: '#0a1120', strokeThickness: 4
      }).setOrigin(0.5);
      this.scene.tweens.add({
        targets: label, y: y - 55, alpha: 0, duration: 900, onComplete: () => label.destroy()
      });
    }
  }

  return { rules, types, order, makeIcon, Manager };
})();
