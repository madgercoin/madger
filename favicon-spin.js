(() => {
  const icon = document.getElementById("site-favicon");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    document.querySelectorAll("[data-madger-coin-spin]").forEach(coin => {
      coin.src = "/favicon.png?v=20260829-coin3d";
    });
  }
  if (!icon || reducedMotion) return;

  const frameSize = 64;
  const frameCount = 48;
  const columns = 7;
  const frameDuration = 1000 / 12;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const sprite = new Image();
  canvas.width = frameSize;
  canvas.height = frameSize;

  sprite.addEventListener("load", () => {
    const startedAt = performance.now();
    let previousFrame = -1;
    const animate = now => {
      const frame = Math.floor((now - startedAt) / frameDuration) % frameCount;
      if (frame !== previousFrame) {
        const sourceX = (frame % columns) * frameSize;
        const sourceY = Math.floor(frame / columns) * frameSize;
        context.clearRect(0, 0, frameSize, frameSize);
        context.drawImage(sprite, sourceX, sourceY, frameSize, frameSize, 0, 0, frameSize, frameSize);
        icon.href = canvas.toDataURL("image/png");
        previousFrame = frame;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, { once: true });

  sprite.src = "/madger_coin_spin_sprite.png?v=20260829-360";
})();
