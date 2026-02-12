import { Bird } from './bird.js';
import { SeededRandom } from './prng.js';
import * as lobby from './lobby.js';
import * as auth from './auth.js';

const STATE_PUSH_INTERVAL = 50; // ms — push y/vel/rot at 20 Hz
const INTERPOLATION_DELAY = 100; // ms — buffer for smooth interpolation

export class MultiplayerSession {
  constructor(seed, localUid) {
    this.rng = new SeededRandom(seed);
    this.localUid = localUid;
    this.remotePlayers = {}; // uid -> { bird, displayName, customization, alive, score, stateBuffer, lastFlapSeq }
    this.gameStartTime = null;
    this.lastStatePush = 0;
    this.spectating = false;
    this.listeners = [];
    this.serverTimeOffset = 0; // local time - server time
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
        stateBuffer: [], // [{ timestamp, y, velocity, rotation }]
        lastFlapSeq: 0,
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
      const p = players[uid];

      // Calibrate server time from our own state echo
      if (uid === this.localUid && p.timestamp !== undefined) {
        this.calibrateServerTime(p.timestamp);
        continue;
      }

      if (uid === this.localUid) continue;

      if (!this.remotePlayers[uid]) continue;

      const rp = this.remotePlayers[uid];
      rp.alive = p.alive !== false;
      rp.score = p.score || 0;

      // Buffer state snapshots with timestamps
      if (p.y !== undefined && p.timestamp !== undefined) {
        // Only add if this is new data (check if last buffered state differs)
        const lastState = rp.stateBuffer[rp.stateBuffer.length - 1];
        if (!lastState || lastState.timestamp !== p.timestamp) {
          rp.stateBuffer.push({
            timestamp: p.timestamp,
            y: p.y,
            velocity: p.velocity || 0,
            rotation: p.rotation || 0,
          });

          // Keep buffer size reasonable (max 1 second of data at 20Hz)
          if (rp.stateBuffer.length > 20) {
            rp.stateBuffer.shift();
          }
        }
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

  // Interpolate remote birds between buffered states
  updateRemoteBirds(dt) {
    const renderTime = this.getServerTime() - INTERPOLATION_DELAY;

    for (const uid of Object.keys(this.remotePlayers)) {
      const rp = this.remotePlayers[uid];
      if (!rp.alive) continue;

      // Find the two states we should interpolate between
      const buffer = rp.stateBuffer;
      if (buffer.length === 0) {
        // No data yet, run local physics as fallback
        rp.bird.update(dt);
        continue;
      }

      if (buffer.length === 1) {
        // Only one state, snap to it
        const state = buffer[0];
        rp.bird.y = state.y;
        rp.bird.velocity = state.velocity;
        rp.bird.rotation = state.rotation;
        continue;
      }

      // Find states before and after render time
      let before = null;
      let after = null;

      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
          before = buffer[i];
          after = buffer[i + 1];
          break;
        }
      }

      if (!before || !after) {
        // Render time is outside buffer range, use closest state
        if (renderTime < buffer[0].timestamp) {
          // Too far behind, snap to oldest
          const state = buffer[0];
          rp.bird.y = state.y;
          rp.bird.velocity = state.velocity;
          rp.bird.rotation = state.rotation;
        } else {
          // Ahead of buffer, snap to newest
          const state = buffer[buffer.length - 1];
          rp.bird.y = state.y;
          rp.bird.velocity = state.velocity;
          rp.bird.rotation = state.rotation;
        }
        continue;
      }

      // Interpolate between before and after
      const totalTime = after.timestamp - before.timestamp;
      const elapsed = renderTime - before.timestamp;
      const t = totalTime > 0 ? elapsed / totalTime : 0;

      rp.bird.y = before.y + (after.y - before.y) * t;
      rp.bird.velocity = before.velocity + (after.velocity - before.velocity) * t;
      rp.bird.rotation = before.rotation + (after.rotation - before.rotation) * t;
    }
  }

  // Calibrate server time offset from our own state echo
  calibrateServerTime(serverTimestamp) {
    if (this.serverTimeOffset === 0 && serverTimestamp) {
      this.serverTimeOffset = Date.now() - serverTimestamp;
    }
  }

  // Get estimated server time
  getServerTime() {
    return Date.now() - this.serverTimeOffset;
  }

  // Push local state to Firebase at 20 Hz
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
