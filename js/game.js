import { THEMES, THEME_ORDER } from './themes.js';
import { Bird } from './bird.js';
import { PipePair } from './pipe.js';
import { Renderer } from './renderer.js';
import { saveScore, getHighScore } from './storage.js';
import { AudioManager } from './audio.js';
import * as leaderboard from './leaderboard.js';

const PIPE_SPEED = 150;
const PIPE_SPACING = 200;
const GAP_SIZE = 140;
const MIN_GAP_CENTER = 120;
const MAX_GAP_CENTER = 420;
const BIRD_X = 80;

export class Game {
  constructor(canvas, ctx, input) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;
    this.width = canvas.width;
    this.height = canvas.height;

    this.renderer = new Renderer(this.width, this.height);
    this.audio = new AudioManager();
    this.state = 'MENU';
    this.theme = THEMES.classic;

    this.bird = null;
    this.pipes = [];
    this.score = 0;
    this.highScore = 0;
    this.isNewHighScore = false;

    this.groundOffset = 0;
    this.lastTime = 0;

    // Leaderboard
    this.leaderboardScores = [];
    this.leaderboardScroll = 0;
    this.pendingScore = 0;

    // Name entry overlay
    this.nameOverlay = document.getElementById('name-overlay');
    this.nameInput = document.getElementById('name-input');
    this.nameSubmit = document.getElementById('name-submit');
    this.setupNameEntry();
  }

  setupNameEntry() {
    const submit = () => {
      const name = this.nameInput.value.trim();
      if (!name) return;
      leaderboard.setPlayerName(name);
      this.nameOverlay.classList.add('hidden');
      this.nameInput.value = '';
      leaderboard.submitScore(this.pendingScore);
      this.state = 'GAME_OVER';
    };

    this.nameSubmit.addEventListener('click', submit);
    this.nameInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') submit();
    });
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.renderer.updateParticles(dt, this.theme);

    switch (this.state) {
      case 'MENU':
        this.updateMenu(dt);
        break;
      case 'READY':
        this.updateReady(dt);
        break;
      case 'PLAYING':
        this.updatePlaying(dt);
        break;
      case 'GAME_OVER':
        this.updateGameOver();
        break;
      case 'ENTER_NAME':
        this.input.consumeClick();
        this.input.consumeFlap();
        break;
      case 'LEADERBOARD':
        this.updateLeaderboard(dt);
        break;
    }
  }

  checkMuteClick(click) {
    if (!click) return false;
    const btn = this.renderer.getMuteButtonBounds();
    return click.x >= btn.x && click.x <= btn.x + btn.w &&
           click.y >= btn.y && click.y <= btn.y + btn.h;
  }

  checkButtonClick(click, bounds) {
    if (!click) return false;
    return click.x >= bounds.x && click.x <= bounds.x + bounds.w &&
           click.y >= bounds.y && click.y <= bounds.y + bounds.h;
  }

  updateMenu(dt) {
    this.groundOffset = (this.groundOffset + PIPE_SPEED * 0.3 * dt);

    const click = this.input.consumeClick();
    this.input.consumeFlap();
    if (!click) return;

    if (this.checkMuteClick(click)) {
      this.audio.toggleMute();
      return;
    }

    // Leaderboard button
    if (this.checkButtonClick(click, this.renderer.getLeaderboardButtonBounds())) {
      this.audio.play('click');
      this.openLeaderboard();
      return;
    }

    const cardWidth = 300;
    const cardHeight = 100;
    const startX = (this.width - cardWidth) / 2;
    const startY = 160;
    const gap = 20;

    for (let i = 0; i < THEME_ORDER.length; i++) {
      const cardY = startY + i * (cardHeight + gap);
      if (
        click.x >= startX && click.x <= startX + cardWidth &&
        click.y >= cardY && click.y <= cardY + cardHeight
      ) {
        this.selectTheme(THEME_ORDER[i]);
        return;
      }
    }
  }

  async openLeaderboard() {
    this.leaderboardScores = await leaderboard.fetchTopScores(50);
    this.leaderboardScroll = 0;
    this.state = 'LEADERBOARD';
  }

  updateLeaderboard(dt) {
    this.groundOffset = (this.groundOffset + PIPE_SPEED * 0.3 * dt);

    // Scroll
    const scrollDelta = this.input.consumeScroll();
    if (scrollDelta) {
      const rowH = 36;
      const clipH = 378; // panelH(420) - 42
      const totalContentH = this.leaderboardScores.length * rowH;
      const maxScroll = Math.max(0, totalContentH - clipH + 15);
      this.leaderboardScroll = Math.max(0, Math.min(maxScroll, this.leaderboardScroll + scrollDelta));
    }

    const click = this.input.consumeClick();
    this.input.consumeFlap();
    if (!click) return;

    if (this.checkMuteClick(click)) {
      this.audio.toggleMute();
      return;
    }

    if (this.checkButtonClick(click, this.renderer.getLeaderboardBackButtonBounds())) {
      this.audio.play('click');
      this.state = 'MENU';
    }
  }

  selectTheme(themeId) {
    this.theme = THEMES[themeId];
    this.audio.setTheme(this.theme);
    this.audio.play('click');
    this.highScore = getHighScore(themeId);
    this.bird = new Bird(BIRD_X, this.height / 2);
    this.pipes = [];
    this.score = 0;
    this.isNewHighScore = false;
    this.groundOffset = 0;
    this.state = 'READY';
    this.renderer.initParticles(this.theme);
  }

  updateReady(dt) {
    this.groundOffset += PIPE_SPEED * 0.3 * dt;
    // Bird hovers gently
    this.bird.y = this.height / 2 + Math.sin(performance.now() * 0.003) * 8;

    const click = this.input.consumeClick();
    if (this.checkMuteClick(click)) {
      this.audio.toggleMute();
      this.input.consumeFlap();
      return;
    }

    if (this.input.consumeFlap()) {
      this.state = 'PLAYING';
      this.bird.y = this.height / 2;
      this.bird.flap();
      this.audio.play('flap');
      this.spawnPipe(this.width + 100);
    }
  }

  startGame() {
    this.bird = new Bird(BIRD_X, this.height / 2);
    this.pipes = [];
    this.score = 0;
    this.isNewHighScore = false;
    this.groundOffset = 0;
    this.state = 'PLAYING';
    this.renderer.initParticles(this.theme);

    this.spawnPipe(this.width + 100);
  }

  updatePlaying(dt) {
    const click = this.input.consumeClick();
    if (this.checkMuteClick(click)) {
      this.audio.toggleMute();
      this.input.consumeFlap();
    }

    if (this.input.consumeFlap()) {
      this.bird.flap();
      this.audio.play('flap');
    }

    this.bird.update(dt);
    this.groundOffset = (this.groundOffset + PIPE_SPEED * dt);

    // Update pipes
    for (const pipe of this.pipes) {
      pipe.update(dt, PIPE_SPEED);
    }

    // Remove off-screen pipes
    this.pipes = this.pipes.filter(p => !p.isOffScreen());

    // Spawn new pipes
    if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.width - PIPE_SPACING) {
      this.spawnPipe(this.width);
    }

    // Score
    for (const pipe of this.pipes) {
      if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
        pipe.scored = true;
        this.score++;
        this.audio.play('score');
      }
    }

    // Collision
    if (this.checkCollision()) {
      this.gameOver();
    }
  }

  spawnPipe(x) {
    const gapCenter = MIN_GAP_CENTER + Math.random() * (MAX_GAP_CENTER - MIN_GAP_CENTER);
    this.pipes.push(new PipePair(x, gapCenter, GAP_SIZE, this.theme.pipe.width));
  }

  checkCollision() {
    const groundY = this.height - this.theme.background.groundHeight;
    const b = this.bird.getHitbox();

    // Ground/ceiling
    if (b.y + b.h >= groundY) return true;
    if (b.y <= 0) return true;

    // Pipes
    for (const pipe of this.pipes) {
      const topPipe = { x: pipe.x, y: 0, w: pipe.width, h: pipe.gapTop };
      const bottomPipe = { x: pipe.x, y: pipe.gapBottom, w: pipe.width, h: this.height };

      if (this.aabbOverlap(b, topPipe)) return true;
      if (this.aabbOverlap(b, bottomPipe)) return true;
    }

    return false;
  }

  aabbOverlap(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  }

  gameOver() {
    this.audio.play('crash');
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewHighScore = true;
    }
    saveScore(this.theme.id, this.score);

    if (!leaderboard.hasPlayerName()) {
      // First time — prompt for name
      this.pendingScore = this.score;
      this.state = 'ENTER_NAME';
      this.nameOverlay.classList.remove('hidden');
      this.nameInput.focus();
    } else {
      // Returning player — auto-submit
      this.state = 'GAME_OVER';
      leaderboard.submitScore(this.score);
    }
  }

  updateGameOver() {
    const click = this.input.consumeClick();
    const flap = this.input.consumeFlap();

    if (click) {
      if (this.checkMuteClick(click)) {
        this.audio.toggleMute();
        return;
      }

      // Check menu button hit
      const btnW = 160;
      const btnH = 44;
      const btnX = (this.width - btnW) / 2;
      const btnY = this.height / 2 + 130;

      if (
        click.x >= btnX && click.x <= btnX + btnW &&
        click.y >= btnY && click.y <= btnY + btnH
      ) {
        this.audio.play('click');
        this.state = 'MENU';
        this.renderer.initParticles(this.theme);
        return;
      }

      // Tap anywhere else to replay same theme
      this.selectTheme(this.theme.id);
    } else if (flap) {
      // Spacebar/arrow key replays same theme
      this.selectTheme(this.theme.id);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    switch (this.state) {
      case 'MENU':
        this.renderMenu(ctx);
        break;
      case 'READY':
        this.renderReady(ctx);
        break;
      case 'PLAYING':
        this.renderPlaying(ctx);
        break;
      case 'GAME_OVER':
        this.renderGameOver(ctx);
        break;
      case 'ENTER_NAME':
        this.renderGameOver(ctx);
        break;
      case 'LEADERBOARD':
        this.renderLeaderboard(ctx);
        break;
    }
  }

  renderMenu(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.renderer.drawMenu(ctx, this.theme, THEMES, THEME_ORDER);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  renderReady(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.bird.draw(ctx, this.theme);
    this.renderer.drawReady(ctx, this.theme);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  renderPlaying(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);

    for (const pipe of this.pipes) {
      pipe.draw(ctx, this.theme, this.height);
    }

    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.bird.draw(ctx, this.theme);
    this.renderer.drawScore(ctx, this.theme, this.score);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  renderGameOver(ctx) {
    // Draw the frozen game state
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);

    for (const pipe of this.pipes) {
      pipe.draw(ctx, this.theme, this.height);
    }

    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.bird.draw(ctx, this.theme);

    this.renderer.drawGameOver(ctx, this.theme, this.score, this.highScore, this.isNewHighScore);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  renderLeaderboard(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.renderer.drawLeaderboard(ctx, this.theme, this.leaderboardScores, leaderboard.getCurrentPlayerId(), this.leaderboardScroll);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }
}
