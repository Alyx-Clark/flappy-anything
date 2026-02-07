export class InputHandler {
  constructor(canvas) {
    this.flapRequested = false;
    this.clickPosition = null;
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.flapRequested = true;
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      this.flapRequested = true;
      this.clickPosition = this.getCanvasPosition(e);
    });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.flapRequested = true;
      this.clickPosition = this.getCanvasPosition(e.touches[0]);
    }, { passive: false });
  }

  consumeFlap() {
    const flap = this.flapRequested;
    this.flapRequested = false;
    return flap;
  }

  consumeClick() {
    const pos = this.clickPosition;
    this.clickPosition = null;
    return pos;
  }

  getCanvasPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }
}
