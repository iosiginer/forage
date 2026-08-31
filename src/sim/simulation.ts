import {
  ANT_COST,
  CELL,
  CELL_COUNT,
  DETECT_DIST,
  DIR_NOISE,
  DIR_PERIOD,
  FOOD_PER_CELL,
  HIT_LIMIT,
  MARKER_DECAY,
  MARKER_INTENSITY,
  MARKER_PERIOD,
  MAX_ANTS,
  MAX_AUTONOMY,
  MAX_COLONIES,
  MODE_TO_FOOD,
  MODE_TO_HOME,
  MODE_TO_HOME_EMPTY,
  MOVE_SPEED,
  NEST_RADIUS,
  SAMPLE_COUNT,
  SAMPLE_RANGE,
  WORLD_H,
  WORLD_W,
} from "./constants";
import { mulberry32, randRange } from "./rng";
import { World } from "./world";

export type Tool = "pan" | "food" | "wall" | "erase" | "nest";

export type ColonyInfo = {
  id: number;
  x: number;
  y: number;
  food: number;
  harvested: number;
  alive: number;
};

export type SimStats = {
  fps: number;
  ants: number;
  carrying: number;
  foodLeft: number;
  colonies: ColonyInfo[];
  time: number;
};

type Colony = {
  x: number;
  y: number;
  food: number;
  harvested: number;
  maxAnts: number;
};

export class Simulation {
  readonly world = new World();
  readonly x = new Float32Array(MAX_ANTS);
  readonly y = new Float32Array(MAX_ANTS);
  readonly angle = new Float32Array(MAX_ANTS);
  readonly clock = new Float32Array(MAX_ANTS);
  readonly autonomy = new Float32Array(MAX_ANTS);
  readonly dirT = new Float32Array(MAX_ANTS);
  readonly markT = new Float32Array(MAX_ANTS);
  readonly searchT = new Float32Array(MAX_ANTS);
  readonly liberty = new Float32Array(MAX_ANTS);
  readonly mode = new Uint8Array(MAX_ANTS);
  readonly colony = new Uint8Array(MAX_ANTS);
  readonly hits = new Uint8Array(MAX_ANTS);
  readonly alive = new Uint8Array(MAX_ANTS);
  readonly enemy = new Uint8Array(MAX_ANTS);

  colonies: Colony[] = [];
  antCount = 0;
  time = 0;
  paused = false;
  speed = 1;
  showAnts = true;
  showMarkers = true;
  brush = 18;
  tool: Tool = "food";
  rng = mulberry32(0xC0FFEE);

  constructor() {
    this.searchT.fill(0);
  }

  reset(seed = (Math.random() * 1e9) | 0) {
    this.rng = mulberry32(seed);
    this.world.reset();
    this.alive.fill(0);
    this.antCount = 0;
    this.colonies = [];
    this.time = 0;
    this.enemy.fill(0);
  }

  addColony(x: number, y: number, ants: number, maxAnts = ants) {
    if (this.colonies.length >= MAX_COLONIES) return -1;
    const id = this.colonies.length;
    const cx = Math.max(NEST_RADIUS + 8, Math.min(WORLD_W - NEST_RADIUS - 8, x));
    const cy = Math.max(NEST_RADIUS + 8, Math.min(WORLD_H - NEST_RADIUS - 8, y));
    this.colonies.push({ x: cx, y: cy, food: 0, harvested: 0, maxAnts });
    this.world.markNest(id, cx, cy, NEST_RADIUS);
    for (let i = 0; i < ants; i++) this.spawn(id);
    return id;
  }

  spawn(col: number) {
    if (this.antCount >= MAX_ANTS) return -1;
    const c = this.colonies[col];
    if (!c) return -1;
    let slot = -1;
    for (let i = 0; i < MAX_ANTS; i++) {
      if (!this.alive[i]) {
        slot = i;
        break;
      }
    }
    if (slot < 0) return -1;
    const a = this.rng() * Math.PI * 2;
    const r = this.rng() * (NEST_RADIUS * 0.4);
    this.x[slot] = c.x + Math.cos(a) * r;
    this.y[slot] = c.y + Math.sin(a) * r;
    this.angle[slot] = a;
    this.clock[slot] = 0;
    this.autonomy[slot] = 0;
    this.dirT[slot] = this.rng() * DIR_PERIOD;
    this.markT[slot] = this.rng() * MARKER_PERIOD;
    this.searchT[slot] = 0;
    this.liberty[slot] = randRange(this.rng, 0.001, 0.012);
    this.mode[slot] = MODE_TO_FOOD;
    this.colony[slot] = col;
    this.hits[slot] = 0;
    this.alive[slot] = 1;
    this.enemy[slot] = 0;
    this.antCount++;
    return slot;
  }

  kill(i: number) {
    if (!this.alive[i]) return;
    if (this.mode[i] === MODE_TO_HOME || this.mode[i] === MODE_TO_HOME_EMPTY) {
      const ci = this.world.cellAt(this.x[i], this.y[i]);
      if (ci >= 0 && !this.world.wall[ci]) this.world.food[ci] += 1;
    }
    this.alive[i] = 0;
    this.antCount--;
  }

  step(dt: number) {
    if (this.paused) return;
    const steps = Math.max(1, this.speed | 0);
    const slice = Math.min(dt, 0.05);
    for (let s = 0; s < steps; s++) this.tick(slice);
  }

  private tick(dt: number) {
    this.time += dt;
    this.world.occupancy.fill(-1);
    this.world.evaporate(dt, this.colonies.length);

    const n = MAX_ANTS;
    for (let i = 0; i < n; i++) {
      if (!this.alive[i]) continue;
      this.autonomy[i] += dt;
      this.clock[i] += dt;
      if (this.searchT[i] > 0) this.searchT[i] -= dt;
      if (this.autonomy[i] > MAX_AUTONOMY) {
        this.kill(i);
        continue;
      }
      this.updateAnt(i, dt);
    }

    this.growColonies(dt);
  }

  private updateAnt(i: number, dt: number) {
    const col = this.colony[i];
    const nest = this.colonies[col];
    if (!nest) return;

    if (this.mode[i] === MODE_TO_FOOD) this.checkFood(i);

    this.dirT[i] += dt;
    if (this.dirT[i] >= DIR_PERIOD) {
      this.dirT[i] = 0;
      if (this.searchT[i] <= 0) {
        this.findMarker(i);
        this.angle[i] += (this.rng() * 2 - 1) * DIR_NOISE;
      } else {
        const ci = this.world.cellAt(this.x[i], this.y[i]);
        if (ci >= 0) this.world.toFood[col * CELL_COUNT + ci] *= 0.25;
        this.angle[i] += (this.rng() * 2 - 1) * DIR_NOISE * 2;
      }
    }

    this.markT[i] += dt;
    if (this.markT[i] >= MARKER_PERIOD) {
      this.markT[i] = 0;
      this.dropMarker(i);
    }

    this.move(i, dt);
    this.checkNest(i, nest);

    const ci = this.world.cellAt(this.x[i], this.y[i]);
    if (ci >= 0) this.world.occupancy[col * CELL_COUNT + ci] = i;
  }

  private move(i: number, dt: number) {
    const a = this.angle[i];
    const vx = Math.cos(a);
    const vy = Math.sin(a);
    const dist = MOVE_SPEED * dt;
    const nx = this.x[i] + vx * dist;
    const ny = this.y[i] + vy * dist;
    const ci = this.world.cellAt(nx, ny);
    if (ci < 0 || this.world.wall[ci]) {
      const hx = this.world.cellAt(this.x[i] + vx * dist, this.y[i]);
      const hy = this.world.cellAt(this.x[i], this.y[i] + vy * dist);
      let nvx = vx;
      let nvy = vy;
      if (hx < 0 || this.world.wall[hx]) nvx = -vx;
      if (hy < 0 || this.world.wall[hy]) nvy = -vy;
      if (nvx === vx && nvy === vy) {
        nvx = -vx;
        nvy = -vy;
      }
      this.angle[i] = Math.atan2(nvy, nvx);
      this.hits[i]++;
      if (this.hits[i] > HIT_LIMIT) this.respawnAtNest(i);
    } else {
      this.hits[i] = 0;
      this.x[i] = nx;
      this.y[i] = ny;
    }
  }

  private respawnAtNest(i: number) {
    const nest = this.colonies[this.colony[i]];
    if (!nest) {
      this.kill(i);
      return;
    }
    const a = this.rng() * Math.PI * 2;
    this.x[i] = nest.x;
    this.y[i] = nest.y;
    this.angle[i] = a;
    this.hits[i] = 0;
    this.clock[i] = 0;
    this.autonomy[i] = 0;
    this.mode[i] = MODE_TO_FOOD;
  }

  private checkFood(i: number) {
    const ci = this.world.cellAt(this.x[i], this.y[i]);
    if (ci < 0 || this.world.food[ci] <= 0) return;
    this.world.food[ci]--;
    const last = this.world.food[ci] === 0;
    this.mode[i] = last ? MODE_TO_HOME_EMPTY : MODE_TO_HOME;
    this.angle[i] += Math.PI;
    this.clock[i] = 0;
    this.autonomy[i] = 0;
    if (last) {
      this.world.repellent[this.colony[i] * CELL_COUNT + ci] = 280;
    }
  }

  private checkNest(i: number, nest: Colony) {
    const dx = this.x[i] - nest.x;
    const dy = this.y[i] - nest.y;
    if (dx * dx + dy * dy > NEST_RADIUS * NEST_RADIUS) return;
    if (this.mode[i] === MODE_TO_HOME || this.mode[i] === MODE_TO_HOME_EMPTY) {
      nest.food += 1;
      nest.harvested += 1;
      this.angle[i] += Math.PI;
    }
    this.autonomy[i] = 0;
    this.clock[i] = 0;
    this.enemy[i] = 0;
    this.mode[i] = MODE_TO_FOOD;
  }

  private dropMarker(i: number) {
    const ci = this.world.cellAt(this.x[i], this.y[i]);
    if (ci < 0) return;
    const col = this.colony[i];
    const intensity = MARKER_INTENSITY * Math.exp(-MARKER_DECAY * this.clock[i]);
    if (this.mode[i] === MODE_TO_FOOD) {
      this.world.addMarker(col, ci, false, intensity);
    } else if (this.mode[i] === MODE_TO_HOME) {
      this.world.addMarker(col, ci, true, intensity);
    } else if (this.mode[i] === MODE_TO_HOME_EMPTY) {
      this.world.repellent[col * CELL_COUNT + ci] += intensity * 0.15;
    }
  }

  private findMarker(i: number) {
    const col = this.colony[i];
    const lookingHome =
      this.mode[i] === MODE_TO_HOME || this.mode[i] === MODE_TO_HOME_EMPTY;
    const px = this.x[i];
    const py = this.y[i];
    const current = this.angle[i];
    let maxI = 0;
    let bestDx = Math.cos(current);
    let bestDy = Math.sin(current);
    let maxRep = 0;
    let maxCell = -1;
    let found = false;

    for (let s = 0; s < SAMPLE_COUNT; s++) {
      const delta = (this.rng() * 2 - 1) * SAMPLE_RANGE;
      const sa = current + delta;
      const dist = this.rng() * DETECT_DIST;
      const dx = Math.cos(sa);
      const dy = Math.sin(sa);
      const sx = px + dist * dx;
      const sy = py + dist * dy;
      const idx = this.world.cellAt(sx, sy);
      if (idx < 0 || this.world.wall[idx]) continue;
      if (this.world.rayHitsWall(px, py, sx, sy)) continue;

      if (lookingHome && this.world.nestMask[col * CELL_COUNT + idx]) {
        bestDx = dx;
        bestDy = dy;
        found = true;
        break;
      }
      if (!lookingHome && this.world.food[idx] > 0) {
        bestDx = dx;
        bestDy = dy;
        found = true;
        break;
      }

      if (this.hasEnemy(idx, col)) this.enemy[i] = 1;

      const rep = this.world.repellent[col * CELL_COUNT + idx];
      if (rep > maxRep) maxRep = rep;

      const wd = this.world.wallDist[idx];
      const raw = lookingHome
        ? this.world.toHome[col * CELL_COUNT + idx]
        : this.world.toFood[col * CELL_COUNT + idx];
      const intensity = raw * wd * wd;
      if (intensity > maxI) {
        maxI = intensity;
        bestDx = dx;
        bestDy = dy;
        maxCell = idx;
      }
      if (this.rng() < this.liberty[i]) break;
    }

    if (!lookingHome && maxRep > 0 && !found) {
      if (this.rng() < 0.3 * (1 - Math.min(1, maxI / MARKER_INTENSITY))) {
        this.angle[i] += this.rng() * Math.PI * 2;
        this.searchT[i] = 4;
        return;
      }
    }

    if (found || maxI > 0.8) {
      if (!lookingHome && maxCell >= 0 && this.rng() < 0.2) {
        this.world.toFood[col * CELL_COUNT + maxCell] *= 0.99;
      }
      this.angle[i] = Math.atan2(bestDy, bestDx);
    } else {
      this.angle[i] += (this.rng() * 2 - 1) * 0.4;
    }
  }

  private hasEnemy(idx: number, col: number) {
    for (let c = 0; c < this.colonies.length; c++) {
      if (c === col) continue;
      if (this.world.occupancy[c * CELL_COUNT + idx] >= 0) return true;
    }
    return false;
  }

  private growColonies(dt: number) {
    for (let c = 0; c < this.colonies.length; c++) {
      const nest = this.colonies[c];
      let living = 0;
      for (let i = 0; i < MAX_ANTS; i++) {
        if (this.alive[i] && this.colony[i] === c) living++;
      }
      if (living < nest.maxAnts && nest.food >= ANT_COST) {
        nest.food -= ANT_COST;
        this.spawn(c);
      } else if (living < Math.min(80, nest.maxAnts) && this.rng() < dt * 2) {
        this.spawn(c);
      }
    }
  }

  paint(wx: number, wy: number, tool: Tool, radius = this.brush) {
    if (tool === "nest") {
      const ants = this.colonies.length === 0 ? 900 : 700;
      this.addColony(wx, wy, ants, 1400);
      return;
    }
    this.world.paintDisk(wx, wy, radius, (cx, cy) => {
      if (tool === "food") this.world.addFood(cx, cy, FOOD_PER_CELL);
      else if (tool === "wall") this.world.setWall(cx, cy, true);
      else if (tool === "erase") {
        this.world.setWall(cx, cy, false);
        if (this.world.inBounds(cx, cy)) {
          const i = this.world.index(cx, cy);
          this.world.food[i] = 0;
        }
      }
    });
    if (tool === "wall" || tool === "erase") this.world.refreshWallDistAround(wx, wy, radius);
  }

  stats(fps: number): SimStats {
    let carrying = 0;
    let foodLeft = 0;
    const perCol = this.colonies.map((c, id) => ({
      id,
      x: c.x,
      y: c.y,
      food: c.food | 0,
      harvested: c.harvested | 0,
      alive: 0,
    }));
    for (let i = 0; i < MAX_ANTS; i++) {
      if (!this.alive[i]) continue;
      perCol[this.colony[i]].alive++;
      if (this.mode[i] === MODE_TO_HOME || this.mode[i] === MODE_TO_HOME_EMPTY) carrying++;
    }
    for (let i = 0; i < CELL_COUNT; i++) foodLeft += this.world.food[i];
    return {
      fps,
      ants: this.antCount,
      carrying,
      foodLeft,
      colonies: perCol,
      time: this.time,
    };
  }
}

