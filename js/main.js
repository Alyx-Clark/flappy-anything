import { Game } from './game.js';
import { InputHandler } from './input.js';
import { init as initAuth } from './auth.js';
import { init as initLeaderboard } from './leaderboard.js';
import { init as initLobby } from './lobby.js';

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAIMw5GMh44u9BkHs5j4CTH0mhfvmcwyjw",
  authDomain: "flappy-anything.firebaseapp.com",
  projectId: "flappy-anything",
  storageBucket: "flappy-anything.firebasestorage.app",
  messagingSenderId: "472537046550",
  appId: "1:472537046550:web:e1c9773a24ac7e6f0bdf37",
  measurementId: "G-WD71JLLYC5"
};

firebase.initializeApp(firebaseConfig);
initAuth();
initLeaderboard();
initLobby();

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const aspect = canvas.width / canvas.height;

  let w, h;
  if (maxW / maxH < aspect) {
    w = maxW;
    h = maxW / aspect;
  } else {
    h = maxH;
    w = maxH * aspect;
  }

  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const input = new InputHandler(canvas);
const game = new Game(canvas, ctx, input);
game.start();
