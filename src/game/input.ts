export function attachPointer(canvas: HTMLCanvasElement, onTap: (x: number, y: number) => void): void {
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button > 0) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    onTap(event.clientX - rect.left, event.clientY - rect.top);
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}
