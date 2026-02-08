export class PipePair {
  constructor(x, gapCenter, gapSize, width) {
    this.x = x;
    this.gapTop = gapCenter - gapSize / 2;
    this.gapBottom = gapCenter + gapSize / 2;
    this.width = width;
    this.scored = false;
    this.seed = Math.floor(Math.random() * 10000);
  }

  update(dt, speed) {
    this.x -= speed * dt;
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }

  draw(ctx, theme, canvasHeight) {
    const p = theme.pipe;

    if (p.hasCoralTexture) {
      this.drawCoralPipe(ctx, p, canvasHeight);
    } else if (p.hasSandstoneTexture) {
      this.drawSandstonePipe(ctx, p, canvasHeight);
    } else if (p.hasRockTexture) {
      this.drawRockPipe(ctx, p, canvasHeight);
    } else {
      this.drawStandardPipe(ctx, p, canvasHeight);
    }
  }

  drawStandardPipe(ctx, p, canvasHeight) {
    // Top pipe body
    ctx.fillStyle = p.color;
    ctx.fillRect(this.x, 0, this.width, this.gapTop);

    // Top pipe highlight (left strip)
    ctx.fillStyle = p.highlightColor;
    ctx.fillRect(this.x + 2, 0, 6, this.gapTop);

    // Top pipe cap
    ctx.fillStyle = p.capColor;
    const capX = this.x - p.capOverhang;
    const capW = this.width + p.capOverhang * 2;
    ctx.fillRect(capX, this.gapTop - p.capHeight, capW, p.capHeight);

    // Top cap highlight
    ctx.fillStyle = p.highlightColor;
    ctx.fillRect(capX + 2, this.gapTop - p.capHeight, 6, p.capHeight);

    // Bottom pipe body
    ctx.fillStyle = p.color;
    ctx.fillRect(this.x, this.gapBottom, this.width, canvasHeight - this.gapBottom);

    // Bottom pipe highlight
    ctx.fillStyle = p.highlightColor;
    ctx.fillRect(this.x + 2, this.gapBottom, 6, canvasHeight - this.gapBottom);

    // Bottom pipe cap
    ctx.fillStyle = p.capColor;
    ctx.fillRect(capX, this.gapBottom, capW, p.capHeight);

    // Bottom cap highlight
    ctx.fillStyle = p.highlightColor;
    ctx.fillRect(capX + 2, this.gapBottom, 6, p.capHeight);
  }

  drawRockPipe(ctx, p, canvasHeight) {
    // Top asteroid column
    this.drawAsteroidColumn(ctx, p, this.x, 0, this.width, this.gapTop, false);

    // Bottom asteroid column
    this.drawAsteroidColumn(ctx, p, this.x, this.gapBottom, this.width, canvasHeight - this.gapBottom, true);
  }

  drawAsteroidColumn(ctx, p, x, y, w, h, fromTop) {
    ctx.fillStyle = p.color;
    ctx.fillRect(x, y, w, h);

    // Highlight
    ctx.fillStyle = p.highlightColor;
    ctx.fillRect(x + 2, y, 8, h);

    // Rocky edge at the gap opening
    const edgeY = fromTop ? y : y + h;
    ctx.fillStyle = p.capColor;
    for (let i = 0; i < 5; i++) {
      const bx = x + i * (w / 5);
      const bw = w / 5 + 2;
      const bh = 6 + Math.sin(i * 2.5) * 4;
      if (fromTop) {
        ctx.fillRect(bx, edgeY, bw, bh);
      } else {
        ctx.fillRect(bx, edgeY - bh, bw, bh);
      }
    }

    // Crater details
    ctx.fillStyle = p.capColor;
    for (let i = 0; i < 3; i++) {
      const cx = x + 8 + ((this.seed + i * 37) % (w - 16));
      const cy = y + 20 + ((this.seed + i * 53) % Math.max(h - 40, 1));
      const cr = 3 + (i % 2) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSandstonePipe(ctx, p, canvasHeight) {
    this.drawSandstoneColumn(ctx, p, this.x, 0, this.width, this.gapTop, false);
    this.drawSandstoneColumn(ctx, p, this.x, this.gapBottom, this.width, canvasHeight - this.gapBottom, true);
  }

  drawSandstoneColumn(ctx, p, x, y, w, h, fromTop) {
    // Sandy body
    ctx.fillStyle = p.color;
    ctx.fillRect(x, y, w, h);

    // Highlight strip
    ctx.fillStyle = p.highlightColor;
    ctx.fillRect(x + 2, y, 8, h);

    // Horizontal weathering lines
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let ly = y + 6; ly < y + h; ly += 12) {
      ctx.fillRect(x, ly, w, 1.5);
    }

    // Weathered rocky edge at gap opening
    const edgeY = fromTop ? y : y + h;
    ctx.fillStyle = p.capColor;
    for (let i = 0; i < 6; i++) {
      const bx = x + i * (w / 6);
      const bw = w / 6 + 2;
      const bh = 5 + Math.sin(i * 1.8) * 4;
      if (fromTop) {
        ctx.fillRect(bx, edgeY, bw, bh);
      } else {
        ctx.fillRect(bx, edgeY - bh, bw, bh);
      }
    }

    // Small erosion spot ellipses
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 3; i++) {
      const cx = x + 10 + ((this.seed + i * 41) % (w - 20));
      const cy = y + 25 + ((this.seed + i * 59) % Math.max(h - 50, 1));
      ctx.beginPath();
      ctx.ellipse(cx, cy, 4 + (i % 2) * 2, 2 + (i % 2), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCoralPipe(ctx, p, canvasHeight) {
    this.drawCoralColumn(ctx, p, this.x, 0, this.width, this.gapTop, false);
    this.drawCoralColumn(ctx, p, this.x, this.gapBottom, this.width, canvasHeight - this.gapBottom, true);
  }

  drawCoralColumn(ctx, p, x, y, w, h, fromTop) {
    // Coral body
    ctx.fillStyle = p.color;
    ctx.fillRect(x, y, w, h);

    // Highlight strip
    ctx.fillStyle = p.highlightColor;
    ctx.fillRect(x + 2, y, 8, h);

    // Organic bumpy edge at gap (7 rounded bumps)
    const edgeY = fromTop ? y : y + h;
    ctx.fillStyle = p.capColor;
    for (let i = 0; i < 7; i++) {
      const bx = x + (i + 0.5) * (w / 7);
      const br = 4 + Math.sin(i * 2) * 2;
      if (fromTop) {
        ctx.beginPath();
        ctx.ellipse(bx, edgeY + br * 0.5, w / 7 * 0.6, br, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(bx, edgeY - br * 0.5, w / 7 * 0.6, br, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Small protruding branch nubs on sides
    ctx.fillStyle = p.branchColor || p.color;
    for (let i = 0; i < 3; i++) {
      const ny = y + 20 + ((this.seed + i * 47) % Math.max(h - 40, 1));
      const side = (this.seed + i) % 2 === 0 ? x - 3 : x + w - 1;
      ctx.beginPath();
      ctx.ellipse(side + 2, ny, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speckled texture dots
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 5; i++) {
      const dx = x + 6 + ((this.seed + i * 31) % (w - 12));
      const dy = y + 15 + ((this.seed + i * 43) % Math.max(h - 30, 1));
      ctx.beginPath();
      ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
