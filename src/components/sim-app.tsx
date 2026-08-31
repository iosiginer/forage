import { useCallback, useEffect, useRef, useState } from "react";
import { LAB_DEFAULTS, WORLD_H, WORLD_W, type LabParams } from "@/sim/constants";
import { SimRenderer } from "@/sim/renderer";
import { loadScenario, SCENARIO_HINT, type ScenarioId } from "@/sim/scenarios";
import { Simulation, type SimStats, type Tool } from "@/sim/simulation";
import { Hud } from "./hud";
import { Lab } from "./lab";
import { StartScreen } from "./start-screen";
import { Toolbar } from "./toolbar";

const emptyStats: SimStats = {
  fps: 0,
  ants: 0,
  carrying: 0,
  foodLeft: 0,
  colonies: [],
  time: 0,
};

export function SimApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const rendRef = useRef<SimRenderer | null>(null);
  const cam = useRef({ x: 0, y: 0, zoom: 1 });
  const drag = useRef<{
    id: number;
    mode: "pan" | "paint";
    lx: number;
    ly: number;
    button: number;
  } | null>(null);
  const keys = useRef(new Set<string>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(true);
  const [stats, setStats] = useState<SimStats>(emptyStats);
  const [tool, setTool] = useState<Tool>("food");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showAnts, setShowAnts] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [brush, setBrush] = useState(18);
  const [scenario, setScenario] = useState<ScenarioId>("open");
  const [help, setHelp] = useState(true);
  const [labOpen, setLabOpen] = useState(false);
  const [lab, setLab] = useState<LabParams>({ ...LAB_DEFAULTS });

  const applyTool = useCallback((t: Tool) => {
    setTool(t);
    const sim = simRef.current;
    if (sim) sim.tool = t;
  }, []);

  const fitCamera = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const z = Math.min(w / WORLD_W, h / WORLD_H);
    cam.current.zoom = z;
    cam.current.x = (w - WORLD_W * z) / 2;
    cam.current.y = (h - WORLD_H * z) / 2;
  }, []);

  const boot = useCallback(
    (id: ScenarioId) => {
      const sim = simRef.current;
      if (!sim) return;
      const mobile = window.matchMedia("(max-width: 640px)").matches;
      loadScenario(sim, id, mobile);
      sim.applyParams(lab);
      sim.tool = tool;
      sim.brush = brush;
      sim.showAnts = showAnts;
      sim.showMarkers = showMarkers;
      sim.paused = paused;
      sim.speed = speed;
      setScenario(id);
      setIntro(false);
      setHelp(true);
    },
    [tool, brush, showAnts, showMarkers, paused, speed, lab],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    const sim = new Simulation();
    const rend = new SimRenderer();
    simRef.current = sim;
    rendRef.current = rend;
    sim.applyParams(LAB_DEFAULTS);
    (window as unknown as { __forage?: Simulation }).__forage = sim;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    loadScenario(sim, "open", mobile);
    sim.tool = "food";

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    let fpsAt = last;
    let fps = 0;
    let hudAt = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      const step = 1 / 60;
      let guard = 0;
      while (acc >= step && guard++ < 8) {
        sim.step(step);
        acc -= step;
      }

      frames++;
      if (now - fpsAt >= 500) {
        fps = (frames * 1000) / (now - fpsAt);
        frames = 0;
        fpsAt = now;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      const pw = Math.max(1, (cssW * dpr) | 0);
      const ph = Math.max(1, (cssH * dpr) | 0);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
        fitCamera();
      }

      rend.draw(ctx, sim, cam.current.x, cam.current.y, cam.current.zoom, dpr, cssW, cssH);

      if (now - hudAt > 120) {
        hudAt = now;
        setStats(sim.stats(fps));
      }
    };

    fitCamera();
    raf = requestAnimationFrame(loop);
    setReady(true);

    const onResize = () => fitCamera();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      simRef.current = null;
      delete (window as unknown as { __forage?: Simulation }).__forage;
    };
  }, [fitCamera]);

  useEffect(() => {
    const sim = simRef.current;
    if (sim) sim.paused = paused;
  }, [paused]);
  useEffect(() => {
    const sim = simRef.current;
    if (sim) sim.speed = speed;
  }, [speed]);
  useEffect(() => {
    const sim = simRef.current;
    if (sim) sim.showAnts = showAnts;
  }, [showAnts]);
  useEffect(() => {
    const sim = simRef.current;
    if (sim) sim.showMarkers = showMarkers;
  }, [showMarkers]);
  useEffect(() => {
    const sim = simRef.current;
    if (sim) sim.brush = brush;
  }, [brush]);
  useEffect(() => {
    simRef.current?.applyParams(lab);
  }, [lab]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const map: Record<string, () => void> = {
        KeyP: () => setPaused((p) => !p),
        Space: () => {
          e.preventDefault();
          setPaused((p) => !p);
        },
        KeyM: () => setShowMarkers((v) => !v),
        KeyA: () => setShowAnts((v) => !v),
        KeyS: () => setSpeed((s) => (s >= 4 ? 1 : s === 1 ? 2 : 4)),
        KeyF: () => applyTool("food"),
        KeyW: () => applyTool("wall"),
        KeyE: () => applyTool("erase"),
        KeyH: () => applyTool("pan"),
        KeyN: () => applyTool("nest"),
        KeyR: () => boot(scenario),
        KeyL: () => setLabOpen((v) => !v),
        Digit1: () => setSpeed(1),
        Digit2: () => setSpeed(2),
        Digit3: () => setSpeed(4),
        Escape: () => setIntro(true),
      };
      map[e.code]?.();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [applyTool, boot, scenario]);

  const toLocal = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const worldAt = (sx: number, sy: number) => {
    const c = cam.current;
    return { x: (sx - c.x) / c.zoom, y: (sy - c.y) / c.zoom };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (intro) {
      setIntro(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const loc = toLocal(e);
    const panKey = keys.current.has("Space") || e.button === 1 || e.button === 2;
    const mode: "pan" | "paint" = tool === "pan" || panKey ? "pan" : "paint";
    drag.current = { id: e.pointerId, mode, lx: loc.x, ly: loc.y, button: e.button };
    if (mode === "paint" && simRef.current) {
      const w = worldAt(loc.x, loc.y);
      simRef.current.paint(w.x, w.y, e.button === 2 ? "food" : tool, brush);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const loc = toLocal(e);
    if (d.mode === "pan") {
      cam.current.x += loc.x - d.lx;
      cam.current.y += loc.y - d.ly;
    } else if (simRef.current) {
      const w = worldAt(loc.x, loc.y);
      simRef.current.paint(w.x, w.y, d.button === 2 ? "food" : tool, brush);
    }
    d.lx = loc.x;
    d.ly = loc.y;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
    pinch.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const loc = toLocal(e);
    const c = cam.current;
    const old = c.zoom;
    const next = Math.min(4, Math.max(0.35, old * (e.deltaY < 0 ? 1.08 : 0.92)));
    const wx = (loc.x - c.x) / old;
    const wy = (loc.y - c.y) / old;
    c.zoom = next;
    c.x = loc.x - wx * next;
    c.y = loc.y - wy * next;
  };

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinch.current = { d, z: cam.current.zoom };
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
      const c = cam.current;
      const old = c.zoom;
      const next = Math.min(4, Math.max(0.35, pinch.current.z * (d / pinch.current.d)));
      const wx = (mx - c.x) / old;
      const wy = (my - c.y) / old;
      c.zoom = next;
      c.x = mx - wx * next;
      c.y = my - wy * next;
    }
  };

  const cursor =
    tool === "pan" ? "cursor-grab" : intro ? "cursor-pointer" : "cursor-crosshair";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none ${cursor}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      />

      {ready && !intro ? (
        <>
          <Hud
            stats={stats}
            paused={paused}
            speed={speed}
            showAnts={showAnts}
            showMarkers={showMarkers}
            scenario={scenario}
            onPause={() => setPaused((p) => !p)}
            onSpeed={() => setSpeed((s) => (s >= 4 ? 1 : s === 1 ? 2 : 4))}
            onToggleAnts={() => setShowAnts((v) => !v)}
            onToggleMarkers={() => setShowMarkers((v) => !v)}
            onReset={() => boot(scenario)}
            onScenario={(id) => boot(id)}
            onMenu={() => setIntro(true)}
          />
          <Toolbar
            tool={tool}
            brush={brush}
            onTool={applyTool}
            onBrush={setBrush}
          />
          <Lab
            open={labOpen}
            params={lab}
            onOpen={setLabOpen}
            onChange={setLab}
          />
          {help ? (
            <p className="pointer-events-none absolute bottom-20 left-1/2 z-10 hidden max-w-sm -translate-x-1/2 text-center text-xs text-fg-muted md:bottom-6 md:block">
              {SCENARIO_HINT[scenario]}
            </p>
          ) : null}
        </>
      ) : null}

      {intro ? (
        <StartScreen
          onPlay={(id) => boot(id)}
          onResume={ready ? () => setIntro(false) : undefined}
          live={ready}
        />
      ) : null}
    </div>
  );
}
