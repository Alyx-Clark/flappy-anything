import { Bird } from './bird.js';
import { SeededRandom } from './prng.js';
import * as lobby from './lobby.js';
import * as auth from './auth.js';

const STATE_PUSH_INTERVAL = 200; // ms — push y/vel/rot at 5 Hz
const LERP_DURATION = 100; // ms — smooth remote drift over 100ms

export class MultiplayerSession {
  constructor(seed, localUid) {
    this.rng = new SeededRandom(seed);
    this.localUid = localUid;
    this.remotePlayers = {}; // uid -> { bird, displayName, customization, alive, score, targetY, targetVel, targetRot, lerpStart }
    this.gameStartTime = null;
    this.lastStatePush = 0;
    this.spectating = false;
    this.listeners = [];
  }

  setGameStartTime(t) {
    this.gameStartTime = t;
  }

  getTimeOffset() {
    return this.gameStartTime ? Date.now() - this.gameStartTime : 0;
  }

  // Call once with initial player list from lobby
  initRemotePlayers(players, themeId) {
    for (const uid of Object.keys(players)) {
      if (uid === this.localUid) continue;
      const p = players[uid];
      const bird = new Bird(80, 300);
      this.remotePlayers[uid] = {
        bird,
        displayName: p.displayName || 'Player',
        customization: p.customization ? p.customization[themeId] || null : null,
        alive: true,
        score: p.score || 0,
        targetY: null,
        targetVel: null,
        targetRot: null,
        lerpStart: 0,
      };

      // Listen for flap events from this remote player
      lobby.onRemoteFlaps(uid, () => {
        const rp = this.remotePlayers[uid];
        if (rp && rp.alive) {
          rp.bird.flap();
        }
      });
    }
  }

  // Called each frame with latest player data from Firebase
  updateFromFirebase(players) {
    for (const uid of Object.keys(players)) {
      if (uid === this.localUid) continue;
      const p = players[uid];

      if (!this.remotePlayers[uid]) continue;

      const rp = this.remotePlayers[uid];
      rp.alive = p.alive !== false;
      rp.score = p.score || 0;

      // Set lerp targets from state snapshots
      if (p.y !== undefined && p.y !== rp.targetY) {
        rp.targetY = p.y;
        rp.targetVel = p.velocity || 0;
        rp.targetRot = p.rotation || 0;
        rp.lerpStart = performance.now();
      }

      // Handle disconnect
      if (p.connected === false && rp.alive) {
        rp.alive = false;
      }
    }

    // Remove players who left entirely
    for (const uid of Object.keys(this.remotePlayers)) {
      if (!players[uid]) {
        delete this.remotePlayers[uid];
      }
    }
  }

  // Run physics + lerp for all remote birds
  updateRemoteBirds(dt) {
    const now = performance.now();

    for (const uid of Object.keys(this.remotePlayers)) {
      const rp = this.remotePlayers[uid];
      if (!rp.alive) continue;

      // Run normal physics
      rp.bird.update(dt);

      // Lerp toward snapshot target
      if (rp.targetY !== null) {
        const elapsed = now - rp.lerpStart;
        const t = Math.min(elapsed / LERP_DURATION, 1);

        if (t < 1) {
          // Blend toward target
          rp.bird.y += (rp.targetY - rp.bird.y) * t * 0.3;
          rp.bird.velocity += (rp.targetVel - rp.bird.velocity) * t * 0.3;
        }
      }
    }
  }

  // Push local state to Firebase at 5 Hz
  pushLocalState(bird, score) {
    const now = Date.now();
    if (now - this.lastStatePush < STATE_PUSH_INTERVAL) return;
    this.lastStatePush = now;
    lobby.reportState(bird.y, bird.velocity, bird.rotation, score);
  }

  reportLocalFlap() {
    lobby.reportFlap(this.getTimeOffset());
  }

  async reportLocalCrash(score) {
    this.spectating = true;
    await lobby.reportCrash(score);
  }

  // Check if game should end (<=1 alive)
  getAlivePlayers(localAlive) {
    const alive = [];
    if (localAlive) alive.push(this.localUid);
    for (const uid of Object.keys(this.remotePlayers)) {
      if (this.remotePlayers[uid].alive) alive.push(uid);
    }
    return alive;
  }

  // Build placement list sorted by score descending
  buildPlacements(players) {
    const list = [];
    for (const uid of Object.keys(players)) {
      const p = players[uid];
      list.push({
        uid,
        displayName: p.displayName || 'Player',
        score: p.score || 0,
        alive: p.alive !== false,
      });
    }
    // Sort: alive first, then by score descending
    list.sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.score - a.score;
    });
    return list;
  }

  cleanup() {
    this.remotePlayers = {};
    lobby.cleanupFlapListeners();
  }
}
