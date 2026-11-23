export function startLoop(step: (dt: number) => void): () => void {
  let last = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    step(dt);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
