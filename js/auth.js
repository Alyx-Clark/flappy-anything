let auth = null;
const listeners = [];

export function init() {
  auth = firebase.auth();
  auth.onAuthStateChanged((user) => {
    for (const cb of listeners) {
      cb(user);
    }
  });
}

export function isSignedIn() {
  return !!auth && !!auth.currentUser;
}

export function getCurrentUser() {
  if (!auth || !auth.currentUser) return null;
  const u = auth.currentUser;
  return { uid: u.uid, email: u.email, displayName: u.displayName };
}

export function getDisplayName() {
  const user = getCurrentUser();
  return user ? user.displayName : null;
}

export function onAuthChange(callback) {
  listeners.push(callback);
  // Fire immediately with current state
  if (auth) {
    callback(auth.currentUser);
  }
}

export async function signUp(email, password, displayName) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName });
  // Force listener refresh after profile update
  for (const cb of listeners) {
    cb(cred.user);
  }
  return cred.user;
}

export async function signIn(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

export async function signOut() {
  await auth.signOut();
}

export async function resetPassword(email) {
  await auth.sendPasswordResetEmail(email);
}
