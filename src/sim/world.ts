import {
  CELL,
  CELL_COUNT,
  GRID_H,
  GRID_W,
  MARKER_INTENSITY,
  MAX_COLONIES,
  WORLD_H,
  WORLD_W,
} from "./constants";

export class World {
  readonly wall = new Uint8Array(CELL_COUNT);
  readonly food = new Uint16Array(CELL_COUNT);
  readonly wallDist = new Float32Array(CELL_COUNT);
  readonly toHome = new Float32Array(MAX_COLONIES * CELL_COUNT);
  readonly toFood = new Float32Array(MAX_COLONIES * CELL_COUNT);
  readonly repellent = new Float32Array(MAX_COLONIES * CELL_COUNT);
  readonly nestMask = new Uint8Array(MAX_COLONIES * CELL_COUNT);
  readonly occupancy = new Int32Array(MAX_COLONIES * CELL_COUNT);

  constructor() {
    this.wallDist.fill(1);
    this.occupancy.fill(-1);
    this.buildBorder();
  }

  reset() {
    this.wall.fill(0);
    this.food.fill(0);
    this.wallDist.fill(1);
    this.toHome.fill(0);
    this.toFood.fill(0);
    this.repellent.fill(0);
    this.nestMask.fill(0);
    this.occupancy.fill(-1);
    this.buildBorder();
  }

  buildBorder() {
    for (let x = 0; x < GRID_W; x++) {
      this.setWall(x, 0, true);
      this.setWall(x, GRID_H - 1, true);
    }
    for (let y = 0; y < GRID_H; y++) {
      this.setWall(0, y, true);
      this.setWall(GRID_W - 1, y, true);
    }
    this.recomputeWallDist();
  }

  index(cx: number, cy: number) {
    return cy * GRID_W + cx;
  }

  inBounds(cx: number, cy: number) {
    return cx >= 0 && cy >= 0 && cx < GRID_W && cy < GRID_H;
  }

  cellAt(x: number, y: number) {
    const cx = (x / CELL) | 0;
    const cy = (y / CELL) | 0;
    if (!this.inBounds(cx, cy)) return -1;
    return this.index(cx, cy);
  }

  setWall(cx: number, cy: number, on: boolean) {
    if (!this.inBounds(cx, cy)) return;
    const i = this.index(cx, cy);
    this.wall[i] = on ? 1 : 0;
    if (on) {
      this.food[i] = 0;
      for (let c = 0; c < MAX_COLONIES; c++) {
        const k = c * CELL_COUNT + i;
        this.toHome[k] = 0;
        this.toFood[k] = 0;
        this.repellent[k] = 0;
      }
    }
  }

  addFood(cx: number, cy: number, qty: number) {
    if (!this.inBounds(cx, cy)) return;
    const i = this.index(cx, cy);
    if (this.wall[i]) return;
    this.food[i] = Math.min(65000, this.food[i] + qty);
  }

  paintDisk(wx: number, wy: number, radius: number, fn: (cx: number, cy: number) => void) {
    const cr = Math.ceil(radius / CELL);
    const cx0 = (wx / CELL) | 0;
    const cy0 = (wy / CELL) | 0;
    const r2 = radius * radius;
    for (let dy = -cr; dy <= cr; dy++) {
      for (let dx = -cr; dx <= cr; dx++) {
        const x = (cx0 + dx) * CELL + CELL * 0.5;
        const y = (cy0 + dy) * CELL + CELL * 0.5;
        const ddx = x - wx;
        const ddy = y - wy;
        if (ddx * ddx + ddy * ddy <= r2) fn(cx0 + dx, cy0 + dy);
      }
    }
  }

  markNest(col: number, x: number, y: number, radius: number) {
    const r2 = radius * radius;
    const cx0 = (x / CELL) | 0;
    const cy0 = (y / CELL) | 0;
    const cr = Math.ceil(radius / CELL) + 1;
    for (let dy = -cr; dy <= cr; dy++) {
      for (let dx = -cr; dx <= cr; dx++) {
        const cx = cx0 + dx;
        const cy = cy0 + dy;
        if (!this.inBounds(cx, cy)) continue;
        const px = cx * CELL + CELL * 0.5 - x;
        const py = cy * CELL + CELL * 0.5 - y;
        if (px * px + py * py <= r2) {
          const i = this.index(cx, cy);
          this.nestMask[col * CELL_COUNT + i] = 1;
          this.toHome[col * CELL_COUNT + i] = MARKER_INTENSITY;
        }
      }
    }
  }

  addMarker(col: number, i: number, toFood: boolean, intensity: number) {
    if (i < 0) return;
    const k = col * CELL_COUNT + i;
    if (toFood) this.toFood[k] = Math.max(this.toFood[k], intensity);
    else this.toHome[k] = Math.max(this.toHome[k], intensity);
  }

  evaporate(dt: number, colonyCount = MAX_COLONIES) {
    const n = CELL_COUNT;
    const cols = Math.min(colonyCount, MAX_COLONIES);
    for (let c = 0; c < cols; c++) {
      const off = c * n;
      for (let i = 0; i < n; i++) {
        const k = off + i;
        if (!this.nestMask[k]) {
          const h = this.toHome[k] - dt;
          this.toHome[k] = h > 0 ? h : 0;
        }
        const f = this.toFood[k] - dt;
        this.toFood[k] = f > 0 ? f : 0;
        const r = this.repellent[k] - dt;
        this.repellent[k] = r > 0 ? r : 0;
      }
    }
  }

  recomputeWallDist() {
    const { wall, wallDist } = this;
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const i = this.index(x, y);
        if (wall[i]) {
          wallDist[i] = 0;
          continue;
        }
        let min = 4;
        for (let dy = -4; dy <= 4 && min > 0; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (!this.inBounds(nx, ny)) continue;
            if (wall[this.index(nx, ny)]) {
              const d = Math.hypot(dx, dy);
              if (d < min) min = d;
            }
          }
        }
        wallDist[i] = Math.min(1, min / 4);
      }
    }
  }

  refreshWallDistAround(wx: number, wy: number, radius: number) {
    const pad = 6;
    const cr = Math.ceil(radius / CELL) + pad;
    const cx0 = (wx / CELL) | 0;
    const cy0 = (wy / CELL) | 0;
    for (let dy = -cr; dy <= cr; dy++) {
      for (let dx = -cr; dx <= cr; dx++) {
        const x = cx0 + dx;
        const y = cy0 + dy;
        if (!this.inBounds(x, y)) continue;
        const i = this.index(x, y);
        if (this.wall[i]) {
          this.wallDist[i] = 0;
          continue;
        }
        let min = 4;
        for (let oy = -4; oy <= 4 && min > 0; oy++) {
          for (let ox = -4; ox <= 4; ox++) {
            const nx = x + ox;
            const ny = y + oy;
            if (!this.inBounds(nx, ny)) continue;
            if (this.wall[this.index(nx, ny)]) {
              const d = Math.hypot(ox, oy);
              if (d < min) min = d;
            }
          }
        }
        this.wallDist[i] = Math.min(1, min / 4);
      }
    }
  }

  rayHitsWall(x0: number, y0: number, x1: number, y1: number) {
    const steps = 5;
    const dx = (x1 - x0) / steps;
    const dy = (y1 - y0) / steps;
    for (let s = 1; s <= steps; s++) {
      const i = this.cellAt(x0 + dx * s, y0 + dy * s);
      if (i < 0 || this.wall[i]) return true;
    }
    return false;
  }

  worldSize() {
    return { w: WORLD_W, h: WORLD_H };
  }
}
