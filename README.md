# Forage

A real-time ant colony simulator you can play in the browser.

Inspired by [Pezzza's Work](https://www.youtube.com/@PezzzasWork) and the public MIT-licensed [johnBuffer/AntSimulator](https://github.com/johnBuffer/AntSimulator). This is an original TypeScript rewrite — not a port of Ant Simulator 2 (those sources live on Patreon).

![Forage](public/og.jpg)

## Play

- **Food** (F) — paint a food pile
- **Wall** (W) — block a path
- **Erase** (E) — cut a door through a wall
- **Nest** (N) — plant another colony
- **Pan** (H) / middle-drag / right-drag — move the view
- Scroll to zoom
- **P** pause · **M** trails · **A** ants · **S** speed · **R** reset · **L** lab

Four maps: open field, maze, two colonies, chambers.

Open the **Lab** to retune scent, fade, sight, walk speed, and colony fights.

## How the colony thinks

Each ant is a tiny agent with two jobs: find food, or carry it home.

1. Walking out, it drops a **to-home** scent that fades with time.
2. Walking back with food, it drops a **to-food** scent.
3. Every fraction of a second it samples a cone ahead (~28 random probes) and steers toward the strongest matching trail it can see without walking through a wall.
4. When the last crumb of a pile is taken, a **repellent** is left so the next wave stops mining an empty patch.
5. Shorter routes get walked more often, so they stay louder as longer ones evaporate. A path appears.
6. Rival nests that share a cell fight. Losers die after a few hits; carried food is dropped.

That is the same idea Pezzza popularized: no central planner, just markers and many bodies.

## Run it locally

```bash
npm install
npm run dev
```

Vite serves the app. The simulation lives in `src/sim/` — that folder is the interesting part.

## Develop

| File | Role |
| --- | --- |
| `src/sim/simulation.ts` | Ant SoA, steering, markers, fights, colony growth |
| `src/sim/world.ts` | Grid: walls, food, pheromones, nest masks |
| `src/sim/renderer.ts` | Canvas: trails, dirt, ants, nests |
| `src/sim/scenarios.ts` | Starting maps |
| `src/sim/constants.ts` | Speeds, intensities, colors, lab defaults |
| `src/components/lab.tsx` | Live parameter panel |

Tweak `LAB_DEFAULTS` in `constants.ts`, or drag the Lab sliders while it runs.

Pezzza's original uses `intensity = MARKER_INTENSITY * exp(-coef * timeSincePickup)`. Trails evaporate linearly each tick. Sampling is a random cone, not a neural net. Wall distance weights markers so ants prefer the middle of a corridor.

## Where this comes from

**Pezzza's Work** (Jean Tampon / johnBuffer) is a French YouTuber who made the videos that defined this genre:

| Video | What it added |
| --- | --- |
| [C++ Ants Simulation 1](https://www.youtube.com/watch?v=81GQNPJip2Y) (2020) | First public build, [source](https://github.com/johnBuffer/AntSimulator) |
| Path optimization, editor, bigger maps | Shorter routes win by evaporating the long ones |
| [Ant Simulator 2](https://www.youtube.com/watch?v=hTHpEF_jcu4) (2025) | Remake; sources on [Patreon](https://www.patreon.com/pezzzaswork) |
| [Bigger Simulation](https://www.youtube.com/watch?v=bSpQpImpZbw) | Multiple food sources, larger worlds |
| [Ants vs Maze](https://www.youtube.com/watch?v=GSTkz_6UVds) | Obstacles |
| [Path Optimization](https://www.youtube.com/watch?v=Ra7MxcPPW2U) | Lane switching |
| [Multiple Colonies](https://www.youtube.com/watch?v=TfhrF7VrzWQ) | Rival nests |

Public clones and cousins:

- [johnBuffer/AntSimulator](https://github.com/johnBuffer/AntSimulator) — C++ / SFML, MIT. **The original.**
- [SebLague/Ant-Simulation](https://github.com/SebLague/Ant-Simulation) — Unity, after Pezzza
- [StrandedKitty/ants-simulation](https://github.com/StrandedKitty/ants-simulation) — Three.js, GPU trails
- [bones-ai/rust-ants-colony-simulation](https://github.com/bones-ai/rust-ants-colony-simulation) — Bevy / Rust

Ant Simulator 2 is not public. Forage is an original rewrite of the 2020 algorithm, plus walls, rival nests, fights, and a live lab.

## License

MIT. See [LICENSE](LICENSE).

Pezzza's original is also MIT (Copyright 2021 Jean Tampon). This project does not copy his source; it reimplements the published behaviour.
