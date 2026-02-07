const STORAGE_KEY = 'flappy_anything_scores';
const COOKIE_NAME = 'flappy_anything_scores';
const COOKIE_DAYS = 365;

function writeToLocalStorage(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (e) {
    // Silently fail (private browsing, quota exceeded)
  }
}

function readFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeToCookie(scores) {
  const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(scores))}; expires=${expires}; path=/; SameSite=Lax`;
}

function readFromCookie() {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)')
  );
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch (e) {
    return null;
  }
}

function loadAllScores() {
  let data = readFromLocalStorage();
  if (!data) {
    data = readFromCookie();
  }
  return data || {};
}

export function saveScore(themeId, score) {
  const scores = loadAllScores();
  if (!scores[themeId] || score > scores[themeId]) {
    scores[themeId] = score;
    writeToLocalStorage(scores);
    writeToCookie(scores);
  }
}

export function getHighScore(themeId) {
  const scores = loadAllScores();
  return scores[themeId] || 0;
}
