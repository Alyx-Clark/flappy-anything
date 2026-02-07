import { Game } from './game.js';
import { InputHandler } from './input.js';

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
