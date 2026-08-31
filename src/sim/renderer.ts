import {
  ANT_LENGTH,
  ANT_WIDTH,
  CELL,
  CELL_COUNT,
  COLONY_COLORS,
  FOOD_COLOR,
  GRID_H,
  GRID_W,
  GROUND,
  MAX_ANTS,
  MODE_TO_HOME,
  MODE_TO_HOME_EMPTY,
  NEST_RADIUS,
  WALL_COLOR,
  WORLD_H,
  WORLD_W,
} from "./constants";
import type { Simulation } from "./simulation";

export class SimRenderer {
  private pher = document.createElement("canvas");
  private pherCtx: CanvasRenderingContext2D;
  private pixels: ImageData;
  private dirt = document.createElement("canvas");

  constructor() {
    this.pher.width = GRID_W;
    this.pher.height = GRID_H;
    const pctx = this.pher.getContext("2d", { alpha: true });
    if (!pctx) throw new Error("2d context");
    this.pherCtx = pctx;
    this.pixels = pctx.createImageData(GRID_W, GRID_H);
    this.dirt.width = 256;
    this.dirt.height = 256;
    this.bakeDirt();
  }

  private bakeDirt() {
    const ctx = this.dirt.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(256, 256);
    const d = img.data;
    for (let i = 0; i < 256 * 256; i++) {
      const n = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const v = (n < 0 ? -n : n) * 10;
      d[i * 4] = GROUND.r + v;
      d[i * 4 + 1] = GROUND.g + v * 0.8;
      d[i * 4 + 2] = GROUND.b + v * 0.5;
      d[i * 4 + 3] = 255;
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
    const pat = ctx.createPattern(this.dirt, "repeat");
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    } else {
      ctx.fillStyle = "#0c0b0a";
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  private drawPheromones(ctx: CanvasRenderingContext2D, sim: Simulation) {
    const { world } = sim;
    const data = this.pixels.data;
    const nCol = sim.colonies.length;
    const inv = 1 / Math.max(1, sim.markerIntensity);
    data.fill(0);

    for (let i = 0; i < CELL_COUNT; i++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let c = 0; c < nCol; c++) {
        const k = c * CELL_COUNT + i;
        const home = world.toHome[k] * inv;
        const food = world.toFood[k] * inv;
        if (home < 0.002 && food < 0.002) continue;
        const col = COLONY_COLORS[c];
        const hs = Math.min(1, Math.sqrt(home) * 1.2);
        const fs = Math.min(1, Math.sqrt(food) * 1.35);
        r += col.r * hs + 36 * fs;
        g += col.g * hs * 0.42 + 210 * fs;
        b += col.b * hs * 0.32 + 70 * fs;
        a += hs * 190 + fs * 210;
      }
      if (a <= 0) continue;
      const o = i * 4;
      data[o] = r > 255 ? 255 : r;
      data[o + 1] = g > 255 ? 255 : g;
      data[o + 2] = b > 255 ? 255 : b;
      data[o + 3] = a > 220 ? 220 : a;
    }

    this.pherCtx.putImageData(this.pixels, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.92;
    ctx.drawImage(this.pher, 0, 0, WORLD_W, WORLD_H);
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
      const s = CELL * (0.7 + t * 0.5);
      const ox = (CELL - s) * 0.5;
      ctx.rect(x + ox, y + ox, s, s);
      foodPath = true;
    }
    if (foodPath) {
      ctx.fillStyle = "rgba(96, 196, 92, 0.35)";
      ctx.fill();
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
      ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.18)`;
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
      ctx.fill();

      ctx.fillStyle = `rgb(${Math.min(255, col.r + 40)},${Math.min(255, col.g + 30)},${Math.min(255, col.b + 20)})`;
      ctx.beginPath();
      for (let i = 0; i < MAX_ANTS; i++) {
        if (!sim.alive[i] || sim.colony[i] !== c) continue;
        if (sim.mode[i] !== MODE_TO_HOME && sim.mode[i] !== MODE_TO_HOME_EMPTY) continue;
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

  screenToWorld(sx: number, sy: number, camX: number, camY: number, zoom: number) {
    return { x: (sx - camX) / zoom, y: (sy - camY) / zoom };
  }
}
