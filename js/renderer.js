import { getHighScore } from './storage.js';
import { drawHat, drawCharacterCrown, getCrownColor, HAT_ANCHORS } from './bird.js';
import { HATS, HAT_ORDER, CROWN_ORDER, COLOR_PALETTE } from './customization.js';

export class Renderer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.particles = [];
    this.clouds = [];
    this.initClouds();
  }

  // --- Particles ---

  initClouds() {
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * this.width * 1.5,
        y: 40 + Math.random() * 150,
        w: 60 + Math.random() * 60,
        h: 25 + Math.random() * 15,
        speed: 10 + Math.random() * 15,
      });
    }
  }

  initParticles(theme) {
    this.particles = [];
    if (!theme.particles.enabled) return;

    const count = theme.particles.count;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(theme, true));
    }
  }

  createParticle(theme, randomY) {
    if (theme.particles.type === 'snow') {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : -5,
        speed: 30 + Math.random() * 40,
        drift: (Math.random() - 0.5) * 20,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.4 + Math.random() * 0.6,
      };
    } else if (theme.particles.type === 'sand') {
      return {
        x: randomY ? Math.random() * this.width : this.width + 5,
        y: Math.random() * this.height,
        speed: 40 + Math.random() * 30,
        drift: 8 + Math.random() * 12,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
      };
    } else if (theme.particles.type === 'bubbles') {
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : this.height + 5,
        speed: 25 + Math.random() * 35,
        wobble: (Math.random() - 0.5) * 30,
        wobbleOffset: Math.random() * Math.PI * 2,
        size: 2 + Math.random() * 4,
        alpha: 0.2 + Math.random() * 0.4,
      };
    } else {
      // Stars
      return {
        x: Math.random() * this.width,
        y: Math.random() * (this.height - 80),
        size: 0.5 + Math.random() * 2,
        alpha: Math.random(),
        twinkleSpeed: 1 + Math.random() * 3,
        twinkleOffset: Math.random() * Math.PI * 2,
      };
    }
  }

  updateParticles(dt, theme) {
    // Update clouds
    for (const c of this.clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < 0) {
        c.x = this.width + 20;
        c.y = 40 + Math.random() * 150;
      }
    }

    if (!theme.particles.enabled) return;

    if (theme.particles.type === 'snow') {
      for (const p of this.particles) {
        p.y += p.speed * dt;
        p.x += p.drift * dt;
        if (p.y > this.height) {
          p.y = -5;
          p.x = Math.random() * this.width;
        }
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
      }
    } else if (theme.particles.type === 'sand') {
      for (const p of this.particles) {
        p.x -= p.speed * dt;
        p.y += p.drift * dt;
        if (p.x < -5) {
          p.x = this.width + 5;
          p.y = Math.random() * this.height;
        }
        if (p.y > this.height) {
          p.y = 0;
          p.x = Math.random() * this.width;
        }
      }
    } else if (theme.particles.type === 'bubbles') {
      for (const p of this.particles) {
        p.y -= p.speed * dt;
        p.x += Math.sin(performance.now() * 0.002 + p.wobbleOffset) * p.wobble * dt;
        if (p.y < -10) {
          p.y = this.height + 5;
          p.x = Math.random() * this.width;
        }
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
      }
    } else {
      // Stars just twinkle — alpha varies with time
      for (const p of this.particles) {
        p.alpha = 0.3 + 0.7 * Math.abs(Math.sin(performance.now() * 0.001 * p.twinkleSpeed + p.twinkleOffset));
      }
    }
  }

  drawParticles(ctx, theme) {
    if (!theme.particles.enabled) return;

    if (theme.particles.type === 'bubbles') {
      for (const p of this.particles) {
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = theme.particles.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
        // Shine spot
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = theme.particles.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Background ---

  drawBackground(ctx, theme) {
    const bg = theme.background;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, bg.skyGradient[0]);
    grad.addColorStop(1, bg.skyGradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    if (bg.hasClouds) {
      this.drawClouds(ctx, bg.cloudColor);
    }
  }

  drawClouds(ctx, color) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    for (const c of this.clouds) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x - c.w * 0.25, c.y + 5, c.w * 0.3, c.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x + c.w * 0.25, c.y + 3, c.w * 0.35, c.h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Ground ---

  drawGround(ctx, theme, offset) {
    const bg = theme.background;
    const groundY = this.height - bg.groundHeight;

    // Grass/accent strip
    ctx.fillStyle = bg.groundAccent;
    ctx.fillRect(0, groundY, this.width, 15);

    // Ground body
    ctx.fillStyle = bg.groundColor;
    ctx.fillRect(0, groundY + 15, this.width, bg.groundHeight - 15);

    // Ground texture lines
    ctx.strokeStyle = bg.groundAccent;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    const patternW = 30;
    const off = offset % patternW;
    for (let x = -off; x < this.width + patternW; x += patternW) {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 20);
      ctx.lineTo(x + 15, groundY + bg.groundHeight);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // --- Score ---

  drawScore(ctx, theme, score) {
    ctx.save();
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.strokeStyle = theme.ui.scoreStroke;
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(score, this.width / 2, 30);

    ctx.fillStyle = theme.ui.scoreColor;
    ctx.fillText(score, this.width / 2, 30);
    ctx.restore();
  }

  // --- Menu ---

  drawMenu(ctx, activeTheme, allThemes, themeOrder, customization) {
    // Title
    ctx.save();
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('FLAPPY ANYTHING', this.width / 2, 45);

    ctx.fillStyle = '#FFF';
    ctx.fillText('FLAPPY ANYTHING', this.width / 2, 45);

    // Subtitle
    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeText('Choose your adventure', this.width / 2, 78);
    ctx.fillText('Choose your adventure', this.width / 2, 78);
    ctx.restore();

    // Theme cards
    const cardWidth = 300;
    const cardHeight = 68;
    const startX = (this.width - cardWidth) / 2;
    const startY = 100;
    const gap = 10;

    for (let i = 0; i < themeOrder.length; i++) {
      const themeId = themeOrder[i];
      const theme = allThemes[themeId];
      const y = startY + i * (cardHeight + gap);
      this.drawThemeCard(ctx, theme, startX, y, cardWidth, cardHeight, customization);
    }

    // Bottom buttons (side by side)
    this.drawMenuButton(ctx, this.getCustomizeButtonBounds(), 'Customize');
    this.drawMenuButton(ctx, this.getLeaderboardButtonBounds(), 'Leaderboard');
  }

  drawMenuButton(ctx, bounds, label) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFF';
    ctx.fillText(label, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
    ctx.restore();
  }

  getCustomizeButtonBounds() {
    return { x: 20, y: 502, w: 170, h: 32 };
  }

  getLeaderboardButtonBounds() {
    return { x: 210, y: 502, w: 170, h: 32 };
  }

  drawThemeCard(ctx, theme, x, y, w, h, customization) {
    // Card background with theme gradient
    ctx.save();
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, theme.background.skyGradient[0]);
    grad.addColorStop(1, theme.background.skyGradient[1]);

    // Rounded rect
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = theme.ui.menuHighlight;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Mini ground preview
    ctx.fillStyle = theme.background.groundAccent;
    ctx.beginPath();
    ctx.roundRect(x, y + h - 12, w, 12, [0, 0, 12, 12]);
    ctx.fill();

    // Theme name
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(theme.name, x + 60, y + 18);
    ctx.fillText(theme.name, x + 60, y + 18);

    // Description
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(theme.description, x + 60, y + 35);
    ctx.fillText(theme.description, x + 60, y + 35);

    // High score
    const hs = getHighScore(theme.id);
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(`Best: ${hs}`, x + 60, y + 50);
    ctx.fillStyle = theme.ui.menuHighlight;
    ctx.fillText(`Best: ${hs}`, x + 60, y + 50);

    // Mini character preview
    const charCustom = customization ? customization[theme.id] : null;
    this.drawMiniCharacter(ctx, theme, x + 30, y + 28, charCustom);

    ctx.restore();
  }

  drawMiniCharacter(ctx, theme, cx, cy, charCustomization) {
    const bodyColor = (charCustomization && charCustomization.bodyColor) || theme.player.bodyColor;

    ctx.save();
    ctx.translate(cx, cy);

    switch (theme.player.type) {
      case 'bird':
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.player.wingColor;
        ctx.beginPath();
        ctx.ellipse(-2, 2, 7, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(6, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(7, -3, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.player.beakColor;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(16, 2);
        ctx.lineTo(10, 4);
        ctx.closePath();
        ctx.fill();
        break;

      case 'penguin':
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.player.bellyColor;
        ctx.beginPath();
        ctx.ellipse(1, 1, 6, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(5, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(6, -5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.player.beakColor;
        ctx.beginPath();
        ctx.moveTo(8, -2);
        ctx.lineTo(14, 0);
        ctx.lineTo(8, 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'rocket':
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-9, -6, 18, 12, 2);
        ctx.fill();
        ctx.fillStyle = theme.player.noseColor;
        ctx.beginPath();
        ctx.moveTo(9, -6);
        ctx.lineTo(15, 0);
        ctx.lineTo(9, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.player.windowColor;
        ctx.beginPath();
        ctx.arc(3, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.player.flameColor;
        ctx.beginPath();
        ctx.moveTo(-9, -3);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-9, 3);
        ctx.closePath();
        ctx.fill();
        break;

      case 'cactus':
        // Mini cactus body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Lighter stripe
        ctx.fillStyle = theme.player.lightColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Left arm
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(-9, -1, 4, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Right arm
        ctx.beginPath();
        ctx.ellipse(8, 2, 3, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Flower
        ctx.fillStyle = theme.player.flowerColor;
        ctx.beginPath();
        ctx.arc(0, -11, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.player.flowerCenter;
        ctx.beginPath();
        ctx.arc(0, -11, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(4, -4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'submarine':
        // Mini hull
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hull accent
        ctx.fillStyle = theme.player.hullAccent;
        ctx.beginPath();
        ctx.ellipse(0, 2, 12, 5, 0, 0, Math.PI);
        ctx.fill();
        // Window
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(4, -1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.player.windowColor;
        ctx.beginPath();
        ctx.arc(4, -1, 3, 0, Math.PI * 2);
        ctx.fill();
        // Periscope
        ctx.fillStyle = theme.player.periscopeColor;
        ctx.fillRect(-2, -13, 3, 6);
        ctx.fillRect(-3, -14, 5, 2);
        // Propeller line
        ctx.strokeStyle = theme.player.propellerColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-14, -3);
        ctx.lineTo(-14, 3);
        ctx.stroke();
        break;
    }

    // Draw hat or crown on mini character
    const anchor = HAT_ANCHORS[theme.player.type];
    if (charCustomization && charCustomization.hat && charCustomization.hat !== 'none' && anchor) {
      const cc = getCrownColor(charCustomization.hat);
      if (cc) {
        drawCharacterCrown(ctx, anchor.x, anchor.y - 1, cc, 0.55);
      } else {
        drawHat(ctx, charCustomization.hat, anchor.x, anchor.y, 0.7);
      }
    }

    ctx.restore();
  }

  // --- Customize Screen ---

  getCustomizeTabBounds(index) {
    const tabW = 68;
    const gap = 7;
    const count = 5;
    const totalW = count * tabW + (count - 1) * gap;
    const startX = (this.width - totalW) / 2;
    return { x: startX + index * (tabW + gap), y: 62, w: tabW, h: 30 };
  }

  getHatOptionBounds(index) {
    const cols = 5;
    const optW = 56;
    const gapX = 10;
    const gapY = 6;
    const totalW = cols * optW + (cols - 1) * gapX;
    const startX = (this.width - totalW) / 2;
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { x: startX + col * (optW + gapX), y: 220 + row * (46 + gapY), w: optW, h: 46 };
  }

  getCrownOptionBounds(index) {
    const optW = 56;
    const gap = 10;
    const count = 3;
    const totalW = count * optW + (count - 1) * gap;
    const startX = (this.width - totalW) / 2;
    return { x: startX + index * (optW + gap), y: 378, w: optW, h: 44 };
  }

  getColorSwatchBounds(index) {
    const cols = 9;
    const swatchSize = 28;
    const gap = 5;
    const totalW = cols * swatchSize + (cols - 1) * gap;
    const startX = (this.width - totalW) / 2;
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { x: startX + col * (swatchSize + gap), y: 438 + row * (swatchSize + gap), w: swatchSize, h: swatchSize };
  }

  getResetColorBounds() {
    const cols = 9;
    const swatchSize = 28;
    const gap = 5;
    const totalW = cols * swatchSize + (cols - 1) * gap;
    const startX = (this.width - totalW) / 2;
    // Place reset button after the last swatch in second row
    const row2Count = COLOR_PALETTE.length - cols;
    return { x: startX + row2Count * (swatchSize + gap) + gap, y: 438 + (swatchSize + gap), w: swatchSize, h: swatchSize };
  }

  getCustomizeBackBounds() {
    return { x: (this.width - 140) / 2, y: 506, w: 140, h: 34 };
  }

  drawCustomizeScreen(ctx, allThemes, themeOrder, customization, activeTab, previewBird, crownRank) {
    const activeTheme = allThemes[activeTab];
    const charCustom = customization[activeTab];

    // Title
    ctx.save();
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText('CUSTOMIZE', this.width / 2, 38);
    ctx.fillStyle = '#FFF';
    ctx.fillText('CUSTOMIZE', this.width / 2, 38);
    ctx.restore();

    // Character tabs (5 tabs)
    for (let i = 0; i < themeOrder.length; i++) {
      const themeId = themeOrder[i];
      const theme = allThemes[themeId];
      const tab = this.getCustomizeTabBounds(i);
      const isActive = themeId === activeTab;

      ctx.save();
      ctx.fillStyle = isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.roundRect(tab.x, tab.y, tab.w, tab.h, 8);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = theme.ui.menuHighlight;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeText(theme.name, tab.x + tab.w / 2, tab.y + tab.h / 2);
      ctx.fillStyle = isActive ? '#FFF' : 'rgba(255,255,255,0.8)';
      ctx.fillText(theme.name, tab.x + tab.w / 2, tab.y + tab.h / 2);
      ctx.restore();
    }

    // Character preview area
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.roundRect(100, 98, 200, 100, 12);
    ctx.fill();
    ctx.restore();

    // Draw preview character (using the Bird instance)
    if (previewBird) {
      previewBird.draw(ctx, activeTheme, charCustom);
    }

    // "Hat" label
    ctx.save();
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    const hatLabelX = this.getHatOptionBounds(0).x;
    ctx.strokeText('Hat', hatLabelX, 208);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Hat', hatLabelX, 208);
    ctx.restore();

    // Hat options (3 rows)
    for (let i = 0; i < HAT_ORDER.length; i++) {
      const hatId = HAT_ORDER[i];
      const hat = HATS[hatId];
      const b = this.getHatOptionBounds(i);
      const isSelected = charCustom.hat === hatId;

      ctx.save();
      ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 8);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Hat icon
      if (hatId === 'none') {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + 18, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2 - 6, b.y + 24);
        ctx.lineTo(b.x + b.w / 2 + 6, b.y + 12);
        ctx.stroke();
      } else {
        drawHat(ctx, hatId, b.x + b.w / 2, b.y + 22, 0.75);
      }

      ctx.font = '10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelected ? '#FFF' : 'rgba(255,255,255,0.85)';
      ctx.fillText(hat.name, b.x + b.w / 2, b.y + b.h - 6);
      ctx.restore();
    }

    // Crown options
    for (let i = 0; i < CROWN_ORDER.length; i++) {
      const crownId = CROWN_ORDER[i];
      const crown = HATS[crownId];
      const b = this.getCrownOptionBounds(i);
      const isSelected = charCustom.hat === crownId;
      // Rank 1: gold+silver+bronze, Rank 2: silver+bronze, Rank 3: bronze only
      const requiredRank = i + 1; // gold=1, silver=2, bronze=3
      const isLocked = !crownRank || crownRank > requiredRank;

      ctx.save();

      if (isLocked) {
        ctx.globalAlpha = 0.35;
      }

      ctx.fillStyle = isSelected && !isLocked ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 8);
      ctx.fill();

      if (isSelected && !isLocked) {
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      drawCharacterCrown(ctx, b.x + b.w / 2, b.y + 18, crown.color, 0.85);

      ctx.font = '10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelected && !isLocked ? '#FFF' : 'rgba(255,255,255,0.85)';
      ctx.fillText(isLocked ? 'Top ' + requiredRank : crown.name, b.x + b.w / 2, b.y + b.h - 6);

      if (isLocked) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial, sans-serif';
        ctx.fillText('\u{1F512}', b.x + b.w / 2, b.y + 5);
      }

      ctx.restore();
    }

    // "Color" label
    ctx.save();
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const colorLabelX = this.getColorSwatchBounds(0).x;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText('Color', colorLabelX, 428);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Color', colorLabelX, 428);
    ctx.restore();

    // Color swatches (2 rows)
    const effectiveColor = charCustom.bodyColor || activeTheme.player.bodyColor;
    for (let i = 0; i < COLOR_PALETTE.length; i++) {
      const color = COLOR_PALETTE[i];
      const b = this.getColorSwatchBounds(i);
      const isSelected = effectiveColor === color;

      ctx.save();

      // Swatch background
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4, 5);
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 6);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Reset color button
    const rb = this.getResetColorBounds();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(rb.x, rb.y + 2, rb.w, rb.h - 4, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Reset arrow icon
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(rb.x + rb.w / 2, rb.y + rb.h / 2, 5, -Math.PI * 0.8, Math.PI * 0.5);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(rb.x + rb.w / 2 + 2, rb.y + rb.h / 2 + 4);
    ctx.lineTo(rb.x + rb.w / 2 + 4, rb.y + rb.h / 2 + 1);
    ctx.lineTo(rb.x + rb.w / 2 + 1, rb.y + rb.h / 2 + 1);
    ctx.stroke();
    ctx.restore();

    // Back button
    const back = this.getCustomizeBackBounds();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(back.x, back.y, back.w, back.h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Back', back.x + back.w / 2, back.y + back.h / 2);
    ctx.restore();
  }

  // --- Ready Screen ---

  drawReady(ctx, theme) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "Get Ready!" title
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('Get Ready!', this.width / 2, this.height / 2 - 80);
    ctx.fillStyle = theme.ui.scoreColor;
    ctx.fillText('Get Ready!', this.width / 2, this.height / 2 - 80);

    // Pulsing prompt
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = '20px Arial, sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText('Tap, Click, or Press Space', this.width / 2, this.height / 2 + 80);
    ctx.fillStyle = '#FFF';
    ctx.fillText('Tap, Click, or Press Space', this.width / 2, this.height / 2 + 80);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  drawCrown(ctx, cx, cy, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    // Base
    ctx.moveTo(cx - 6, cy + 3);
    ctx.lineTo(cx + 6, cy + 3);
    ctx.lineTo(cx + 5, cy - 1);
    // Right point
    ctx.lineTo(cx + 6, cy - 5);
    ctx.lineTo(cx + 3, cy - 2);
    // Center point
    ctx.lineTo(cx, cy - 6);
    ctx.lineTo(cx - 3, cy - 2);
    // Left point
    ctx.lineTo(cx - 6, cy - 5);
    ctx.lineTo(cx - 5, cy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- Leaderboard Screen ---

  getLeaderboardBackButtonBounds() {
    const w = 120;
    return { x: (this.width - w) / 2, y: 520, w: w, h: 36 };
  }

  drawLeaderboard(ctx, theme, scores, currentPlayerId, scrollOffset = 0) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText('LEADERBOARD', this.width / 2, 50);
    ctx.fillStyle = '#FFF';
    ctx.fillText('LEADERBOARD', this.width / 2, 50);

    // Score list panel
    const panelW = 340;
    const panelH = 420;
    const panelX = (this.width - panelW) / 2;
    const panelY = 80;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    // Column headers (above clip region)
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('#', panelX + 16, panelY + 22);
    ctx.fillText('Name', panelX + 45, panelY + 22);
    ctx.textAlign = 'right';
    ctx.fillText('Score', panelX + panelW - 16, panelY + 22);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 12, panelY + 38);
    ctx.lineTo(panelX + panelW - 12, panelY + 38);
    ctx.stroke();

    // Scrollable area
    const rowH = 36;
    const clipTop = panelY + 40;
    const clipH = panelH - 42;
    const startRowY = clipTop + 15;

    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX, clipTop, panelW, clipH);
    ctx.clip();

    if (scores.length === 0) {
      ctx.textAlign = 'center';
      ctx.font = '15px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('No scores yet!', this.width / 2, startRowY + 60);
    }

    for (let i = 0; i < scores.length; i++) {
      const entry = scores[i];
      const rowY = startRowY + i * rowH - scrollOffset;

      // Skip rows outside visible area
      if (rowY < clipTop - rowH || rowY > clipTop + clipH + rowH) continue;

      const isMe = entry.id === currentPlayerId;

      if (isMe) {
        ctx.fillStyle = 'rgba(243, 156, 18, 0.15)';
        ctx.beginPath();
        ctx.roundRect(panelX + 6, rowY - rowH / 2 + 2, panelW - 12, rowH - 4, 6);
        ctx.fill();
      }

      // Rank
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillStyle = i < 3 ? '#F39C12' : 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`${i + 1}`, panelX + 16, rowY);

      // Crown for top 3
      if (i < 3) {
        const crownColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        this.drawCrown(ctx, panelX + 36, rowY, crownColors[i]);
      }

      // Name (shifted right to make room for crown)
      const nameX = panelX + (i < 3 ? 50 : 45);
      ctx.font = isMe ? 'bold 15px Arial, sans-serif' : '15px Arial, sans-serif';
      ctx.fillStyle = isMe ? '#F39C12' : '#FFF';
      ctx.fillText(entry.name, nameX, rowY);

      // Score
      ctx.textAlign = 'right';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillStyle = isMe ? '#F39C12' : '#FFF';
      ctx.fillText(entry.score, panelX + panelW - 16, rowY);
    }

    ctx.restore(); // End clip

    // Scrollbar indicator
    if (scores.length > 11) {
      const totalContentH = scores.length * rowH;
      const maxScroll = totalContentH - clipH + 15;
      const trackTop = clipTop + 4;
      const trackBottom = panelY + panelH - 14;
      const trackH = trackBottom - trackTop;
      const barH = Math.max(30, trackH * (clipH / totalContentH));
      const barY = trackTop + (trackH - barH) * (scrollOffset / maxScroll);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.roundRect(panelX + panelW - 8, barY, 4, barH, 2);
      ctx.fill();
    }

    // Back button
    const btn = this.getLeaderboardBackButtonBounds();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Back', btn.x + btn.w / 2, btn.y + btn.h / 2);

    ctx.restore();
  }

  // --- Mute Button ---

  getMuteButtonBounds() {
    return { x: 10, y: 10, w: 28, h: 28 };
  }

  drawMuteButton(ctx, isMuted) {
    const { x, y, w, h } = this.getMuteButtonBounds();
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();

    // Button background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    // Speaker body (centered in button)
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 3);
    ctx.lineTo(cx - 3, cy - 3);
    ctx.lineTo(cx + 1, cy - 6);
    ctx.lineTo(cx + 1, cy + 6);
    ctx.lineTo(cx - 3, cy + 3);
    ctx.lineTo(cx - 6, cy + 3);
    ctx.closePath();
    ctx.fill();

    if (isMuted) {
      // X mark
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 4, cy - 4);
      ctx.lineTo(cx + 10, cy + 4);
      ctx.moveTo(cx + 10, cy - 4);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.stroke();
    } else {
      // Sound waves
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx + 3, cy, 3, -Math.PI / 4, Math.PI / 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 3, cy, 6.5, -Math.PI / 4, Math.PI / 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- Game Over ---

  drawGameOver(ctx, theme, score, highScore, isNew) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Score panel
    const panelW = 260;
    const panelH = 200;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2 - 30;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.fill();

    ctx.strokeStyle = theme.ui.menuHighlight;
    ctx.lineWidth = 2;
    ctx.stroke();

    // "GAME OVER" text
    ctx.save();
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('GAME OVER', this.width / 2, panelY + 40);

    ctx.fillStyle = theme.ui.scoreColor;
    ctx.fillText('GAME OVER', this.width / 2, panelY + 40);

    // Score
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Score', this.width / 2, panelY + 80);

    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText(score, this.width / 2, panelY + 115);
    ctx.fillText(score, this.width / 2, panelY + 115);

    // High score
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = theme.ui.menuHighlight;
    let hsText = `Best: ${highScore}`;
    if (isNew) hsText += '  NEW!';
    ctx.fillText(hsText, this.width / 2, panelY + 155);

    // Tap to play again
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Tap to play again', this.width / 2, panelY + panelH + 30);
    ctx.globalAlpha = 1;

    // Menu button
    const btnW = 160;
    const btnH = 44;
    const btnX = (this.width - btnW) / 2;
    const btnY = this.height / 2 + 130;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 10);
    ctx.fill();

    ctx.strokeStyle = theme.ui.menuHighlight;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Menu', this.width / 2, btnY + btnH / 2);

    ctx.restore();
  }
}
