export class Field {
  readonly growth: Float32Array;
  readonly reserved: Uint8Array;

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    this.growth = new Float32Array(cols * rows);
    this.reserved = new Uint8Array(cols * rows);
  }

  index(c: number, r: number): number {
    return r * this.cols + c;
  }

  inBounds(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows;
  }

  growthAt(c: number, r: number): number {
    if (!this.inBounds(c, r)) return 0;
    return this.growth[this.index(c, r)];
  }

  plant(c: number, r: number): boolean {
    if (!this.inBounds(c, r)) return false;
    const i = this.index(c, r);
    if (this.growth[i] > 0) return false;
    this.growth[i] = 0.08;
    return true;
  }

  update(dt: number): void {
    for (let i = 0; i < this.growth.length; i++) {
      if (this.growth[i] > 0 && this.growth[i] < 1) {
        this.growth[i] = Math.min(1, this.growth[i] + dt * 1.35);
      }
    }
  }

  isClaimable(c: number, r: number): boolean {
    if (!this.inBounds(c, r)) return false;
    const i = this.index(c, r);
    return this.growth[i] > 0 && this.reserved[i] === 0;
  }

  reserve(c: number, r: number): void {
    if (!this.inBounds(c, r)) return;
    this.reserved[this.index(c, r)] = 1;
  }

  release(c: number, r: number): void {
    if (!this.inBounds(c, r)) return;
    this.reserved[this.index(c, r)] = 0;
  }

  consume(c: number, r: number): void {
    if (!this.inBounds(c, r)) return;
    const i = this.index(c, r);
    this.growth[i] = 0;
    this.reserved[i] = 0;
  }

  nearestClaimable(cx: number, cy: number): { c: number; r: number } | null {
    let best: { c: number; r: number } | null = null;
    let bestD = Infinity;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.isClaimable(c, r)) continue;
        const dx = c + 0.5 - cx;
        const dy = r + 0.5 - cy;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { c, r };
        }
      }
    }
    return best;
  }
}
