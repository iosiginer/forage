import { SCENARIOS, type ScenarioId } from "@/sim/scenarios";

type Props = {
  onPlay: (id: ScenarioId) => void;
  onResume?: () => void;
  live: boolean;
};

export function StartScreen({ onPlay, onResume, live }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-overlay md:items-center">
      <div className="m-3 w-full max-w-lg rounded-xl border border-border bg-surface/95 p-5 shadow-panel md:m-0 md:p-8">
        <p className="text-xs font-medium tracking-[0.18em] text-fg-subtle uppercase">
          Colony simulator
        </p>
        <h1 className="font-display mt-2 text-4xl leading-tight font-medium tracking-display text-fg md:text-5xl">
          Forage
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-normal text-pretty text-fg-muted">
          Ants leave scent as they walk. Returning workers follow home, foragers
          follow food, and a path appears from nothing but many small choices.
        </p>

        <div className="mt-6 grid gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPlay(s.id)}
              className="group flex flex-col rounded-md border border-border bg-bg px-4 py-3 text-left transition-colors duration-(--motion-quick) hover:border-border-strong hover:bg-surface-2"
            >
              <span className="text-sm font-medium text-fg">{s.label}</span>
              <span className="text-xs text-fg-muted">{s.blurb}</span>
            </button>
          ))}
        </div>

        {live && onResume ? (
          <button
            type="button"
            onClick={onResume}
            className="mt-3 w-full rounded-md px-4 py-2.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            Continue watching
          </button>
        ) : null}

        <p className="mt-4 text-xs text-fg-subtle">
          Inspired by Pezzza's Work. Paint food, cut walls, place a rival nest.
        </p>
      </div>
    </div>
  );
}
