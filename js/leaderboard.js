import * as auth from './auth.js';

const PLAYER_NAME_KEY = 'flappy_player_name';

let db = null;

export function init() {
  db = firebase.database();
}

// --- Stored local name (for migration) ---

export function getStoredLocalName() {
  return localStorage.getItem(PLAYER_NAME_KEY);
}

// --- Firebase operations ---

export async function submitScore(score) {
  if (!db) return;
  if (!auth.isSignedIn()) return;

  const user = auth.getCurrentUser();
  const ref = db.ref('leaderboard/' + user.uid);
  const snapshot = await ref.once('value');
  const existing = snapshot.val();

  if (!existing || score > existing.score) {
    await ref.set({
      displayName: user.displayName,
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
    const val = child.val();
    scores.push({
      id: child.key,
      name: val.displayName || val.name,
      score: val.score,
      timestamp: val.timestamp,
    });
  });

  // orderByChild is ascending, reverse for descending
  scores.reverse();
  return scores;
}

export function getCurrentPlayerId() {
  if (!auth.isSignedIn()) return null;
  return auth.getCurrentUser().uid;
}

// Returns 1, 2, 3 for top 3 players, or null
export async function getPlayerRank() {
  if (!db) return null;
  if (!auth.isSignedIn()) return null;
  const id = auth.getCurrentUser().uid;
  const scores = await fetchTopScores(3);
  const index = scores.findIndex(s => s.id === id);
  return index >= 0 ? index + 1 : null;
}

// Migrate old name-keyed entry to UID-keyed entry
export async function migrateNameEntryToUid(uid, displayName) {
  if (!db) return;
  const nameKey = displayName.trim().toLowerCase().replace(/[.#$\[\]/]/g, '');
  if (!nameKey) return;

  const oldRef = db.ref('leaderboard/' + nameKey);
  const snapshot = await oldRef.once('value');
  const oldEntry = snapshot.val();
  if (!oldEntry) return;

  // Check if UID entry already exists
  const newRef = db.ref('leaderboard/' + uid);
  const newSnapshot = await newRef.once('value');
  const newEntry = newSnapshot.val();

  // Keep the higher score
  const bestScore = newEntry ? Math.max(oldEntry.score, newEntry.score) : oldEntry.score;

  await newRef.set({
    displayName: displayName,
    score: bestScore,
    timestamp: Date.now(),
  });

  // Remove old name-keyed entry
  await oldRef.remove();
}
