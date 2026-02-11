import { THEMES, THEME_ORDER } from './themes.js';
import { Bird } from './bird.js';
import { PipePair } from './pipe.js';
import { Renderer } from './renderer.js';
import { saveScore, getHighScore, getBestScore } from './storage.js';
import { AudioManager } from './audio.js';
import * as leaderboard from './leaderboard.js';
import * as auth from './auth.js';
import * as lobby from './lobby.js';
import { MultiplayerSession } from './multiplayer.js';
import { loadCustomization, saveCustomization, HATS, HAT_ORDER, CROWN_ORDER, COLOR_PALETTE } from './customization.js';

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

    // Customization
    this.customization = loadCustomization();
    this.customizeTab = 'classic';
    this.crownRank = null; // 1, 2, or 3 if in top 3
    this.refreshCrown();

    // Leaderboard
    this.leaderboardScores = [];
    this.leaderboardScroll = 0;

    // Multiplayer
    this.mpSession = null;
    this.mpCountdown = 0;
    this.mpCountdownStart = 0;
    this.mpIsHost = false;
    this.mpPlayers = {};
    this.mpMeta = null;
    this.mpLocalAlive = true;
    this.mpPlacements = [];

    // Auth UI
    this.setupAuthUI();
    this.setupLobbyUI();

    // Sync local scores and refresh crown when signing in
    auth.onAuthChange((user) => {
      if (user) {
        const best = getBestScore();
        if (best > 0) {
          leaderboard.submitScore(best).then(() => this.refreshCrown());
        } else {
          this.refreshCrown();
        }
      } else {
        this.refreshCrown();
      }
    });
  }

  setupAuthUI() {
    // Auth overlay elements
    this.authOverlay = document.getElementById('auth-overlay');
    this.authTitle = document.getElementById('auth-title');
    this.authError = document.getElementById('auth-error');
    this.authName = document.getElementById('auth-name');
    this.authEmail = document.getElementById('auth-email');
    this.authPassword = document.getElementById('auth-password');
    this.authSubmit = document.getElementById('auth-submit');
    this.authToggle = document.getElementById('auth-toggle');
    this.authForgot = document.getElementById('auth-forgot');
    this.authCancel = document.getElementById('auth-cancel');

    // Account overlay elements
    this.accountOverlay = document.getElementById('account-overlay');
    this.accountName = document.getElementById('account-name');
    this.accountEmail = document.getElementById('account-email');
    this.accountSignout = document.getElementById('account-signout');
    this.accountClose = document.getElementById('account-close');

    this.authMode = 'signin'; // 'signin' or 'signup'

    // Prevent game input from form fields
    const stopProp = (e) => e.stopPropagation();
    this.authEmail.addEventListener('keydown', stopProp);
    this.authPassword.addEventListener('keydown', stopProp);
    this.authName.addEventListener('keydown', stopProp);

    // Submit on Enter from password field
    this.authPassword.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.handleAuthSubmit();
    });

    // Submit button
    this.authSubmit.addEventListener('click', () => this.handleAuthSubmit());

    // Toggle between sign-in and sign-up
    this.authToggle.addEventListener('click', (e) => {
      e.preventDefault();
      this.authMode = this.authMode === 'signin' ? 'signup' : 'signin';
      this.updateAuthForm();
    });

    // Forgot password
    this.authForgot.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = this.authEmail.value.trim();
      if (!email) {
        this.authError.textContent = 'Enter your email first';
        return;
      }
      try {
        await auth.resetPassword(email);
        this.authError.style.color = '#2ecc71';
        this.authError.textContent = 'Reset email sent!';
        setTimeout(() => { this.authError.style.color = ''; }, 3000);
      } catch (err) {
        this.authError.textContent = this.friendlyError(err.code);
      }
    });

    // Cancel
    this.authCancel.addEventListener('click', () => {
      this.authOverlay.classList.add('hidden');
      this.clearAuthForm();
    });

    // Account overlay
    this.accountSignout.addEventListener('click', async () => {
      await auth.signOut();
      this.accountOverlay.classList.add('hidden');
    });

    this.accountClose.addEventListener('click', () => {
      this.accountOverlay.classList.add('hidden');
    });
  }

  updateAuthForm() {
    if (this.authMode === 'signup') {
      this.authTitle.textContent = 'Sign Up';
      this.authSubmit.textContent = 'Sign Up';
      this.authToggle.textContent = 'Already have an account? Sign In';
      this.authName.classList.remove('hidden');
      this.authPassword.autocomplete = 'new-password';
    } else {
      this.authTitle.textContent = 'Sign In';
      this.authSubmit.textContent = 'Sign In';
      this.authToggle.textContent = 'Need an account? Sign Up';
      this.authName.classList.add('hidden');
      this.authPassword.autocomplete = 'current-password';
    }
    this.authError.textContent = '';
  }

  clearAuthForm() {
    this.authEmail.value = '';
    this.authPassword.value = '';
    this.authName.value = '';
    this.authError.textContent = '';
    this.authMode = 'signin';
    this.updateAuthForm();
  }

  async handleAuthSubmit() {
    const email = this.authEmail.value.trim();
    const password = this.authPassword.value;
    this.authError.textContent = '';

    if (!email || !password) {
      this.authError.textContent = 'Email and password required';
      return;
    }

    try {
      if (this.authMode === 'signup') {
        const displayName = this.authName.value.trim();
        if (!displayName) {
          this.authError.textContent = 'Display name required';
          return;
        }
        const user = await auth.signUp(email, password, displayName);
        this.authOverlay.classList.add('hidden');
        this.clearAuthForm();

        // Attempt migration if localStorage has a matching name
        const storedName = leaderboard.getStoredLocalName();
        if (storedName && storedName.trim().toLowerCase() === displayName.trim().toLowerCase()) {
          await leaderboard.migrateNameEntryToUid(user.uid, displayName);
        }
      } else {
        await auth.signIn(email, password);
        this.authOverlay.classList.add('hidden');
        this.clearAuthForm();
      }
      this.refreshCrown();
    } catch (err) {
      this.authError.textContent = this.friendlyError(err.code);
    }
  }

  friendlyError(code) {
    switch (code) {
      case 'auth/email-already-in-use': return 'Email already in use';
      case 'auth/invalid-email': return 'Invalid email address';
      case 'auth/weak-password': return 'Password must be 6+ characters';
      case 'auth/user-not-found': return 'No account with that email';
      case 'auth/wrong-password': return 'Incorrect password';
      case 'auth/invalid-credential': return 'Invalid email or password';
      case 'auth/too-many-requests': return 'Too many attempts, try later';
      default: return 'Something went wrong';
    }
  }

  openAuthOverlay() {
    this.clearAuthForm();
    this.authOverlay.classList.remove('hidden');
    this.authEmail.focus();
  }

  openAccountOverlay() {
    const user = auth.getCurrentUser();
    if (!user) return;
    this.accountName.textContent = user.displayName || 'Player';
    this.accountEmail.textContent = user.email;
    this.accountOverlay.classList.remove('hidden');
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
      case 'CUSTOMIZE':
        this.updateCustomize(dt);
        break;
      case 'LEADERBOARD':
        this.updateLeaderboard(dt);
        break;
      case 'MP_LOBBY':
        this.updateMpLobby(dt);
        break;
      case 'MP_COUNTDOWN':
        this.updateMpCountdown(dt);
        break;
      case 'MP_PLAYING':
        this.updateMpPlaying(dt);
        break;
      case 'MP_GAME_OVER':
        this.updateMpGameOver(dt);
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

  isCrownUnlocked(crownId) {
    if (!this.crownRank) return false;
    // Rank 1: gold+silver+bronze, Rank 2: silver+bronze, Rank 3: bronze only
    if (crownId === 'crown_gold')   return this.crownRank <= 1;
    if (crownId === 'crown_silver') return this.crownRank <= 2;
    if (crownId === 'crown_bronze') return this.crownRank <= 3;
    return false;
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

    // Customize button
    if (this.checkButtonClick(click, this.renderer.getCustomizeButtonBounds())) {
      this.audio.play('click');
      this.renderer.initParticles(THEMES[this.customizeTab]);
      this.state = 'CUSTOMIZE';
      return;
    }

    // Multiplayer button
    if (this.checkButtonClick(click, this.renderer.getMultiplayerButtonBounds())) {
      this.audio.play('click');
      if (!auth.isSignedIn()) {
        this.openAuthOverlay();
      } else {
        this.openLobbyOverlay();
      }
      return;
    }

    // Leaderboard button
    if (this.checkButtonClick(click, this.renderer.getLeaderboardButtonBounds())) {
      this.audio.play('click');
      this.openLeaderboard();
      return;
    }

    // Auth button
    if (this.checkButtonClick(click, this.renderer.getAuthButtonBounds())) {
      this.audio.play('click');
      if (auth.isSignedIn()) {
        this.openAccountOverlay();
      } else {
        this.openAuthOverlay();
      }
      return;
    }

    const cardWidth = 300;
    const cardHeight = 68;
    const startX = (this.width - cardWidth) / 2;
    const startY = 100;
    const gap = 10;

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

  updateCustomize(dt) {
    this.groundOffset += PIPE_SPEED * 0.3 * dt;
    this.renderer.updateParticles(dt, THEMES[this.customizeTab]);

    const click = this.input.consumeClick();
    this.input.consumeFlap();
    if (!click) return;

    if (this.checkMuteClick(click)) {
      this.audio.toggleMute();
      return;
    }

    // Tab clicks
    for (let i = 0; i < THEME_ORDER.length; i++) {
      if (this.checkButtonClick(click, this.renderer.getCustomizeTabBounds(i))) {
        this.audio.play('click');
        this.customizeTab = THEME_ORDER[i];
        this.renderer.initParticles(THEMES[this.customizeTab]);
        return;
      }
    }

    // Hat option clicks
    for (let i = 0; i < HAT_ORDER.length; i++) {
      if (this.checkButtonClick(click, this.renderer.getHatOptionBounds(i))) {
        this.audio.play('click');
        this.customization[this.customizeTab].hat = HAT_ORDER[i];
        saveCustomization(this.customization);
        return;
      }
    }

    // Crown option clicks
    for (let i = 0; i < CROWN_ORDER.length; i++) {
      if (this.checkButtonClick(click, this.renderer.getCrownOptionBounds(i))) {
        const crownId = CROWN_ORDER[i];
        if (!this.isCrownUnlocked(crownId)) return; // locked
        this.audio.play('click');
        this.customization[this.customizeTab].hat = crownId;
        saveCustomization(this.customization);
        return;
      }
    }

    // Color swatch clicks
    for (let i = 0; i < COLOR_PALETTE.length; i++) {
      if (this.checkButtonClick(click, this.renderer.getColorSwatchBounds(i))) {
        this.audio.play('click');
        this.customization[this.customizeTab].bodyColor = COLOR_PALETTE[i];
        saveCustomization(this.customization);
        return;
      }
    }

    // Reset color button
    if (this.checkButtonClick(click, this.renderer.getResetColorBounds())) {
      this.audio.play('click');
      this.customization[this.customizeTab].bodyColor = null;
      saveCustomization(this.customization);
      return;
    }

    // Back button
    if (this.checkButtonClick(click, this.renderer.getCustomizeBackBounds())) {
      this.audio.play('click');
      this.state = 'MENU';
      return;
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

  async refreshCrown() {
    this.crownRank = await leaderboard.getPlayerRank();
  }

  gameOver() {
    this.audio.play('crash');
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewHighScore = true;
    }
    saveScore(this.theme.id, this.score);
    this.state = 'GAME_OVER';

    if (auth.isSignedIn()) {
      leaderboard.submitScore(this.score).then(() => this.refreshCrown());
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
      case 'CUSTOMIZE':
        this.renderCustomize(ctx);
        break;
      case 'LEADERBOARD':
        this.renderLeaderboard(ctx);
        break;
      case 'MP_LOBBY':
        this.renderMpLobby(ctx);
        break;
      case 'MP_COUNTDOWN':
        this.renderMpCountdown(ctx);
        break;
      case 'MP_PLAYING':
        this.renderMpPlaying(ctx);
        break;
      case 'MP_GAME_OVER':
        this.renderMpGameOver(ctx);
        break;
    }
  }

  renderMenu(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.renderer.drawMenu(ctx, this.theme, THEMES, THEME_ORDER, this.customization, auth.isSignedIn(), auth.getDisplayName());
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  renderCustomize(ctx) {
    const tabTheme = THEMES[this.customizeTab];
    this.renderer.drawBackground(ctx, tabTheme);
    this.renderer.drawParticles(ctx, tabTheme);
    this.renderer.drawGround(ctx, tabTheme, this.groundOffset);

    // Create a temporary preview bird centered in the preview area
    const previewBird = new Bird(200, 148);
    previewBird.y = 148 + Math.sin(performance.now() * 0.003) * 5;
    previewBird.wingTimer = performance.now() / 1000;
    previewBird.wingUp = Math.sin(performance.now() * 0.005) > 0;

    this.renderer.drawCustomizeScreen(ctx, THEMES, THEME_ORDER, this.customization, this.customizeTab, previewBird, this.crownRank);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  renderReady(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.bird.draw(ctx, this.theme, this.customization[this.theme.id]);
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
    this.bird.draw(ctx, this.theme, this.customization[this.theme.id]);
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
    this.bird.draw(ctx, this.theme, this.customization[this.theme.id]);

    this.renderer.drawGameOver(ctx, this.theme, this.score, this.highScore, this.isNewHighScore, auth.isSignedIn());
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  renderLeaderboard(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.renderer.drawLeaderboard(ctx, this.theme, this.leaderboardScores, leaderboard.getCurrentPlayerId(), this.leaderboardScroll);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  // ==========================================
  // MULTIPLAYER
  // ==========================================

  setupLobbyUI() {
    this.lobbyOverlay = document.getElementById('lobby-overlay');
    this.lobbyError = document.getElementById('lobby-error');
    this.lobbyCodeInput = document.getElementById('lobby-code-input');
    this.lobbyCreateBtn = document.getElementById('lobby-create');
    this.lobbyJoinBtn = document.getElementById('lobby-join');
    this.lobbyCancelBtn = document.getElementById('lobby-cancel');

    // Prevent game input from form fields
    const stopProp = (e) => e.stopPropagation();
    this.lobbyCodeInput.addEventListener('keydown', stopProp);

    // Enter to join from code input
    this.lobbyCodeInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.handleJoinLobby();
    });

    this.lobbyCreateBtn.addEventListener('click', () => this.handleCreateLobby());
    this.lobbyJoinBtn.addEventListener('click', () => this.handleJoinLobby());
    this.lobbyCancelBtn.addEventListener('click', () => {
      this.lobbyOverlay.classList.add('hidden');
      this.lobbyError.textContent = '';
      this.lobbyCodeInput.value = '';
    });
  }

  openLobbyOverlay() {
    this.lobbyError.textContent = '';
    this.lobbyCodeInput.value = '';
    this.lobbyOverlay.classList.remove('hidden');
  }

  async handleCreateLobby() {
    this.lobbyError.textContent = '';
    const code = await lobby.createLobby(this.theme.id, this.customization);
    if (!code) {
      this.lobbyError.textContent = 'Failed to create lobby';
      return;
    }
    this.lobbyOverlay.classList.add('hidden');
    this.mpIsHost = true;
    this.enterMpLobby(code);
  }

  async handleJoinLobby() {
    this.lobbyError.textContent = '';
    const code = this.lobbyCodeInput.value.trim().toUpperCase();
    if (code.length !== 6) {
      this.lobbyError.textContent = 'Code must be 6 characters';
      return;
    }
    const ok = await lobby.joinLobby(code, this.customization);
    if (!ok) {
      this.lobbyError.textContent = 'Lobby not found or already started';
      return;
    }
    this.lobbyOverlay.classList.add('hidden');
    this.mpIsHost = false;
    this.enterMpLobby(code);
  }

  enterMpLobby(code) {
    this.mpPlayers = {};
    this.mpMeta = null;
    this.state = 'MP_LOBBY';

    lobby.onLobbyChange((type, data) => {
      if (type === 'meta') {
        this.mpMeta = data;
        if (data) {
          // Update theme if host changed it
          if (THEMES[data.themeId]) {
            this.theme = THEMES[data.themeId];
            this.renderer.initParticles(this.theme);
          }
          // Check if host is us
          const user = auth.getCurrentUser();
          if (user) this.mpIsHost = data.hostUid === user.uid;

          // State transitions triggered by meta changes
          if (data.status === 'countdown' && this.state === 'MP_LOBBY') {
            this.startMpCountdown(data.startTime);
          }
          // Auto-return to lobby when host initiates rematch
          if (data.status === 'waiting' && (this.state === 'MP_GAME_OVER' || this.state === 'MP_PLAYING')) {
            this.returnToMpLobby();
          }
        }
      } else if (type === 'players') {
        this.mpPlayers = data || {};
      }
    });
  }

  // --- MP_LOBBY ---

  updateMpLobby(dt) {
    this.groundOffset += PIPE_SPEED * 0.3 * dt;

    const click = this.input.consumeClick();
    this.input.consumeFlap();
    if (!click) return;

    if (this.checkMuteClick(click)) {
      this.audio.toggleMute();
      return;
    }

    // Leave button
    if (this.checkButtonClick(click, this.renderer.getMpLobbyLeaveBounds())) {
      this.audio.play('click');
      lobby.leaveLobby();
      this.state = 'MENU';
      return;
    }

    // Host-only: Start button
    if (this.mpIsHost) {
      const playerCount = Object.keys(this.mpPlayers).length;
      if (playerCount >= 2 && this.checkButtonClick(click, this.renderer.getMpLobbyStartBounds())) {
        this.audio.play('click');
        lobby.startGame();
        return;
      }

      // Theme arrows
      if (this.checkButtonClick(click, this.renderer.getMpLobbyThemeLeftBounds())) {
        this.audio.play('click');
        this.cycleMpTheme(-1);
        return;
      }
      if (this.checkButtonClick(click, this.renderer.getMpLobbyThemeRightBounds())) {
        this.audio.play('click');
        this.cycleMpTheme(1);
        return;
      }
    }
  }

  cycleMpTheme(dir) {
    const currentIdx = THEME_ORDER.indexOf(this.theme.id);
    const newIdx = (currentIdx + dir + THEME_ORDER.length) % THEME_ORDER.length;
    const newThemeId = THEME_ORDER[newIdx];
    lobby.setLobbyTheme(newThemeId);
  }

  renderMpLobby(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.renderer.drawMpLobby(ctx, this.theme, lobby.getCurrentCode() || '------', this.mpPlayers, this.mpIsHost, this.theme.id);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  // --- MP_COUNTDOWN ---

  startMpCountdown(serverStartTime) {
    this.state = 'MP_COUNTDOWN';
    this.mpCountdownStart = serverStartTime;
    this.mpCountdown = 3;

    // Set up theme + audio
    if (this.mpMeta && THEMES[this.mpMeta.themeId]) {
      this.theme = THEMES[this.mpMeta.themeId];
      this.audio.setTheme(this.theme);
      this.renderer.initParticles(this.theme);
    }

    // Initialize bird for ready position
    this.bird = new Bird(BIRD_X, this.height / 2);
    this.pipes = [];
    this.score = 0;
    this.groundOffset = 0;
  }

  updateMpCountdown(dt) {
    this.groundOffset += PIPE_SPEED * 0.3 * dt;
    this.input.consumeClick();
    this.input.consumeFlap();

    // Bird hovers
    this.bird.y = this.height / 2 + Math.sin(performance.now() * 0.003) * 8;

    // Calculate countdown from server timestamp
    const elapsed = Date.now() - this.mpCountdownStart;
    const remaining = 3 - Math.floor(elapsed / 1000);
    this.mpCountdown = remaining;

    if (remaining <= 0 && elapsed >= 3500) {
      this.startMpPlaying();
    }
  }

  renderMpCountdown(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.bird.draw(ctx, this.theme, this.customization[this.theme.id]);
    this.renderer.drawMpCountdown(ctx, this.theme, this.mpCountdown);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  // --- MP_PLAYING ---

  startMpPlaying() {
    this.state = 'MP_PLAYING';
    this.mpLocalAlive = true;

    // Create multiplayer session
    const seed = this.mpMeta ? this.mpMeta.seed : 12345;
    const user = auth.getCurrentUser();
    this.mpSession = new MultiplayerSession(seed, user.uid);
    this.mpSession.setGameStartTime(this.mpCountdownStart + 3500);
    this.mpSession.initRemotePlayers(this.mpPlayers, this.theme.id);

    // Set playing status if host
    if (this.mpIsHost) {
      lobby.setLobbyPlaying();
    }

    // Reset bird
    this.bird = new Bird(BIRD_X, this.height / 2);
    this.bird.flap();
    this.audio.play('flap');
    this.pipes = [];
    this.score = 0;
    this.groundOffset = 0;

    // Spawn first pipe
    this.spawnMultiplayerPipe(this.width + 100);
  }

  updateMpPlaying(dt) {
    const click = this.input.consumeClick();
    if (this.checkMuteClick(click)) {
      this.audio.toggleMute();
      this.input.consumeFlap();
    }

    // Update remote player data from Firebase
    this.mpSession.updateFromFirebase(this.mpPlayers);

    // Local bird input + physics
    if (this.mpLocalAlive) {
      if (this.input.consumeFlap()) {
        this.bird.flap();
        this.audio.play('flap');
        this.mpSession.reportLocalFlap();
      }

      this.bird.update(dt);

      // Push state snapshot at 5 Hz
      this.mpSession.pushLocalState(this.bird, this.score);

      // Collision check
      if (this.checkCollision()) {
        this.mpLocalAlive = false;
        this.audio.play('crash');
        this.mpSession.reportLocalCrash(this.score);
      }
    } else {
      this.input.consumeFlap();
    }

    // Remote birds
    this.mpSession.updateRemoteBirds(dt);

    // Pipes
    this.groundOffset += PIPE_SPEED * dt;
    for (const pipe of this.pipes) {
      pipe.update(dt, PIPE_SPEED);
    }
    this.pipes = this.pipes.filter(p => !p.isOffScreen());

    // Spawn new pipes deterministically
    if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.width - PIPE_SPACING) {
      this.spawnMultiplayerPipe(this.width);
    }

    // Score (local only)
    if (this.mpLocalAlive) {
      for (const pipe of this.pipes) {
        if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
          pipe.scored = true;
          this.score++;
          this.audio.play('score');
        }
      }
    }

    // Check game end: <=1 alive
    const alivePlayers = this.mpSession.getAlivePlayers(this.mpLocalAlive);
    if (alivePlayers.length <= 1) {
      this.endMpGame();
    }
  }

  spawnMultiplayerPipe(x) {
    const r = this.mpSession.rng.next();
    const gapCenter = MIN_GAP_CENTER + r * (MAX_GAP_CENTER - MIN_GAP_CENTER);
    const pipeSeed = Math.floor(this.mpSession.rng.next() * 10000);
    this.pipes.push(new PipePair(x, gapCenter, GAP_SIZE, this.theme.pipe.width, pipeSeed));
  }

  renderMpPlaying(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);

    for (const pipe of this.pipes) {
      pipe.draw(ctx, this.theme, this.height);
    }

    this.renderer.drawGround(ctx, this.theme, this.groundOffset);

    // Draw remote ghost players
    if (this.mpSession) {
      for (const uid of Object.keys(this.mpSession.remotePlayers)) {
        const rp = this.mpSession.remotePlayers[uid];
        if (!rp.alive) continue;
        this.renderer.drawGhostPlayer(ctx, rp.bird, this.theme, rp.customization, rp.displayName);
      }
    }

    // Draw local bird
    if (this.mpLocalAlive) {
      this.bird.draw(ctx, this.theme, this.customization[this.theme.id]);
    }

    // HUD
    this.renderer.drawMpHud(ctx, this.mpPlayers, auth.getCurrentUser()?.uid);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  // --- MP_GAME_OVER ---

  endMpGame() {
    this.state = 'MP_GAME_OVER';
    this.mpPlacements = this.mpSession.buildPlacements(this.mpPlayers);

    if (this.mpIsHost) {
      lobby.finishGame();
    }
  }

  updateMpGameOver(dt) {
    this.groundOffset += PIPE_SPEED * 0.3 * dt;

    const click = this.input.consumeClick();
    this.input.consumeFlap();
    if (!click) return;

    if (this.checkMuteClick(click)) {
      this.audio.toggleMute();
      return;
    }

    // Rematch button — return to same lobby
    if (this.checkButtonClick(click, this.renderer.getMpGameOverRematchBounds())) {
      this.audio.play('click');
      this.returnToMpLobby();
      return;
    }

    // Menu button — leave lobby entirely
    if (this.checkButtonClick(click, this.renderer.getMpGameOverMenuBounds())) {
      this.audio.play('click');
      this.cleanupMultiplayer();
      this.state = 'MENU';
      this.renderer.initParticles(this.theme);
    }
  }

  async returnToMpLobby() {
    // Clean up multiplayer session (flap listeners + remote players) but keep lobby connection
    if (this.mpSession) {
      this.mpSession.cleanup();
      this.mpSession = null;
    }

    // Reset local game state
    this.mpLocalAlive = true;
    this.mpPlacements = [];
    this.pipes = [];
    this.bird = null;
    this.score = 0;

    // Set state immediately to prevent re-entrant callbacks from onLobbyChange
    this.state = 'MP_LOBBY';

    // Reset own player data in Firebase
    await lobby.resetForRematch();

    // Host resets lobby status to waiting (with new seed)
    if (this.mpIsHost) {
      await lobby.resetLobbyForRematch();
    }
  }

  renderMpGameOver(ctx) {
    this.renderer.drawBackground(ctx, this.theme);
    this.renderer.drawParticles(ctx, this.theme);
    this.renderer.drawGround(ctx, this.theme, this.groundOffset);
    this.renderer.drawMpGameOver(ctx, this.theme, this.mpPlacements, auth.getCurrentUser()?.uid);
    this.renderer.drawMuteButton(ctx, this.audio.isMuted());
  }

  cleanupMultiplayer() {
    // Leave lobby first (needs currentLobbyCode), then cleanup session
    lobby.leaveLobby();
    if (this.mpSession) {
      this.mpSession.cleanup();
      this.mpSession = null;
    }
    // Clean up lobby meta/players listeners (leaveLobby handles its own, but ensure full cleanup)
    lobby.cleanup();
    this.mpPlayers = {};
    this.mpMeta = null;
    this.mpIsHost = false;
    this.mpLocalAlive = true;
    this.mpPlacements = [];
  }
}
