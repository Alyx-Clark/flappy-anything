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
      case 'cactus':
        this.drawCactus(ctx, p);
        hatAnchor = { x: 0, y: -16 };
        break;
      case 'submarine':
        this.drawSubmarine(ctx, p);
        hatAnchor = { x: -1, y: -12 };
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

  drawCactus(ctx, p) {
    // Body (oval green)
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lighter belly stripe
    ctx.fillStyle = p.lightColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left arm (larger bump)
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.ellipse(-12, -2, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Right arm (smaller bump)
    ctx.beginPath();
    ctx.ellipse(11, 3, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Pink flower on top
    const fx = 0, fy = -14;
    ctx.fillStyle = p.flowerColor;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse(fx + Math.cos(angle) * 4, fy + Math.sin(angle) * 4, 3, 2.5, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gold center
    ctx.fillStyle = p.flowerCenter;
    ctx.beginPath();
    ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye (white)
    ctx.fillStyle = p.eyeColor;
    ctx.beginPath();
    ctx.arc(5, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(6.5, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cute smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(6, 2, 4, 0.1, Math.PI * 0.7);
    ctx.stroke();
  }

  drawSubmarine(ctx, p) {
    // Hull (elongated oval)
    ctx.fillStyle = p.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker accent on bottom half
    ctx.fillStyle = p.hullAccent;
    ctx.beginPath();
    ctx.ellipse(0, 3, 16, 6, 0, 0, Math.PI);
    ctx.fill();

    // Porthole window
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(5, -1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.windowColor;
    ctx.beginPath();
    ctx.arc(5, -1, 4, 0, Math.PI * 2);
    ctx.fill();

    // Window shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(3.5, -2.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Periscope
    ctx.fillStyle = p.periscopeColor;
    ctx.fillRect(-2, -17, 4, 8);
    ctx.fillRect(-4, -18, 8, 3);

    // Propeller at back (spinning)
    const propAngle = this.wingTimer * 40;
    ctx.save();
    ctx.translate(-18, 0);
    ctx.rotate(propAngle);
    ctx.fillStyle = p.propellerColor;
    // Blade 1
    ctx.beginPath();
    ctx.ellipse(0, -5, 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Blade 2
    ctx.beginPath();
    ctx.ellipse(0, 5, 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hub
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tail fins
    ctx.fillStyle = p.hullAccent;
    ctx.beginPath();
    ctx.moveTo(-16, -4);
    ctx.lineTo(-20, -9);
    ctx.lineTo(-13, -4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.lineTo(-20, 9);
    ctx.lineTo(-13, 4);
    ctx.closePath();
    ctx.fill();

    // Trailing bubbles
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const bx = -22 - Math.sin(this.wingTimer * 8) * 2;
    ctx.beginPath();
    ctx.arc(bx, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx - 4, 1, 1.5, 0, Math.PI * 2);
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
    case 'santa':     drawSantaHat(ctx, ax, ay, s); break;
    case 'ballcap':   drawBallCap(ctx, ax, ay, s); break;
    case 'mohawk':    drawMohawk(ctx, ax, ay, s); break;
    case 'top_hat':   drawTopHat(ctx, ax, ay, s); break;
    case 'cowboy':    drawCowboyHat(ctx, ax, ay, s); break;
    case 'viking':    drawVikingHat(ctx, ax, ay, s); break;
    case 'wizard':    drawWizardHat(ctx, ax, ay, s); break;
    case 'party_hat': drawPartyHat(ctx, ax, ay, s); break;
    case 'headband':  drawHeadband(ctx, ax, ay, s); break;
    case 'beanie':    drawBeanie(ctx, ax, ay, s); break;
    case 'propeller': drawPropellerHat(ctx, ax, ay, s); break;
    case 'pirate':    drawPirateHat(ctx, ax, ay, s); break;
    case 'halo':      drawHaloHat(ctx, ax, ay, s); break;
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

function drawTopHat(ctx, ax, ay, s) {
  // Brim
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(ax, ay, 11 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cylinder
  ctx.fillStyle = '#222';
  ctx.fillRect(ax - 7 * s, ay - 16 * s, 14 * s, 16 * s);

  // Top
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(ax, ay - 16 * s, 7 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Red band
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(ax - 7 * s, ay - 5 * s, 14 * s, 3 * s);
}

function drawCowboyHat(ctx, ax, ay, s) {
  // Wide brim
  ctx.fillStyle = '#8B6914';
  ctx.beginPath();
  ctx.ellipse(ax, ay + 1 * s, 14 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crown
  ctx.fillStyle = '#A0782C';
  ctx.beginPath();
  ctx.moveTo(ax - 8 * s, ay);
  ctx.quadraticCurveTo(ax - 6 * s, ay - 12 * s, ax, ay - 9 * s);
  ctx.quadraticCurveTo(ax + 6 * s, ay - 12 * s, ax + 8 * s, ay);
  ctx.closePath();
  ctx.fill();

  // Band
  ctx.fillStyle = '#654321';
  ctx.fillRect(ax - 7 * s, ay - 2 * s, 14 * s, 2.5 * s);
}

function drawVikingHat(ctx, ax, ay, s) {
  // Metal dome
  ctx.fillStyle = '#808080';
  ctx.beginPath();
  ctx.arc(ax, ay - 2 * s, 9 * s, Math.PI, 0);
  ctx.fill();

  // Brim
  ctx.fillStyle = '#696969';
  ctx.fillRect(ax - 10 * s, ay - 2 * s, 20 * s, 3 * s);

  // Left horn
  ctx.fillStyle = '#D2B48C';
  ctx.beginPath();
  ctx.moveTo(ax - 9 * s, ay - 2 * s);
  ctx.quadraticCurveTo(ax - 16 * s, ay - 10 * s, ax - 13 * s, ay - 16 * s);
  ctx.lineTo(ax - 10 * s, ay - 12 * s);
  ctx.quadraticCurveTo(ax - 12 * s, ay - 6 * s, ax - 7 * s, ay - 2 * s);
  ctx.closePath();
  ctx.fill();

  // Right horn
  ctx.beginPath();
  ctx.moveTo(ax + 9 * s, ay - 2 * s);
  ctx.quadraticCurveTo(ax + 16 * s, ay - 10 * s, ax + 13 * s, ay - 16 * s);
  ctx.lineTo(ax + 10 * s, ay - 12 * s);
  ctx.quadraticCurveTo(ax + 12 * s, ay - 6 * s, ax + 7 * s, ay - 2 * s);
  ctx.closePath();
  ctx.fill();
}

function drawWizardHat(ctx, ax, ay, s) {
  // Brim
  ctx.fillStyle = '#1B1464';
  ctx.beginPath();
  ctx.ellipse(ax, ay, 12 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cone
  ctx.fillStyle = '#1a1a6e';
  ctx.beginPath();
  ctx.moveTo(ax - 10 * s, ay - 1 * s);
  ctx.lineTo(ax + 10 * s, ay - 1 * s);
  ctx.lineTo(ax + 3 * s, ay - 22 * s);
  ctx.closePath();
  ctx.fill();

  // Gold star
  ctx.fillStyle = '#FFD700';
  const starX = ax + 1 * s, starY = ay - 10 * s;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
    const r = 3 * s;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](starX + Math.cos(angle) * r, starY + Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();

  // Small star
  ctx.beginPath();
  ctx.arc(ax - 2 * s, ay - 16 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawPartyHat(ctx, ax, ay, s) {
  // Cone
  ctx.fillStyle = '#FF69B4';
  ctx.beginPath();
  ctx.moveTo(ax - 8 * s, ay);
  ctx.lineTo(ax + 8 * s, ay);
  ctx.lineTo(ax, ay - 18 * s);
  ctx.closePath();
  ctx.fill();

  // Gold stripe
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(ax - 5 * s, ay - 5 * s);
  ctx.lineTo(ax + 5 * s, ay - 5 * s);
  ctx.lineTo(ax + 3 * s, ay - 9 * s);
  ctx.lineTo(ax - 3 * s, ay - 9 * s);
  ctx.closePath();
  ctx.fill();

  // Pom-pom
  ctx.fillStyle = '#2ECC71';
  ctx.beginPath();
  ctx.arc(ax, ay - 18 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeadband(ctx, ax, ay, s) {
  // Red band
  ctx.fillStyle = '#E74C3C';
  ctx.fillRect(ax - 10 * s, ay - 3 * s, 20 * s, 5 * s);

  // Trailing knot ends
  ctx.strokeStyle = '#E74C3C';
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax - 10 * s, ay);
  ctx.quadraticCurveTo(ax - 14 * s, ay + 4 * s, ax - 16 * s, ay + 8 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ax - 10 * s, ay - 1 * s);
  ctx.quadraticCurveTo(ax - 13 * s, ay + 2 * s, ax - 17 * s, ay + 5 * s);
  ctx.stroke();
}

function drawBeanie(ctx, ax, ay, s) {
  // Dome
  ctx.fillStyle = '#3498DB';
  ctx.beginPath();
  ctx.arc(ax, ay - 2 * s, 10 * s, Math.PI, 0);
  ctx.fill();

  // Folded brim
  ctx.fillStyle = '#2980B9';
  ctx.fillRect(ax - 10 * s, ay - 3 * s, 20 * s, 4 * s);

  // Knit lines
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.8 * s;
  for (let i = 0; i < 3; i++) {
    const ly = ay - 5 * s - i * 3 * s;
    ctx.beginPath();
    ctx.moveTo(ax - 8 * s + i, ly);
    ctx.lineTo(ax + 8 * s - i, ly);
    ctx.stroke();
  }

  // Top nub
  ctx.fillStyle = '#3498DB';
  ctx.beginPath();
  ctx.arc(ax, ay - 12 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawPropellerHat(ctx, ax, ay, s) {
  // Red beanie base
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.arc(ax, ay - 1 * s, 9 * s, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#C0392B';
  ctx.fillRect(ax - 9 * s, ay - 2 * s, 18 * s, 3 * s);

  // Propeller shaft
  const propY = ay - 10 * s;
  ctx.fillStyle = '#888';
  ctx.fillRect(ax - 1 * s, propY, 2 * s, 3 * s);

  // Spinning blades
  const angle = performance.now() * 0.008;
  ctx.save();
  ctx.translate(ax, propY);
  ctx.rotate(angle);
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.ellipse(-6 * s, 0, 6 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6 * s, 0, 6 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hub
  ctx.fillStyle = '#AAA';
  ctx.beginPath();
  ctx.arc(ax, propY, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawPirateHat(ctx, ax, ay, s) {
  // Tricorne shape
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(ax - 12 * s, ay);
  ctx.quadraticCurveTo(ax - 14 * s, ay - 8 * s, ax - 6 * s, ay - 12 * s);
  ctx.lineTo(ax, ay - 16 * s);
  ctx.lineTo(ax + 6 * s, ay - 12 * s);
  ctx.quadraticCurveTo(ax + 14 * s, ay - 8 * s, ax + 12 * s, ay);
  ctx.closePath();
  ctx.fill();

  // Brim
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.ellipse(ax, ay, 12 * s, 3 * s, 0, 0, Math.PI);
  ctx.fill();

  // Skull emblem
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(ax, ay - 8 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(ax - 1.2 * s, ay - 8.5 * s, 0.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ax + 1.2 * s, ay - 8.5 * s, 0.8 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawHaloHat(ctx, ax, ay, s) {
  // Outer ring
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.ellipse(ax, ay - 10 * s, 10 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner glow
  ctx.strokeStyle = 'rgba(255, 223, 0, 0.4)';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.ellipse(ax, ay - 10 * s, 10 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
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
  bird:      { x: 2, y: -7 },
  penguin:   { x: 0, y: -11 },
  rocket:    { x: 0, y: -6 },
  cactus:    { x: 0, y: -13 },
  submarine: { x: -1, y: -9 },
};
