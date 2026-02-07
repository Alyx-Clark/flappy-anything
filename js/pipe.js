export class PipePair {
  constructor(x, gapCenter, gapSize, width) {
    this.x = x;
    this.gapTop = gapCenter - gapSize / 2;
    this.gapBottom = gapCenter + gapSize / 2;
    this.width = width;
    this.scored = false;
  }

  update(dt, speed) {
    this.x -= speed * dt;
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }

  draw(ctx, theme, canvasHeight) {
    const p = theme.pipe;

    if (p.hasRockTexture) {
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
    const seed = Math.floor(x * 0.1);
    for (let i = 0; i < 3; i++) {
      const cx = x + 8 + ((seed + i * 37) % (w - 16));
      const cy = y + 20 + ((seed + i * 53) % Math.max(h - 40, 1));
      const cr = 3 + (i % 2) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
