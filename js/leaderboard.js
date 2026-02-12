import * as auth from './auth.js';
import { saveScore, loadAllScores, clearScores } from './storage.js';

const PLAYER_NAME_KEY = 'flappy_player_name';

let db = null;

export function init() {
  db = firebase.database();
}

// --- Stored local name (for migration) ---

export function getStoredLocalName() {
  return localStorage.getItem(PLAYER_NAME_KEY);
}

// --- Score management ---

export function clearLocalScores() {
  clearScores();
}

export async function submitScore(themeId, score) {
  if (!db) return;
  if (!auth.isSignedIn()) return;

  const user = auth.getCurrentUser();
  const ref = db.ref('leaderboard/' + user.uid);
  const snapshot = await ref.once('value');
  const existing = snapshot.val() || {};

  const existingScores = existing.scores || {};
  const oldThemeScore = existingScores[themeId] || 0;

  if (score <= oldThemeScore) return;

  // Update this theme's score
  existingScores[themeId] = score;

  // Compute best across all themes
  let best = 0;
  for (const id in existingScores) {
    if (existingScores[id] > best) best = existingScores[id];
  }

  await ref.set({
    displayName: user.displayName,
    score: best,
    timestamp: Date.now(),
    scores: existingScores,
  });
}

// Sync all local theme scores up to Firebase and pull remote scores down to localStorage
export async function syncScores() {
  if (!db) return;
  if (!auth.isSignedIn()) return;

  const user = auth.getCurrentUser();
  // Skip if displayName isn't set yet (e.g. during sign-up before updateProfile)
  if (!user.displayName) return;
  const ref = db.ref('leaderboard/' + user.uid);
  const snapshot = await ref.once('value');
  const existing = snapshot.val() || {};

  const remoteScores = existing.scores || {};
  const localScores = loadAllScores();

  // Merge: take the max of local and remote for each theme
  const merged = { ...remoteScores };
  let changed = false;
  for (const themeId in localScores) {
    const local = localScores[themeId];
    const remote = merged[themeId] || 0;
    if (local > remote) {
      merged[themeId] = local;
      changed = true;
    }
  }

  // Sync remote scores down to localStorage
  for (const themeId in merged) {
    saveScore(themeId, merged[themeId]);
  }

  // Preserve the existing top-level score if it's higher than anything in the
  // merged per-theme map (handles migration from old format without a scores map)
  const existingBest = existing.score || 0;
  let best = existingBest;
  for (const id in merged) {
    if (merged[id] > best) best = merged[id];
  }

  // Push merged scores up if anything changed
  if (changed || best !== existingBest || !existing.scores) {
    await ref.set({
      displayName: user.displayName,
      score: best,
      timestamp: Date.now(),
      scores: merged,
    });
  }

  return merged;
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

  const existingScores = (newEntry && newEntry.scores) || {};

  await newRef.set({
    displayName: displayName,
    score: bestScore,
    timestamp: Date.now(),
    scores: existingScores,
  });

  // Remove old name-keyed entry
  await oldRef.remove();
}
