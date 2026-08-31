import type { ReactNode } from "react";
import {
  Bug,
  FastForward,
  Layers,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { COLONY_COLORS } from "@/sim/constants";
import { SCENARIOS, type ScenarioId } from "@/sim/scenarios";
import type { SimStats } from "@/sim/simulation";
import { cn } from "@/lib/utils";

type Props = {
  stats: SimStats;
  paused: boolean;
  speed: number;
  showAnts: boolean;
  showMarkers: boolean;
  scenario: ScenarioId;
  onPause: () => void;
  onSpeed: () => void;
  onToggleAnts: () => void;
  onToggleMarkers: () => void;
  onReset: () => void;
  onScenario: (id: ScenarioId) => void;
  onMenu: () => void;
};

export function Hud({
  stats,
  paused,
  speed,
  showAnts,
  showMarkers,
  scenario,
  onPause,
  onSpeed,
  onToggleAnts,
  onToggleMarkers,
  onReset,
  onScenario,
  onMenu,
}: Props) {
  return (
    <>
      <header className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex items-start justify-between gap-3 p-3 md:p-4">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={onMenu}
            className="text-left"
            aria-label="Open menu"
          >
            <span className="font-display text-xl font-medium tracking-display text-fg">
              Forage
            </span>
          </button>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-fg-muted">
            <span>{stats.ants} ants</span>
            <span>{stats.carrying} laden</span>
            <span>{stats.foodLeft} food</span>
            <span className="hidden sm:inline">{stats.fps | 0} fps</span>
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {stats.colonies.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-fg-muted"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: COLONY_COLORS[c.id].hex }}
                />
                <span>{c.alive}</span>
                <span className="text-fg-subtle">{c.harvested} in</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-border bg-surface/90 p-1 shadow-panel">
          <IconBtn label={paused ? "Play" : "Pause"} onClick={onPause}>
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </IconBtn>
          <IconBtn label={`Speed ${speed}x`} onClick={onSpeed} active={speed > 1}>
            <FastForward className="size-4" />
            <span className="sr-only">{speed}x</span>
          </IconBtn>
          <IconBtn label="Toggle ants" onClick={onToggleAnts} active={showAnts}>
            <Bug className="size-4" />
          </IconBtn>
          <IconBtn label="Toggle trails" onClick={onToggleMarkers} active={showMarkers}>
            <Layers className="size-4" />
          </IconBtn>
          <IconBtn label="Reset map" onClick={onReset}>
            <RotateCcw className="size-4" />
          </IconBtn>
        </div>
      </header>

      <div className="absolute top-3 right-3 z-10 mt-14 hidden md:block">
        <div className="rounded-md border border-border bg-surface/90 p-1 shadow-panel">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onScenario(s.id)}
              className={cn(
                "block w-full rounded-sm px-3 py-1.5 text-left text-xs transition-colors",
                scenario === s.id ? "bg-fg text-bg" : "text-fg-muted hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-10 items-center justify-center rounded-sm text-fg-muted transition-colors duration-(--motion-quick) hover:text-fg",
        active && "text-fg",
      )}
    >
      {children}
    </button>
  );
}
