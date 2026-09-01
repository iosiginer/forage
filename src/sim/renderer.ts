import {
  ANT_LENGTH,
  ANT_WIDTH,
  CELL,
  CELL_COUNT,
  COLONY_COLORS,
  FOOD_COLOR,
  GRID_H,
  GRID_W,
  MAX_ANTS,
  MODE_TO_HOME,
  MODE_TO_HOME_EMPTY,
  NEST_RADIUS,
  WALL_COLOR,
  WORLD_H,
  WORLD_W,
} from "./constants";
import type { Simulation } from "./simulation";

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0);
  const b = hash2(x0 + 1, y0);
  const c = hash2(x0, y0 + 1);
  const d = hash2(x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export class SimRenderer {
  private pher = document.createElement("canvas");
  private pherCtx: CanvasRenderingContext2D;
  private pherSoft = document.createElement("canvas");
  private pherSoftCtx: CanvasRenderingContext2D;
  private pixels: ImageData;
  private dirt = document.createElement("canvas");

  constructor() {
    this.pher.width = GRID_W;
    this.pher.height = GRID_H;
    const pctx = this.pher.getContext("2d", { alpha: true, willReadFrequently: true });
    if (!pctx) throw new Error("2d context");
    this.pherCtx = pctx;
    this.pixels = pctx.createImageData(GRID_W, GRID_H);

    this.pherSoft.width = GRID_W;
    this.pherSoft.height = GRID_H;
    const sctx = this.pherSoft.getContext("2d", { alpha: true });
    if (!sctx) throw new Error("2d context");
    this.pherSoftCtx = sctx;

    this.dirt.width = 800;
    this.dirt.height = 450;
    this.bakeDirt();
  }

  private bakeDirt() {
    const ctx = this.dirt.getContext("2d");
    if (!ctx) return;
    const w = this.dirt.width;
    const h = this.dirt.height;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n =
          valueNoise(x * 0.018, y * 0.018) * 0.55 +
          valueNoise(x * 0.055, y * 0.055) * 0.3 +
          valueNoise(x * 0.13, y * 0.13) * 0.15;
        const v = (n - 0.5) * 11;
        const i = (y * w + x) * 4;
        d[i] = 22 + v;
        d[i + 1] = 18 + v * 0.72;
        d[i + 2] = 14 + v * 0.4;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    sim: Simulation,
    camX: number,
    camY: number,
    zoom: number,
    dpr: number,
    cssW: number,
    cssH: number,
  ) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0c0b0a";
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, camX * dpr, camY * dpr);

    this.drawGround(ctx);
    if (sim.showMarkers) this.drawPheromones(ctx, sim);
    this.drawWallsAndFood(ctx, sim);
    this.drawNests(ctx, sim);
    if (sim.showAnts) this.drawAnts(ctx, sim);
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this.dirt, 0, 0, WORLD_W, WORLD_H);
  }

  private drawPheromones(ctx: CanvasRenderingContext2D, sim: Simulation) {
    const { world } = sim;
    const data = this.pixels.data;
    const nCol = sim.colonies.length;
    const inv = 1 / Math.max(1, sim.markerIntensity);
    data.fill(0);

    for (let i = 0; i < CELL_COUNT; i++) {
      let wr = 0;
      let wg = 0;
      let wb = 0;
      let wsum = 0;
      for (let c = 0; c < nCol; c++) {
        const k = c * CELL_COUNT + i;
        const home = world.toHome[k] * inv;
        const food = world.toFood[k] * inv;
        if (home < 0.004 && food < 0.004) continue;
        const col = COLONY_COLORS[c];
        const nest = world.nestMask[k];
        const hs = nest ? Math.min(0.18, Math.pow(home, 0.62) * 0.18) : Math.min(1, Math.pow(home, 0.62));
        const fs = Math.min(1, Math.pow(food, 0.62));
        const hw = hs * 0.58;
        const fw = fs * 0.64;
        if (hw + fw <= 0) continue;
        wr += col.r * hw + 58 * fw;
        wg += col.g * 0.78 * hw + 148 * fw;
        wb += col.b * 0.62 * hw + 52 * fw;
        wsum += hw + fw;
      }
      if (wsum < 0.006) continue;
      const o = i * 4;
      data[o] = Math.min(255, wr / wsum);
      data[o + 1] = Math.min(255, wg / wsum);
      data[o + 2] = Math.min(255, wb / wsum);
      data[o + 3] = Math.min(175, wsum * 300);
    }

    this.pherCtx.putImageData(this.pixels, 0, 0);
    this.pherSoftCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.pherSoftCtx.clearRect(0, 0, GRID_W, GRID_H);
    this.pherSoftCtx.imageSmoothingEnabled = true;
    this.pherSoftCtx.imageSmoothingQuality = "high";
    this.pherSoftCtx.filter = "blur(1.35px)";
    this.pherSoftCtx.drawImage(this.pher, 0, 0);
    this.pherSoftCtx.filter = "none";

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.9;
    ctx.drawImage(this.pherSoft, 0, 0, WORLD_W, WORLD_H);
    ctx.restore();
  }

  private drawWallsAndFood(ctx: CanvasRenderingContext2D, sim: Simulation) {
    const { wall, food } = sim.world;
    ctx.beginPath();
    let wallPath = false;
    for (let i = 0; i < CELL_COUNT; i++) {
      if (!wall[i]) continue;
      const x = (i % GRID_W) * CELL;
      const y = ((i / GRID_W) | 0) * CELL;
      ctx.rect(x, y, CELL + 0.4, CELL + 0.4);
      wallPath = true;
    }
    if (wallPath) {
      ctx.fillStyle = `rgb(${WALL_COLOR.r},${WALL_COLOR.g},${WALL_COLOR.b})`;
      ctx.fill();
    }

    ctx.beginPath();
    let foodPath = false;
    for (let i = 0; i < CELL_COUNT; i++) {
      if (food[i] <= 0 || wall[i]) continue;
      const x = (i % GRID_W) * CELL;
      const y = ((i / GRID_W) | 0) * CELL;
      const t = Math.min(1, food[i] / 40);
      const s = CELL * (0.55 + t * 0.4);
      const ox = (CELL - s) * 0.5;
      ctx.rect(x + ox, y + ox, s, s);
      foodPath = true;
    }
    if (foodPath) {
      ctx.fillStyle = `rgb(${FOOD_COLOR.r},${FOOD_COLOR.g},${FOOD_COLOR.b})`;
      ctx.fill();
    }
  }

  private drawNests(ctx: CanvasRenderingContext2D, sim: Simulation) {
    for (let c = 0; c < sim.colonies.length; c++) {
      const nest = sim.colonies[c];
      const col = COLONY_COLORS[c];
      ctx.save();
      ctx.translate(nest.x, nest.y);
      ctx.beginPath();
      ctx.arc(0, 0, NEST_RADIUS + 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.16)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, NEST_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${(col.r * 0.45) | 0},${(col.g * 0.4) | 0},${(col.b * 0.35) | 0})`;
      ctx.fill();
      ctx.strokeStyle = `rgb(${col.r},${col.g},${col.b})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, NEST_RADIUS * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = "#070605";
      ctx.fill();
      ctx.restore();
    }
  }

  private drawAnts(ctx: CanvasRenderingContext2D, sim: Simulation) {
    const halfL = ANT_LENGTH * 0.5;
    const halfW = ANT_WIDTH * 0.5;
    for (let c = 0; c < sim.colonies.length; c++) {
      const col = COLONY_COLORS[c];
      ctx.fillStyle = `rgb(${col.r},${col.g},${col.b})`;
      ctx.beginPath();
      for (let i = 0; i < MAX_ANTS; i++) {
        if (!sim.alive[i] || sim.colony[i] !== c) continue;
        if (sim.mode[i] === MODE_TO_HOME || sim.mode[i] === MODE_TO_HOME_EMPTY) continue;
        this.antQuad(ctx, sim, i, halfL, halfW);
      }
      ctx.fill();

      ctx.fillStyle = `rgb(${Math.min(255, col.r + 40)},${Math.min(255, col.g + 30)},${Math.min(255, col.b + 20)})`;
      ctx.beginPath();
      for (let i = 0; i < MAX_ANTS; i++) {
        if (!sim.alive[i] || sim.colony[i] !== c) continue;
        if (sim.mode[i] !== MODE_TO_HOME && sim.mode[i] !== MODE_TO_HOME_EMPTY) continue;
        this.antQuad(ctx, sim, i, halfL, halfW);
      }
      ctx.fill();
    }

    ctx.fillStyle = `rgb(${FOOD_COLOR.r},${FOOD_COLOR.g},${FOOD_COLOR.b})`;
    ctx.beginPath();
    for (let i = 0; i < MAX_ANTS; i++) {
      if (!sim.alive[i]) continue;
      if (sim.mode[i] !== MODE_TO_HOME && sim.mode[i] !== MODE_TO_HOME_EMPTY) continue;
      const a = sim.angle[i];
      const px = sim.x[i] + Math.cos(a) * ANT_LENGTH * 0.55;
      const py = sim.y[i] + Math.sin(a) * ANT_LENGTH * 0.55;
      ctx.rect(px - 1.1, py - 1.1, 2.2, 2.2);
    }
    ctx.fill();
  }

  private antQuad(
    ctx: CanvasRenderingContext2D,
    sim: Simulation,
    i: number,
    halfL: number,
    halfW: number,
  ) {
    const a = sim.angle[i];
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const px = sim.x[i];
    const py = sim.y[i];
    const fx = cos * halfL;
    const fy = sin * halfL;
    const rx = -sin * halfW;
    const ry = cos * halfW;
    ctx.moveTo(px + fx + rx, py + fy + ry);
    ctx.lineTo(px + fx - rx, py + fy - ry);
    ctx.lineTo(px - fx - rx, py - fy - ry);
    ctx.lineTo(px - fx + rx, py - fy + ry);
  }

  screenToWorld(sx: number, sy: number, camX: number, camY: number, zoom: number) {
    return { x: (sx - camX) / zoom, y: (sy - camY) / zoom };
  }
}
