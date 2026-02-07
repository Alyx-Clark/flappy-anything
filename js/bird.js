const GRAVITY = 1200;
const FLAP_VELOCITY = -380;
const MAX_FALL_SPEED = 600;
const ROTATION_SPEED = 3;
const FLAP_ROTATION = -0.5;
const HITBOX_INSET = 4;

export class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.velocity = 0;
    this.rotation = 0;
    this.wingTimer = 0;
    this.wingUp = false;
  }

  flap() {
    this.velocity = FLAP_VELOCITY;
    this.rotation = FLAP_ROTATION;
  }

  update(dt) {
    this.velocity += GRAVITY * dt;
    this.velocity = Math.min(this.velocity, MAX_FALL_SPEED);
    this.y += this.velocity * dt;

    if (this.velocity < 0) {
      this.rotation = FLAP_ROTATION;
    } else {
      this.rotation = Math.min(this.rotation + ROTATION_SPEED * dt, Math.PI / 2);
    }

    this.wingTimer += dt;
    if (this.wingTimer > 0.1) {
      this.wingTimer = 0;
      this.wingUp = !this.wingUp;
    }
  }

  getHitbox() {
    const size = 26;
    return {
      x: this.x - size / 2 + HITBOX_INSET,
      y: this.y - size / 2 + HITBOX_INSET,
      w: size - HITBOX_INSET * 2,
      h: size - HITBOX_INSET * 2,
    };
  }

  draw(ctx, theme) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    switch (theme.player.type) {
      case 'bird':
        this.drawBird(ctx, theme.player);
        break;
      case 'penguin':
        this.drawPenguin(ctx, theme.player);
        break;
      case 'rocket':
        this.drawRocket(ctx, theme.player);
        break;
    }

    ctx.restore();
  }

  drawBird(ctx, p) {
    // Body
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = p.wingColor;
    ctx.beginPath();
    const wingY = this.wingUp ? -4 : 4;
    ctx.ellipse(-2, wingY, 10, 6, this.wingUp ? -0.3 : 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye (white)
    ctx.fillStyle = p.eyeColor;
    ctx.beginPath();
    ctx.arc(8, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(9.5, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = p.beakColor;
    ctx.beginPath();
    ctx.moveTo(13, -1);
    ctx.lineTo(21, 2);
    ctx.lineTo(13, 5);
    ctx.closePath();
    ctx.fill();
  }

  drawPenguin(ctx, p) {
    // Body (dark)
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly (white)
    ctx.fillStyle = p.bellyColor;
    ctx.beginPath();
    ctx.ellipse(2, 2, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye (white)
    ctx.fillStyle = p.eyeColor;
    ctx.beginPath();
    ctx.arc(6, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(7.5, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = p.beakColor;
    ctx.beginPath();
    ctx.moveTo(10, -3);
    ctx.lineTo(18, 0);
    ctx.lineTo(10, 3);
    ctx.closePath();
    ctx.fill();

    // Flippers
    ctx.fillStyle = p.bodyColor;
    ctx.save();
    const flipAngle = this.wingUp ? -0.4 : 0.4;
    // Left flipper
    ctx.beginPath();
    ctx.ellipse(-11, 2, 4, 10, flipAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawRocket(ctx, p) {
    // Body
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.roundRect(-12, -8, 24, 16, 3);
    ctx.fill();

    // Nose cone
    ctx.fillStyle = p.noseColor;
    ctx.beginPath();
    ctx.moveTo(12, -8);
    ctx.lineTo(20, 0);
    ctx.lineTo(12, 8);
    ctx.closePath();
    ctx.fill();

    // Window
    ctx.fillStyle = p.windowColor;
    ctx.beginPath();
    ctx.arc(4, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Window shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(3, -1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Fins
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.lineTo(-16, -14);
    ctx.lineTo(-6, -8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.lineTo(-16, 14);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();

    // Flame
    const flicker = Math.sin(this.wingTimer * 60) * 3;
    ctx.fillStyle = p.flameColor;
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.lineTo(-22 - flicker, 0);
    ctx.lineTo(-12, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFF3B0';
    ctx.beginPath();
    ctx.moveTo(-12, -3);
    ctx.lineTo(-17 - flicker * 0.5, 0);
    ctx.lineTo(-12, 3);
    ctx.closePath();
    ctx.fill();
  }
}
