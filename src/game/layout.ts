export interface WellSpot {
  x: number;
  y: number;
  r: number;
}

export interface Layout {
  width: number;
  height: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  cell: number;
  cols: number;
  rows: number;
  well: WellSpot;
}

export function computeLayout(width: number, height: number, cols: number, rows: number): Layout {
  const margin = 10;
  const wellR = Math.max(30, Math.min(46, Math.min(width, height) * 0.075));
  const bottom = wellR * 2.7 + margin;
  const availW = Math.max(cols * 16, width - margin * 2);
  const availH = Math.max(rows * 16, height - margin - bottom);
  const cell = Math.max(16, Math.min(112, Math.floor(Math.min(availW / cols, availH / rows))));
  const gridW = cell * cols;
  const gridH = cell * rows;
  const gridX = Math.floor((width - gridW) / 2);
  const gridY = margin + Math.max(0, Math.floor((height - bottom - margin - gridH) / 2));
  const well: WellSpot = {
    x: margin + wellR + 8,
    y: height - margin - wellR,
    r: wellR,
  };
  return { width, height, gridX, gridY, gridW, gridH, cell, cols, rows, well };
}

export function cellToPx(layout: Layout, cx: number, cy: number): { x: number; y: number } {
  return {
    x: layout.gridX + cx * layout.cell,
    y: layout.gridY + cy * layout.cell,
  };
}

export function cellAt(layout: Layout, x: number, y: number): { c: number; r: number } | null {
  const c = Math.floor((x - layout.gridX) / layout.cell);
  const r = Math.floor((y - layout.gridY) / layout.cell);
  if (c < 0 || r < 0 || c >= layout.cols || r >= layout.rows) return null;
  return { c, r };
}
