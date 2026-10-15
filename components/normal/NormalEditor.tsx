"use client";

import { FlipHorizontal2, GitFork, Maximize, Minus, Paintbrush, PenLine, Plus, Redo2, RefreshCw, RotateCcw, Ruler, Send, Shapes, Sparkles, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_COLORS } from "@/lib/constants";
import { downloadNormalPng } from "@/lib/exportNormalPng";
import {
  buildStyle,
  FLIP_KNOT,
  isNormalPattern,
  KNOT_INFO,
  KNOTS,
  MAX_ROWS,
  MAX_STRINGS,
  MIN_ROWS,
  MIN_STRINGS,
  nextKnot,
  normalizePattern,
  paintKnot,
  resizeNormal,
  setKnot,
  setString,
  simulate,
  STYLE_INFO,
  type Knot,
  type NormalPattern,
  type NormalStyle,
} from "@/lib/normal";
import { buildFromNormalRecipe, parseNormalDescription, type NormalRecipe } from "@/lib/normalRecipe";
import { fetchLibrary, publishPattern, PublishError } from "@/lib/libraryClient";
import { getThread, isValidThread, THREADS } from "@/lib/palette";
import { KEYS, loadLocal, saveLocal } from "@/lib/storage";
import { isTraditional, type PatternSource } from "@/lib/types";
import DescribePanel from "../editor/DescribePanel";
import EditorTypeSwitch from "../editor/EditorTypeSwitch";
import PublishModal, { type PublishFields } from "../editor/PublishModal";
import { useHistory } from "../editor/useHistory";
import ExportButton from "../ExportButton";
import { useToast } from "../ui/Toast";
import BraceletStrip from "./BraceletStrip";
import ClassicsPanel from "./ClassicsPanel";
import KnotIcon from "./KnotIcon";
import NormalDiagram from "./NormalDiagram";
import NormalStringPanel, { NormalStringSummary } from "./NormalStringPanel";

type Tab = "describe" | "classics" | "strings";
type Tool = "cycle" | "paint" | Knot;
type Meta = { source: PatternSource; remixedFrom?: string; remixTitle?: string; tags: string[] };
type Draft = { title: string; pattern: NormalPattern; meta?: Meta };

const DRAFT_KEY = "abb:normal-draft";
const ZOOMS = [12, 14, 16, 18, 20, 23, 26, 30, 34];
const DEFAULT_COLORS = ["hot-pink", "pink", "lavender", "purple"];

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "describe", label: "Describe", icon: Sparkles },
  { id: "classics", label: "Classics", icon: Shapes },
  { id: "strings", label: "Strings", icon: Ruler },
];

const EXAMPLES = [
  "8-string sunset chevron",
  "rainbow zigzag with a black border",
  "navy and white checkerboard",
  "XOXO criss-cross in pink and red",
  "yellow and black lightning bolt",
];

function readDraft(): Draft | null {
  const d = loadLocal<Draft | null>(DRAFT_KEY, null);
  if (!d || typeof d.title !== "string" || !isNormalPattern(d.pattern)) return null;
  const pattern = normalizePattern(d.pattern);
  const meta = d.meta && typeof d.meta.source === "string" && Array.isArray(d.meta.tags) ? d.meta : undefined;
  return pattern.strings.every(isValidThread) ? { title: d.title, pattern, meta } : null;
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Colours in the order they first appear across the strings. */
function stringColors(p: NormalPattern) {
  return [...new Set(p.strings)];
}

export default function NormalEditor() {
  const toast = useToast();
  const router = useRouter();
  const [remixId] = useState(() => new URLSearchParams(window.location.search).get("remix"));
  const [start] = useState(() => (remixId || new URLSearchParams(window.location.search).get("new") === "1" ? null : readDraft()));
  // Drop ?new=1 so a refresh doesn't throw the new work away. (In an effect: the router can't change during render.)
  useEffect(() => {
    if (window.location.search.includes("new=1")) window.history.replaceState(null, "", "/create/normal");
  }, []);
  const history = useHistory<NormalPattern>(() => start?.pattern ?? buildStyle("chevron", DEFAULT_COLORS, 8));
  const { grid: pattern, commit } = history;
  const sim = useMemo(() => simulate(pattern), [pattern]);
  const n = pattern.strings.length;
  const rows = pattern.knots.length;
  const used = stringColors(pattern);

  const [title, setTitle] = useState(start?.title ?? "Pink chevron");
  const [meta, setMeta] = useState<Meta>(() => start?.meta ?? { source: "manual", tags: [] });
  const [publishOpen, setPublishOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("cycle");
  const [color, setColor] = useState("hot-pink");
  const [mirror, setMirror] = useState(false);
  const [tab, setTab] = useState<Tab>("describe");
  const centerRef = useRef<HTMLDivElement>(null);
  const stroking = useRef(false);
  const canMirror = n % 2 === 0;
  const mirrorOn = mirror && canMirror;

  const fitCell = useCallback((p: NormalPattern) => {
    const el = centerRef.current;
    if (!el) return 20;
    const byH = Math.floor((el.clientHeight - 230) / p.knots.length);
    const byW = Math.floor((el.clientWidth - 140) / p.strings.length);
    return Math.max(ZOOMS[0], Math.min(30, byH, byW));
  }, []);
  // First fit uses the window size; the centre panel isn't measured yet.
  const [cell, setCell] = useState(() => {
    const byH = Math.floor((window.innerHeight - 56 - 64 - 70 - 230) / rows);
    const byW = Math.floor((window.innerWidth - (window.innerWidth >= 1024 ? 608 : 0) - 140) / n);
    return Math.max(ZOOMS[0], Math.min(30, byH, byW));
  });

  useEffect(() => {
    const t = setTimeout(() => saveLocal(DRAFT_KEY, { title, pattern, meta } satisfies Draft), 300);
    return () => clearTimeout(t);
  }, [title, pattern, meta]);

  // Opening a library pattern to remix it (?remix=id).
  useEffect(() => {
    if (!remixId) return;
    let alive = true;
    fetchLibrary().then((all) => {
      const p = all.find((x) => x.id === remixId);
      if (!alive) return;
      if (!p) {
        toast("Couldn't find that pattern to remix.", "warn");
        return;
      }
      if (!isTraditional(p)) {
        router.replace(`/create?remix=${encodeURIComponent(p.id)}`);
        return;
      }
      history.reset(p.normal);
      setCell(fitCell(p.normal));
      setTitle(`${p.title} (remix)`);
      setMeta({ source: "remix", remixedFrom: p.id, remixTitle: p.title, tags: p.tags.filter((t) => t !== "remix") });
      toast(
        <>
          Remixing <b>{p.title}</b> by {p.author}. Make it yours!
        </>,
        "info",
      );
      window.history.replaceState(null, "", "/create/normal");
    });
    return () => {
      alive = false;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = (p: NormalPattern, name: string) => {
    commit(p);
    setTitle(name);
    setCell(fitCell(p));
  };

  // ---------- knots ----------

  /** The same knot on the other side, for mirror mode (null for the middle knot). */
  const mirrorOf = (r: number, i: number): [number, number] | null => {
    const j = pattern.knots[r].length - 1 - i;
    return j === i ? null : [r, j];
  };

  const applyTo = (p: NormalPattern, r: number, i: number, t: Tool): NormalPattern => {
    if (t === "paint") return paintKnot(p, r, i, color).pattern;
    const k = t === "cycle" ? nextKnot(p.knots[r][i]) : t;
    let next = setKnot(p, r, i, k);
    const m = mirrorOn ? mirrorOf(r, i) : null;
    if (m) next = setKnot(next, m[0], m[1], FLIP_KNOT[k]);
    return next;
  };

  const applyMirrored = (p: NormalPattern, r: number, i: number): NormalPattern => {
    let next = applyTo(p, r, i, tool);
    const m = tool === "paint" && mirrorOn ? mirrorOf(r, i) : null;
    if (m) next = applyTo(next, m[0], m[1], "paint");
    return next;
  };

  const onKnotDown = (r: number, i: number) => {
    if (tool === "paint") {
      const res = paintKnot(pattern, r, i, color);
      if (res.options) {
        const [a, b] = res.options.map((c) => getThread(c).name);
        toast(a === b ? `Only ${a} reaches this knot.` : `This knot can only be ${a} or ${b}: those are the strings that meet here.`, "info");
      }
    }
    stroking.current = true;
    history.beginStroke();
    history.strokeUpdate((p) => applyMirrored(p, r, i));
  };

  const onKnotEnter = (r: number, i: number) => {
    // Cycling while dragging would flicker, so only fixed knot types and paint can be dragged.
    if (!stroking.current || tool === "cycle") return;
    history.strokeUpdate((p) => applyMirrored(p, r, i));
  };

  useEffect(() => {
    const up = () => {
      if (!stroking.current) return;
      stroking.current = false;
      history.endStroke();
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [history]);

  const onStringClick = (s: number) => {
    let next = setString(pattern, s, color);
    if (mirrorOn) next = setString(next, n - 1 - s, color);
    if (stringColors(next).length > MAX_COLORS) {
      toast(`Patterns can use up to ${MAX_COLORS} colours. Swap one out first.`, "warn");
      return;
    }
    commit(next);
  };

  // ---------- actions ----------

  const resize = (strings: number, r: number) => {
    const next = resizeNormal(pattern, strings, r);
    if (next.strings.length === n && next.knots.length === rows) return;
    commit(next);
  };

  const applyRecipe = (recipe: NormalRecipe) => {
    const built = buildFromNormalRecipe(recipe);
    const r = built.recipe;
    const names = r.colors.slice(0, 2).map((c) => getThread(c).name);
    load(built.pattern, capitalise(`${names.join(" & ")} ${STYLE_INFO[r.style].name.toLowerCase()}`));
    // A remix stays a remix even after the AI changes it.
    setMeta((m) => ({
      ...m,
      source: m.source === "remix" ? "remix" : "ai",
      tags: [...new Set([STYLE_INFO[r.style].name.toLowerCase(), ...names, ...(r.border ? ["border"] : [])])],
    }));
    for (const note of built.notes) toast(note, "info");
  };

  const pickClassic = (style: NormalStyle, p: NormalPattern) => {
    load(p, capitalise(`${getThread(used[0]).name} ${STYLE_INFO[style].name.toLowerCase()}`));
    setMeta((m) => ({ ...m, source: m.source === "remix" ? "remix" : "manual", tags: [STYLE_INFO[style].name.toLowerCase()] }));
    toast(`${STYLE_INFO[style].name} loaded. Click knots to make it your own.`, "success");
  };

  const resetKnots = () => {
    commit((p) => ({ ...p, knots: p.knots.map((row) => row.map(() => "f" as Knot)) }));
    toast("Every knot is now a forward knot. Undo to get your pattern back.", "info");
  };

  const exportPng = async (mirrored: boolean) => {
    try {
      await downloadNormalPng(pattern, title, { mirrored });
      toast(mirrored ? "Mirrored PNG downloaded." : "PNG downloaded.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't export.", "warn");
    }
  };
;

  const publish = async (f: PublishFields) => {
    try {
      const { pattern: saved, savedTo } = await publishPattern({
        kind: "normal",
        title: f.title,
        author: f.author,
        tags: f.tags,
        width: n,
        height: rows,
        normal: pattern,
        source: meta.source,
        remixedFrom: meta.remixedFrom,
      });
      saveLocal(KEYS.author, f.author);
      setPublishOpen(false);
      setTitle(f.title);
      setMeta((m) => ({ ...m, tags: f.tags }));
      toast(savedTo === "library" ? "Published to the library!" : "Published! (Saved in this browser on this demo site.)", "success");
      router.push(`/pattern/${saved.id}`);
    } catch (e) {
      toast(e instanceof PublishError ? e.message : "Couldn't publish right now.", "warn");
    }
  }

  const zoom = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((z) => z >= cell);
    const idx = Math.max(0, Math.min(ZOOMS.length - 1, (i === -1 ? ZOOMS.length - 1 : i) + dir));
    setCell(ZOOMS[idx]);
  };

  // ---------- keyboard ----------
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && k === "y") {
        e.preventDefault();
        history.redo();
      } else if (!mod) {
        if (k === "c") setTool("cycle");
        else if (k === "p") setTool("paint");
        else if (["1", "2", "3", "4"].includes(k)) setTool(KNOTS[Number(k) - 1]);
        else if (k === "m") setMirror((m) => !m);
        else if (k === "=" || k === "+") zoom(1);
        else if (k === "-") zoom(-1);
      }
    };
  });
  useEffect(() => {
    const fn = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const toolBtn = (active: boolean) =>
    `flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-left text-sm font-bold transition ${active ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`;

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)]">
      {/* ---------- top bar ---------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white/70 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <label className="group flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 hover:bg-blush/60">
            <PenLine className="h-4 w-4 shrink-0 text-faint group-hover:text-berry" />
            <input
              aria-label="Pattern name"
              className="w-44 min-w-0 bg-transparent font-display text-lg font-semibold outline-none xl:w-56"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <EditorTypeSwitch current="normal" />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SizeFields key={`${n}x${rows}`} strings={n} rows={rows} onResize={resize} />
          <div className="mx-1 h-6 w-px bg-line" />
          <button className="icon-btn" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button className="icon-btn" onClick={history.redo} disabled={!history.canRedo} title="Redo (Shift+Ctrl/Cmd+Z)" aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-line" />
          <button className="icon-btn" onClick={() => zoom(-1)} title="Zoom out" aria-label="Zoom out">
            <Minus className="h-4 w-4" />
          </button>
          <button className="icon-btn" onClick={() => setCell(fitCell(pattern))} title="Fit to screen" aria-label="Fit to screen">
            <Maximize className="h-4 w-4" />
          </button>
          <button className="icon-btn" onClick={() => zoom(1)} title="Zoom in" aria-label="Zoom in">
            <Plus className="h-4 w-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-line" />
          <button className="icon-btn" onClick={resetKnots} title="Set every knot to forward" aria-label="Reset knots">
            <RotateCcw className="h-4 w-4" />
          </button>
          <ExportButton onExport={exportPng} />
          <button className="btn-primary" onClick={() => setPublishOpen(true)}>
            <Send className="h-4 w-4" /> Publish
          </button>
        </div>
      </div>

      {/* ---------- three columns ---------- */}
      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[248px_minmax(0,1fr)_360px]">
        <aside className="space-y-5 border-line p-4 lg:overflow-y-auto lg:border-r">
          <section>
            <h3 className="label">Click a knot to…</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <button className={`${toolBtn(tool === "cycle")} whitespace-nowrap`} onClick={() => setTool("cycle")} title="Cycle through the four knot types (C)">
                <RefreshCw className="h-4 w-4 shrink-0" /> Turn
              </button>
              <button className={`${toolBtn(tool === "paint")} whitespace-nowrap`} onClick={() => setTool("paint")} title="Pick which string's colour shows (P)">
                <Paintbrush className="h-4 w-4 shrink-0" /> Colour
              </button>
            </div>
            <p className="mt-3 mb-1.5 text-[11px] font-bold tracking-wide text-faint uppercase">Or set a knot type</p>
            <div className="grid grid-cols-2 gap-1.5">
              {KNOTS.map((k, j) => (
                <button key={k} className={`${toolBtn(tool === k)} px-2 text-xs leading-tight`} onClick={() => setTool(k)} title={`${KNOT_INFO[k].name} (${j + 1}). Drag to set several.`}>
                  <KnotIcon knot={k} />
                  {KNOT_INFO[k].name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMirror(!mirror)}
              disabled={!canMirror}
              title={canMirror ? "Mirror (M): change both sides at once" : "Mirror needs an even number of strings"}
              className={`mt-1.5 flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${mirrorOn ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`}
            >
              <FlipHorizontal2 className="h-4 w-4" />
              Mirror left / right
              <span className={`ml-auto h-5 w-9 rounded-full p-0.5 transition ${mirrorOn ? "bg-berry" : "bg-line"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition ${mirrorOn ? "translate-x-4" : ""}`} />
              </span>
            </button>
            <p className="mt-2 text-xs leading-snug text-muted">
              {tool === "cycle"
                ? "Each click turns the knot to the next type. The strings re-route and colours update below it."
                : tool === "paint"
                  ? "Click a knot to show the selected colour. A knot can only show one of the two strings that meet there."
                  : `Click or drag across knots to make them ${KNOT_INFO[tool].name.toLowerCase()} knots.`}
            </p>
          </section>

          <section>
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="label mb-0">Thread colours</h3>
              <span className={`text-[11px] font-bold ${used.length >= MAX_COLORS ? "text-berry" : "text-faint"}`}>
                {used.length}/{MAX_COLORS} used
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {THREADS.map((t) => (
                <button
                  key={t.id}
                  title={t.name}
                  onClick={() => setColor(t.id)}
                  className={`relative aspect-square rounded-full border border-black/15 transition hover:scale-110 ${color === t.id ? "scale-110 ring-[3px] ring-berry ring-offset-2" : ""}`}
                  style={{ background: t.hex }}
                >
                  {used.includes(t.id) && <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-white bg-ink" />}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-snug text-muted">
              Click a string&apos;s circle at the top of the pattern to make it{" "}
              <span className="inline-flex items-center gap-1 font-bold text-ink capitalize">
                <span className="h-3 w-3 rounded-full border border-black/15" style={{ background: getThread(color).hex }} />
                {getThread(color).name}
              </span>
              .
            </p>
          </section>
        </aside>

        <main className="flex min-h-[60vh] flex-col lg:min-h-0">
          <div className="border-b border-line bg-cream/80 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs font-bold tracking-wide text-faint uppercase">Worn</span>
              <div className="min-w-0 flex-1 overflow-x-auto">
                <BraceletStrip pattern={pattern} sim={sim} knot={10} rows={Math.max(rows * 2, 72)} />
              </div>
              <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted">
                {meta.remixedFrom && (
                  <span className="chip border-lav-soft bg-lav-soft text-purple-700" title="Publishing credits the original pattern">
                    <GitFork className="h-3.5 w-3.5" /> Remix of {meta.remixTitle ?? "a pattern"}
                  </span>
                )}
                {n} strings · {rows} rows
              </span>
            </div>
          </div>
          <div ref={centerRef} className="relative flex-1 overflow-auto">
            <div className="flex min-h-full min-w-full items-start justify-center p-6">
              <div className="rounded-3xl bg-white/80 p-3 shadow-soft ring-1 ring-line">
                <NormalDiagram
                  pattern={pattern}
                  sim={sim}
                  cell={cell}
                  mirrorLine={mirrorOn}
                  onKnotDown={onKnotDown}
                  onKnotEnter={onKnotEnter}
                  onStringClick={onStringClick}
                />
              </div>
            </div>
          </div>
        </main>

        <aside className="flex flex-col border-line lg:min-h-0 lg:border-l">
          <div className="grid grid-cols-3 gap-1 border-b border-line p-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition ${tab === id ? "bg-blush text-berry-dark" : "text-muted hover:bg-blush/50 hover:text-ink"}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 p-4 lg:overflow-y-auto">
            <div className={tab === "describe" ? "" : "hidden"}>
              <DescribePanel<NormalRecipe>
                onRecipe={applyRecipe}
                endpoint="/api/generate-normal"
                parse={parseNormalDescription}
                examples={EXAMPLES}
                placeholder="e.g. a 10-string ocean chevron"
                subtitle="A style (chevron, zigzag, checkerboard, criss-cross…), colours, a theme or a border."
              />
            </div>
            <div className={tab === "classics" ? "" : "hidden"}>
              <ClassicsPanel colors={used} strings={n} borderColor={color} onPick={pickClassic} />
            </div>
            <div className={tab === "strings" ? "" : "hidden"}>
              <NormalStringPanel pattern={pattern} />
            </div>
          </div>
          {tab !== "strings" && (
            <div className="border-t border-line p-3">
              <NormalStringSummary pattern={pattern} onOpen={() => setTab("strings")} />
            </div>
          )}
        </aside>
      </div>

      <PublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        preview={<BraceletStrip pattern={pattern} sim={sim} rows={Math.max(48, rows * 2)} fluid />}
        initial={{ title, author: loadLocal<string>(KEYS.author, ""), tags: meta.tags }}
        onPublish={publish}
      />
    </div>
  );
}

function SizeFields({ strings, rows, onResize }: { strings: number; rows: number; onResize: (strings: number, rows: number) => void }) {
  const [vs, setVs] = useState(String(strings));
  const [vr, setVr] = useState(String(rows));
  const apply = () => onResize(Number(vs) || strings, Number(vr) || rows);
  const field = (value: string, set: (v: string) => void, label: string, min: number, max: number, step = 1) => (
    <input
      aria-label={label}
      title={`${label} (${min}–${max})`}
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => set(e.target.value)}
      onBlur={apply}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-14 rounded-full border border-line bg-white px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-berry"
    />
  );
  return (
    <div className="flex items-center gap-1 text-sm font-semibold text-muted">
      {field(vs, setVs, "Strings", MIN_STRINGS, MAX_STRINGS)}
      <span className="text-xs">strings ×</span>
      {field(vr, setVr, "Rows (even)", MIN_ROWS, MAX_ROWS, 2)}
      <span className="text-xs">rows</span>
    </div>
  );
}
