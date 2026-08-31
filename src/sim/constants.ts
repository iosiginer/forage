export const CELL = 4;
export const WORLD_W = 1600;
export const WORLD_H = 900;
export const GRID_W = WORLD_W / CELL;
export const GRID_H = WORLD_H / CELL;
export const CELL_COUNT = GRID_W * GRID_H;

export const MAX_COLONIES = 4;
export const MAX_ANTS = 4000;

export const MOVE_SPEED = 46;
export const DETECT_DIST = 40;
export const DIR_PERIOD = 0.22;
export const MARKER_PERIOD = 0.2;
export const DIR_NOISE = Math.PI * 0.05;
export const SAMPLE_RANGE = Math.PI * 0.5;
export const SAMPLE_COUNT = 28;
export const MARKER_INTENSITY = 520;
export const MARKER_DECAY = 0.05;
export const NEST_RADIUS = 22;
export const ANT_LENGTH = 5.6;
export const ANT_WIDTH = 2.6;
export const MAX_AUTONOMY = 140;
export const ANT_COST = 4;
export const FOOD_PER_CELL = 28;
export const HIT_LIMIT = 5;
export const FIGHT_DAMAGE = 28;

export const MODE_TO_FOOD = 0;
export const MODE_TO_HOME = 1;
export const MODE_TO_HOME_EMPTY = 2;

export type LabParams = {
  markerIntensity: number;
  markerDecay: number;
  detectDist: number;
  sampleCount: number;
  moveSpeed: number;
  evaporateMul: number;
  fights: boolean;
};

export const LAB_DEFAULTS: LabParams = {
  markerIntensity: MARKER_INTENSITY,
  markerDecay: MARKER_DECAY,
  detectDist: DETECT_DIST,
  sampleCount: SAMPLE_COUNT,
  moveSpeed: MOVE_SPEED,
  evaporateMul: 1,
  fights: true,
};

export const COLONY_COLORS = [
  { r: 224, g: 112, b: 96, hex: "#e07060", name: "Coral" },
  { r: 78, g: 168, b: 184, hex: "#4ea8b8", name: "Teal" },
  { r: 212, g: 165, b: 116, hex: "#d4a574", name: "Sand" },
  { r: 143, g: 191, b: 122, hex: "#8fbf7a", name: "Sage" },
] as const;

export const FOOD_COLOR = { r: 72, g: 168, b: 78 };
export const WALL_COLOR = { r: 92, g: 86, b: 82 };
export const GROUND = { r: 12, g: 11, b: 10 };
