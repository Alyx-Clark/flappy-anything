export class InputHandler {
  constructor(canvas) {
    this.flapRequested = false;
    this.clickPosition = null;
    this.scrollDelta = 0;
    this.touchStartY = null;
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
      this.touchStartY = e.touches[0].clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.touchStartY !== null) {
        const dy = this.touchStartY - e.touches[0].clientY;
        const scaleY = this.canvas.height / this.canvas.getBoundingClientRect().height;
        this.scrollDelta += dy * scaleY;
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.touchStartY = null;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scrollDelta += e.deltaY;
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

  consumeScroll() {
    const delta = this.scrollDelta;
    this.scrollDelta = 0;
    return delta;
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
