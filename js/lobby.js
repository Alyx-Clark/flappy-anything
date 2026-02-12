import * as auth from './auth.js';

let db = null;
let currentLobbyCode = null;
let currentLobbyListeners = [];
let flapListeners = [];

// Characters that avoid ambiguity (no 0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function init() {
  db = firebase.database();
}

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function lobbyRef(code) {
  return db.ref('lobbies/' + code);
}

// --- Create / Join / Leave ---

export async function createLobby(themeId, customization) {
  if (!db || !auth.isSignedIn()) return null;
  const user = auth.getCurrentUser();

  // Try up to 5 codes to avoid collision
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const ref = lobbyRef(code);
    const snap = await ref.child('meta').once('value');
    if (snap.exists()) continue;

    const seed = Math.floor(Math.random() * 2147483647);
    await ref.child('meta').set({
      hostUid: user.uid,
      themeId: themeId,
      status: 'waiting',
      seed: seed,
      startTime: null,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
    });

    await joinLobbyInternal(code, user, customization);
    currentLobbyCode = code;
    return code;
  }
  return null;
}

export async function joinLobby(code, customization) {
  if (!db || !auth.isSignedIn()) return false;
  code = code.toUpperCase().trim();

  const metaSnap = await lobbyRef(code).child('meta').once('value');
  if (!metaSnap.exists()) return false;

  const meta = metaSnap.val();
  if (meta.status !== 'waiting') return false;

  // Check player count
  const playersSnap = await lobbyRef(code).child('players').once('value');
  const count = playersSnap.numChildren();
  if (count >= 8) return false;

  const user = auth.getCurrentUser();
  await joinLobbyInternal(code, user, customization);
  currentLobbyCode = code;
  return true;
}

async function joinLobbyInternal(code, user, customization) {
  const playerRef = lobbyRef(code).child('players/' + user.uid);
  await playerRef.set({
    displayName: user.displayName || 'Player',
    customization: customization || null,
    alive: true,
    score: 0,
    y: 300,
    velocity: 0,
    rotation: 0,
    connected: true,
    flapSeq: 0,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  // Set up disconnect detection
  playerRef.child('connected').onDisconnect().set(false);
}

export async function leaveLobby() {
  if (!db || !currentLobbyCode || !auth.isSignedIn()) return;
  const user = auth.getCurrentUser();
  const code = currentLobbyCode;

  // Remove listeners
  cleanupListeners();

  // Remove player
  await lobbyRef(code).child('players/' + user.uid).remove();

  // If host left and lobby is still waiting, check if empty
  const metaSnap = await lobbyRef(code).child('meta').once('value');
  const meta = metaSnap.val();
  if (meta) {
    const playersSnap = await lobbyRef(code).child('players').once('value');
    if (!playersSnap.exists() || playersSnap.numChildren() === 0) {
      // No players left, remove lobby
      await lobbyRef(code).remove();
    } else if (meta.hostUid === user.uid) {
      // Transfer host to first remaining player
      let newHostUid = null;
      playersSnap.forEach((child) => {
        if (!newHostUid) newHostUid = child.key;
      });
      if (newHostUid) {
        await lobbyRef(code).child('meta/hostUid').set(newHostUid);
      }
    }
  }

  currentLobbyCode = null;
}

// --- Host controls ---

export async function setLobbyTheme(themeId) {
  if (!db || !currentLobbyCode) return;
  await lobbyRef(currentLobbyCode).child('meta/themeId').set(themeId);
}

export async function startGame() {
  if (!db || !currentLobbyCode) return;
  const code = currentLobbyCode;

  // Set start time (countdown reference point)
  // All clients use this to sync the countdown
  const serverTime = firebase.database.ServerValue.TIMESTAMP;
  await lobbyRef(code).child('meta').update({
    status: 'countdown',
    startTime: serverTime,
  });
}

export async function setLobbyPlaying() {
  if (!db || !currentLobbyCode) return;
  await lobbyRef(currentLobbyCode).child('meta/status').set('playing');
}

// --- In-game reporting ---

export function reportFlap(timeOffset) {
  if (!db || !currentLobbyCode || !auth.isSignedIn()) return;
  const user = auth.getCurrentUser();
  const playerRef = lobbyRef(currentLobbyCode).child('players/' + user.uid);

  // Increment flapSeq and push flap event
  playerRef.child('flapSeq').transaction((seq) => (seq || 0) + 1);
  playerRef.child('flaps').push({ t: timeOffset });
}

export function reportState(y, velocity, rotation, score) {
  if (!db || !currentLobbyCode || !auth.isSignedIn()) return;
  const user = auth.getCurrentUser();
  lobbyRef(currentLobbyCode).child('players/' + user.uid).update({
    y, velocity, rotation, score,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
}

export async function reportCrash(score) {
  if (!db || !currentLobbyCode || !auth.isSignedIn()) return;
  const user = auth.getCurrentUser();
  await lobbyRef(currentLobbyCode).child('players/' + user.uid).update({
    alive: false,
    score: score,
  });
}

export async function finishGame() {
  if (!db || !currentLobbyCode) return;
  await lobbyRef(currentLobbyCode).child('meta/status').set('finished');
}

// --- Listeners ---

export function onLobbyChange(callback) {
  if (!db || !currentLobbyCode) return;
  const code = currentLobbyCode;

  // Listen to meta changes
  const metaRef = lobbyRef(code).child('meta');
  const metaCb = metaRef.on('value', (snap) => {
    callback('meta', snap.val());
  });
  currentLobbyListeners.push({ ref: metaRef, event: 'value', cb: metaCb });

  // Listen to player changes
  const playersRef = lobbyRef(code).child('players');
  const playersCb = playersRef.on('value', (snap) => {
    const players = {};
    snap.forEach((child) => {
      players[child.key] = child.val();
    });
    callback('players', players);
  });
  currentLobbyListeners.push({ ref: playersRef, event: 'value', cb: playersCb });
}

export function onRemoteFlaps(uid, callback) {
  if (!db || !currentLobbyCode) return;
  const flapsRef = lobbyRef(currentLobbyCode).child('players/' + uid + '/flaps');
  const cb = flapsRef.on('child_added', (snap) => {
    callback(snap.val());
  });
  flapListeners.push({ ref: flapsRef, event: 'child_added', cb });
}

function cleanupListeners() {
  for (const { ref, event, cb } of currentLobbyListeners) {
    ref.off(event, cb);
  }
  currentLobbyListeners = [];
}

export function cleanupFlapListeners() {
  for (const { ref, event, cb } of flapListeners) {
    ref.off(event, cb);
  }
  flapListeners = [];
}

export function cleanup() {
  cleanupListeners();
  cleanupFlapListeners();
  currentLobbyCode = null;
}

export async function resetForRematch() {
  if (!db || !currentLobbyCode || !auth.isSignedIn()) return;
  const user = auth.getCurrentUser();
  const playerRef = lobbyRef(currentLobbyCode).child('players/' + user.uid);
  await playerRef.update({
    alive: true,
    score: 0,
    y: 300,
    velocity: 0,
    rotation: 0,
    flapSeq: 0,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });
  await playerRef.child('flaps').remove();
}

export async function resetLobbyForRematch() {
  if (!db || !currentLobbyCode) return;
  const seed = Math.floor(Math.random() * 2147483647);
  await lobbyRef(currentLobbyCode).child('meta').update({
    status: 'waiting',
    startTime: null,
    seed: seed,
  });
}

export function getCurrentCode() {
  return currentLobbyCode;
}
