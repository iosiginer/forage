import { CELL, GRID_H, GRID_W, WORLD_H, WORLD_W } from "./constants";
import type { Simulation } from "./simulation";

export type ScenarioId = "open" | "maze" | "rival" | "chambers";

export const SCENARIOS: { id: ScenarioId; label: string; blurb: string }[] = [
  { id: "open", label: "Open field", blurb: "One nest. Food across the plain. Watch a trail emerge." },
  { id: "maze", label: "Maze", blurb: "Corridors force the colony to commit to a path." },
  { id: "rival", label: "Two colonies", blurb: "Coral and teal compete for the same piles." },
  { id: "chambers", label: "Chambers", blurb: "Rooms of food, narrow doors, longer trails." },
];

export function loadScenario(sim: Simulation, id: ScenarioId, mobile: boolean) {
  const pop = mobile ? 520 : 1100;
  sim.reset();
  if (id === "open") openField(sim, pop);
  else if (id === "maze") maze(sim, pop);
  else if (id === "rival") rival(sim, mobile ? 420 : 800);
  else chambers(sim, pop);
}

function foodBlob(sim: Simulation, x: number, y: number, r: number) {
  sim.paint(x, y, "food", r);
}

function wallRect(sim: Simulation, x0: number, y0: number, x1: number, y1: number) {
  const cx0 = Math.max(1, (x0 / CELL) | 0);
  const cy0 = Math.max(1, (y0 / CELL) | 0);
  const cx1 = Math.min(GRID_W - 2, (x1 / CELL) | 0);
  const cy1 = Math.min(GRID_H - 2, (y1 / CELL) | 0);
  for (let y = cy0; y <= cy1; y++) {
    for (let x = cx0; x <= cx1; x++) sim.world.setWall(x, y, true);
  }
}

function openField(sim: Simulation, pop: number) {
  sim.addColony(WORLD_W * 0.22, WORLD_H * 0.5, pop, pop + 400);
  foodBlob(sim, WORLD_W * 0.42, WORLD_H * 0.38, 32);
  foodBlob(sim, WORLD_W * 0.78, WORLD_H * 0.28, 38);
  foodBlob(sim, WORLD_W * 0.82, WORLD_H * 0.72, 42);
  foodBlob(sim, WORLD_W * 0.58, WORLD_H * 0.18, 26);
  wallRect(sim, WORLD_W * 0.46, WORLD_H * 0.38, WORLD_W * 0.5, WORLD_H * 0.72);
  wallRect(sim, WORLD_W * 0.62, WORLD_H * 0.48, WORLD_W * 0.78, WORLD_H * 0.52);
  sim.world.recomputeWallDist();
}

function maze(sim: Simulation, pop: number) {
  sim.addColony(WORLD_W * 0.14, WORLD_H * 0.5, pop, pop + 300);
  divide(sim, 2, 2, GRID_W - 3, GRID_H - 3, 0);
  foodBlob(sim, WORLD_W * 0.86, WORLD_H * 0.18, 32);
  foodBlob(sim, WORLD_W * 0.84, WORLD_H * 0.82, 34);
  foodBlob(sim, WORLD_W * 0.55, WORLD_H * 0.5, 24);
  sim.world.recomputeWallDist();
}

function divide(sim: Simulation, x0: number, y0: number, x1: number, y1: number, depth: number) {
  const min = 18;
  const w = x1 - x0;
  const h = y1 - y0;
  if (w < min || h < min || depth > 5) return;
  const vertical = w > h;
  if (vertical) {
    const x = x0 + 8 + ((w - 16) * ((depth * 17 + 11) % 10)) / 10 | 0;
    const gap = y0 + 4 + ((h - 8) * ((depth * 13 + 3) % 10)) / 10 | 0;
    for (let y = y0; y <= y1; y++) {
      if (y >= gap && y < gap + 6) continue;
      sim.world.setWall(x, y, true);
      sim.world.setWall(x + 1, y, true);
    }
    divide(sim, x0, y0, x - 1, y1, depth + 1);
    divide(sim, x + 2, y0, x1, y1, depth + 1);
  } else {
    const y = y0 + 8 + ((h - 16) * ((depth * 19 + 7) % 10)) / 10 | 0;
    const gap = x0 + 4 + ((w - 8) * ((depth * 11 + 5) % 10)) / 10 | 0;
    for (let x = x0; x <= x1; x++) {
      if (x >= gap && x < gap + 6) continue;
      sim.world.setWall(x, y, true);
      sim.world.setWall(x, y + 1, true);
    }
    divide(sim, x0, y0, x1, y - 1, depth + 1);
    divide(sim, x0, y + 2, x1, y1, depth + 1);
  }
}

function rival(sim: Simulation, pop: number) {
  sim.addColony(WORLD_W * 0.16, WORLD_H * 0.5, pop, pop + 350);
  sim.addColony(WORLD_W * 0.84, WORLD_H * 0.5, pop, pop + 350);
  foodBlob(sim, WORLD_W * 0.5, WORLD_H * 0.22, 40);
  foodBlob(sim, WORLD_W * 0.5, WORLD_H * 0.78, 40);
  foodBlob(sim, WORLD_W * 0.5, WORLD_H * 0.5, 28);
  wallRect(sim, WORLD_W * 0.48, WORLD_H * 0.34, WORLD_W * 0.52, WORLD_H * 0.44);
  wallRect(sim, WORLD_W * 0.48, WORLD_H * 0.56, WORLD_W * 0.52, WORLD_H * 0.66);
  sim.world.recomputeWallDist();
}

function chambers(sim: Simulation, pop: number) {
  sim.addColony(WORLD_W * 0.18, WORLD_H * 0.78, pop, pop + 300);
  wallRect(sim, WORLD_W * 0.32, WORLD_H * 0.08, WORLD_W * 0.36, WORLD_H * 0.62);
  wallRect(sim, WORLD_W * 0.36, WORLD_H * 0.58, WORLD_W * 0.72, WORLD_H * 0.62);
  wallRect(sim, WORLD_W * 0.68, WORLD_H * 0.2, WORLD_W * 0.72, WORLD_H * 0.58);
  wallRect(sim, WORLD_W * 0.5, WORLD_H * 0.2, WORLD_W * 0.88, WORLD_H * 0.24);
  wallRect(sim, WORLD_W * 0.08, WORLD_H * 0.38, WORLD_W * 0.32, WORLD_H * 0.42);
  foodBlob(sim, WORLD_W * 0.52, WORLD_H * 0.38, 34);
  foodBlob(sim, WORLD_W * 0.8, WORLD_H * 0.4, 36);
  foodBlob(sim, WORLD_W * 0.78, WORLD_H * 0.12, 28);
  foodBlob(sim, WORLD_W * 0.18, WORLD_H * 0.18, 30);
  sim.world.recomputeWallDist();
}

export const SCENARIO_HINT: Record<ScenarioId, string> = {
  open: "Paint more food with the sprout tool. Walls reshape the trail.",
  maze: "Open a door with erase, or seal a corridor with walls.",
  rival: "Drop a third nest, or starve one side by erasing their food.",
  chambers: "Punch a shortcut through a wall and watch the path reroute.",
};
