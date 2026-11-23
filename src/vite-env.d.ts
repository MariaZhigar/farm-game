/// <reference types="vite/client" />

interface FarmDebug {
  snapshot: () => import('./game/Game').FarmSnapshot;
  pointer: (x: number, y: number) => void;
  advance: (seconds: number) => void;
}

interface Window {
  __farm?: FarmDebug;
}
