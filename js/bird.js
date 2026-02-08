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

  draw(ctx, theme, customization) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const p = getEffectivePlayer(theme.player, customization);
    let hatAnchor;

    switch (theme.player.type) {
      case 'bird':
        this.drawBird(ctx, p);
        hatAnchor = { x: 3, y: -10 };
        break;
      case 'penguin':
        this.drawPenguin(ctx, p);
        hatAnchor = { x: 0, y: -14 };
        break;
      case 'rocket':
        this.drawRocket(ctx, p);
        hatAnchor = { x: 0, y: -8 };
        break;
    }

    if (customization && customization.hat && customization.hat !== 'none') {
      const crownColor = getCrownColor(customization.hat);
      if (crownColor) {
        drawCharacterCrown(ctx, hatAnchor.x, hatAnchor.y - 2, crownColor, 1.0);
      } else {
        drawHat(ctx, customization.hat, hatAnchor.x, hatAnchor.y, 1.0);
      }
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

function getEffectivePlayer(player, customization) {
  if (!customization || !customization.bodyColor) return player;
  return { ...player, bodyColor: customization.bodyColor };
}

const CROWN_COLORS = {
  crown_gold: '#FFD700',
  crown_silver: '#C0C0C0',
  crown_bronze: '#CD7F32',
};

export function getCrownColor(hatId) {
  return CROWN_COLORS[hatId] || null;
}

export function drawHat(ctx, hatId, ax, ay, s) {
  switch (hatId) {
    case 'santa':  drawSantaHat(ctx, ax, ay, s); break;
    case 'ballcap': drawBallCap(ctx, ax, ay, s); break;
    case 'mohawk':  drawMohawk(ctx, ax, ay, s); break;
  }
}

function drawSantaHat(ctx, ax, ay, s) {
  // White brim
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(ax, ay, 10 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Red body
  ctx.fillStyle = '#CC0000';
  ctx.beginPath();
  ctx.moveTo(ax - 8 * s, ay - 1 * s);
  ctx.lineTo(ax + 8 * s, ay - 1 * s);
  ctx.lineTo(ax + 4 * s, ay - 14 * s);
  ctx.closePath();
  ctx.fill();

  // White pom-pom
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(ax + 4 * s, ay - 14 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawBallCap(ctx, ax, ay, s) {
  // Cap dome
  ctx.fillStyle = '#2C3E50';
  ctx.beginPath();
  ctx.arc(ax, ay - 1 * s, 8 * s, Math.PI, 0);
  ctx.fill();

  // Brim
  ctx.fillStyle = '#34495E';
  ctx.beginPath();
  ctx.ellipse(ax + 5 * s, ay, 10 * s, 3 * s, 0, Math.PI, 0, true);
  ctx.fill();
}

function drawMohawk(ctx, ax, ay, s) {
  ctx.fillStyle = '#E74C3C';
  const spikes = 5;
  for (let i = 0; i < spikes; i++) {
    const sx = ax - 8 * s + i * 4 * s;
    const h = (6 + i * 2) * s;
    ctx.beginPath();
    ctx.moveTo(sx, ay);
    ctx.lineTo(sx + 2 * s, ay - h);
    ctx.lineTo(sx + 4 * s, ay);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawCharacterCrown(ctx, cx, cy, color, s) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - 8 * s, cy + 2 * s);
  ctx.lineTo(cx + 8 * s, cy + 2 * s);
  ctx.lineTo(cx + 7 * s, cy - 2 * s);
  ctx.lineTo(cx + 8 * s, cy - 6 * s);
  ctx.lineTo(cx + 4 * s, cy - 3 * s);
  ctx.lineTo(cx, cy - 7 * s);
  ctx.lineTo(cx - 4 * s, cy - 3 * s);
  ctx.lineTo(cx - 8 * s, cy - 6 * s);
  ctx.lineTo(cx - 7 * s, cy - 2 * s);
  ctx.closePath();
  ctx.fill();

  // Gem dots
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy - 1 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
}

// Hat anchor points for mini characters in renderer
export const HAT_ANCHORS = {
  bird:    { x: 2, y: -7 },
  penguin: { x: 0, y: -11 },
  rocket:  { x: 0, y: -6 },
};
