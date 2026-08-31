import {
  Eraser,
  Hand,
  Home,
  Minus,
  Plus,
  Sprout,
  Square,
} from "lucide-react";
import type { Tool } from "@/sim/simulation";
import { cn } from "@/lib/utils";

const TOOLS: { id: Tool; label: string; shortcut: string; icon: typeof Hand }[] = [
  { id: "pan", label: "Pan", shortcut: "H", icon: Hand },
  { id: "food", label: "Food", shortcut: "F", icon: Sprout },
  { id: "wall", label: "Wall", shortcut: "W", icon: Square },
  { id: "erase", label: "Erase", shortcut: "E", icon: Eraser },
  { id: "nest", label: "Nest", shortcut: "N", icon: Home },
];

type Props = {
  tool: Tool;
  brush: number;
  onTool: (t: Tool) => void;
  onBrush: (n: number) => void;
};

export function Toolbar({ tool, brush, onTool, onBrush }: Props) {
  return (
    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-surface/90 p-1.5 shadow-panel md:bottom-auto md:top-1/2 md:left-3 md:translate-x-0 md:-translate-y-1/2 md:flex-col">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const on = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={`${t.label} (${t.shortcut})`}
            aria-label={t.label}
            aria-pressed={on}
            onClick={() => onTool(t.id)}
            className={cn(
              "flex size-11 items-center justify-center rounded-sm transition-colors duration-(--motion-quick)",
              on ? "bg-fg text-bg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </button>
        );
      })}
      <div className="mx-1 hidden h-4 w-px bg-border md:mx-0 md:my-1 md:block md:h-px md:w-8" />
      <div className="hidden items-center gap-0.5 md:flex md:flex-col">
        <button
          type="button"
          aria-label="Larger brush"
          className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:text-fg"
          onClick={() => onBrush(Math.min(48, brush + 4))}
        >
          <Plus className="size-3.5" />
        </button>
        <span className="font-mono text-[10px] tabular-nums text-fg-subtle">{brush}</span>
        <button
          type="button"
          aria-label="Smaller brush"
          className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:text-fg"
          onClick={() => onBrush(Math.max(6, brush - 4))}
        >
          <Minus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
