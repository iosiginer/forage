import { SlidersHorizontal, X } from "lucide-react";
import { LAB_DEFAULTS, type LabParams } from "@/sim/constants";

type Props = {
  open: boolean;
  params: LabParams;
  onOpen: (v: boolean) => void;
  onChange: (p: LabParams) => void;
};

const SLIDERS: {
  key: keyof Omit<LabParams, "fights">;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "markerIntensity", label: "Scent", min: 80, max: 1600, step: 20 },
  { key: "markerDecay", label: "Clock fade", min: 0.01, max: 0.18, step: 0.005 },
  { key: "evaporateMul", label: "Trail fade", min: 0.25, max: 4, step: 0.05 },
  { key: "detectDist", label: "Sight", min: 16, max: 90, step: 1 },
  { key: "sampleCount", label: "Samples", min: 8, max: 48, step: 1 },
  { key: "moveSpeed", label: "Walk", min: 18, max: 90, step: 1 },
];

export function Lab({ open, params, onOpen, onChange }: Props) {
  return (
    <div className="absolute right-3 bottom-20 z-10 md:bottom-4">
      {open ? (
        <div className="w-72 max-w-full rounded-lg border border-border bg-surface/95 p-3 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium tracking-[0.14em] text-fg-subtle uppercase">
              Lab
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-sm px-2 py-1 font-mono text-xs text-fg-muted hover:text-fg"
                onClick={() => onChange({ ...LAB_DEFAULTS })}
              >
                Reset
              </button>
              <button
                type="button"
                aria-label="Close lab"
                className="flex size-8 items-center justify-center rounded-sm text-fg-muted hover:text-fg"
                onClick={() => onOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {SLIDERS.map((s) => (
              <li key={s.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <label htmlFor={`lab-${s.key}`} className="text-xs text-fg-muted">
                    {s.label}
                  </label>
                  <span className="font-mono text-xs tabular-nums text-fg-subtle">
                    {fmt(params[s.key])}
                  </span>
                </div>
                <input
                  id={`lab-${s.key}`}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={params[s.key]}
                  onChange={(e) =>
                    onChange({ ...params, [s.key]: Number(e.target.value) })
                  }
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-fg"
                />
              </li>
            ))}
          </ul>
          <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-between gap-3">
            <span className="text-xs text-fg-muted">Colony fights</span>
            <input
              type="checkbox"
              checked={params.fights}
              onChange={(e) => onChange({ ...params, fights: e.target.checked })}
              className="size-4 accent-fg"
            />
          </label>
          <p className="mt-3 text-xs leading-snug text-fg-subtle">
            Stronger scent and slower fade make highways. More samples, shorter
            wander. Fights only matter with two nests.
          </p>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Open lab"
          title="Lab (L)"
          onClick={() => onOpen(true)}
          className="flex size-11 items-center justify-center rounded-md border border-border bg-surface/90 text-fg-muted shadow-panel hover:text-fg"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      )}
    </div>
  );
}

function fmt(n: number) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(n < 1 ? 3 : 2);
}

