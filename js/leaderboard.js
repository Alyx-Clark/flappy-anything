const PLAYER_NAME_KEY = 'flappy_player_name';
const COOKIE_DAYS = 365;

let db = null;

export function init(firebaseConfig) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
}

// --- Cookie helpers ---

function writeCookie(key, value) {
  const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function readCookie(key) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// --- Dual-write read/write ---

function readValue(key) {
  let value = localStorage.getItem(key);
  const cookieValue = readCookie(key);

  if (value && !cookieValue) {
    // Restore cookie from localStorage
    writeCookie(key, value);
  } else if (!value && cookieValue) {
    // Restore localStorage from cookie
    value = cookieValue;
    localStorage.setItem(key, value);
  }

  return value;
}

function writeValue(key, value) {
  localStorage.setItem(key, value);
  writeCookie(key, value);
}

// --- Player identity ---

function getNameKey() {
  const name = getPlayerName();
  return name ? name.trim().toLowerCase().replace(/[.#$\[\]/]/g, '') : null;
}

export function hasPlayerName() {
  return !!readValue(PLAYER_NAME_KEY);
}

export function getPlayerName() {
  return readValue(PLAYER_NAME_KEY);
}

export function setPlayerName(name) {
  writeValue(PLAYER_NAME_KEY, name);
}

// --- Firebase operations ---

export async function submitScore(score) {
  if (!db) return;
  const name = getPlayerName();
  if (!name) return;
  const key = getNameKey();

  // Refresh cookie on each submit
  writeValue(PLAYER_NAME_KEY, name);

  const ref = db.ref('leaderboard/' + key);
  const snapshot = await ref.once('value');
  const existing = snapshot.val();

  if (!existing || score > existing.score) {
    await ref.set({
      name: name,
      score: score,
      timestamp: Date.now(),
    });
  }
}

export async function fetchTopScores(limit = 50) {
  if (!db) return [];
  const snapshot = await db.ref('leaderboard')
    .orderByChild('score')
    .limitToLast(limit)
    .once('value');

  const scores = [];
  snapshot.forEach((child) => {
    scores.push({
      id: child.key,
      ...child.val(),
    });
  });

  // orderByChild is ascending, reverse for descending
  scores.reverse();
  return scores;
}

export function getCurrentPlayerId() {
  return getNameKey();
}

// Returns 1, 2, 3 for top 3 players, or null
export async function getPlayerRank() {
  if (!db) return null;
  const id = getNameKey();
  const scores = await fetchTopScores(3);
  const index = scores.findIndex(s => s.id === id);
  return index >= 0 ? index + 1 : null;
}
