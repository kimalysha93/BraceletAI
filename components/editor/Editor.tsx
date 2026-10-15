"use client";

import {
  GitFork,
  Heart,
  ImageIcon,
  Maximize,
  Minus,
  PenLine,
  Plus,
  Redo2,
  Ruler,
  Send,
  Sparkles,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, MAX_COLORS, MAX_HEIGHT, MAX_WIDTH, MIN_HEIGHT, MIN_WIDTH } from "@/lib/constants";
import { downloadPatternPng } from "@/lib/exportPng";
import {
  copyRect,
  createGrid,
  floodFill,
  inRect,
  mostCommonColor,
  pastePatch,
  rectCells,
  rectFrom,
  replaceColor,
  resizeGrid,
  setCells,
  usedColorIds,
  type Grid,
  type Rect,
} from "@/lib/grid";
import { fetchLibrary, publishPattern, PublishError } from "@/lib/libraryClient";
import { MOTIFS, type MotifId } from "@/lib/motifs";
import { getThread, isValidThread } from "@/lib/palette";
import { LIVE_PUBLISH_OFF, LIVE_SITE, patternHref, withBase } from "@/lib/site";
import { buildFromRecipe, insertMotif, type Recipe } from "@/lib/recipe";
import { KEYS, loadLocal, saveLocal } from "@/lib/storage";
import { isTraditional, type PatternSource } from "@/lib/types";
import BraceletThumb from "../BraceletThumb";
import ExportButton from "../ExportButton";
import KnotGrid, { type Orientation } from "../KnotGrid";
import Legend from "../Legend";
import StringCalculator, { StringSummary } from "../StringCalculator";
import Modal from "../ui/Modal";
import { useToast } from "../ui/Toast";
import DescribePanel from "./DescribePanel";
import EditorTypeSwitch from "./EditorTypeSwitch";
import LeftRail, { type SelectMode, type Tool } from "./LeftRail";
import MotifPanel from "./MotifPanel";
import PhotoPanel from "./PhotoPanel";
import PublishModal, { type PublishFields } from "./PublishModal";
import TextPanel from "./TextPanel";
import { useHistory } from "./useHistory";

type Tab = "describe" | "motifs" | "text" | "photo" | "strings";
type Meta = { title: string; source: PatternSource; remixedFrom?: string; remixTitle?: string; tags: string[] };
type Draft = Meta & { grid: Grid };
type SelectDrag =
  | { kind: "select"; r: number; c: number; moved: boolean }
  | { kind: "move"; r: number; c: number; from: Rect; orig: Grid; base: Grid; patch: Grid };

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "describe", label: "Describe", icon: Sparkles },
  { id: "motifs", label: "Motifs", icon: Heart },
  { id: "text", label: "Text", icon: Type },
  { id: "photo", label: "Photo", icon: ImageIcon },
  { id: "strings", label: "Strings", icon: Ruler },
];

const ZOOMS = [6, 8, 10, 12, 14, 16, 18, 20, 23, 26, 30];

function isDraft(d: unknown): d is Draft {
  const g = (d as Draft | null)?.grid;
  return (
    Array.isArray(g) &&
    g.length >= MIN_HEIGHT &&
    g.length <= MAX_HEIGHT &&
    Array.isArray(g[0]) &&
    g[0].length >= MIN_WIDTH &&
    g[0].length <= MAX_WIDTH &&
    g.every((row) => Array.isArray(row) && row.length === g[0].length && row.every(isValidThread))
  );
}

function readStart() {
  const params = new URLSearchParams(window.location.search);
  const remix = params.get("remix");
  const mode = params.get("mode");
  const draft = !remix && params.get("new") !== "1" ? loadLocal<unknown>(KEYS.draft, null) : null;
  return { remix, mode, draft: isDraft(draft) ? draft : null };
}

function initialCell(rows: number) {
  const avail = window.innerHeight - 56 - 64 - 90;
  return Math.max(10, Math.min(24, Math.floor(avail / rows)));
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

export default function Editor() {
  const router = useRouter();
  const toast = useToast();
  const [start] = useState(readStart);
  const history = useHistory(() => start.draft?.grid ?? createGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT, "white"));
  const { grid, commit } = history;
  const W = grid[0].length;
  const H = grid.length;
  const used = usedColorIds(grid);

  const [meta, setMeta] = useState<Meta>(() => ({
    title: start.draft?.title ?? "Untitled bracelet",
    source: start.draft?.source ?? "manual",
    remixedFrom: start.draft?.remixedFrom,
    remixTitle: start.draft?.remixTitle,
    tags: start.draft?.tags ?? [],
  }));
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState(() => (start.draft ? (usedColorIds(start.draft.grid)[1] ?? "hot-pink") : "hot-pink"));
  const [bg, setBg] = useState(() => (start.draft ? mostCommonColor(start.draft.grid) : "white"));
  const [mirror, setMirror] = useState(false);
  const [cell, setCell] = useState(() => initialCell(start.draft?.grid.length ?? DEFAULT_HEIGHT));
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [tab, setTab] = useState<Tab>(start.mode === "draw" ? "motifs" : "describe");
  const [publishOpen, setPublishOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const centerRef = useRef<HTMLDivElement>(null);
  const strokeColor = useRef<string | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [selectMode, setSelectMode] = useState<SelectMode>("move");
  const selectDrag = useRef<SelectDrag | null>(null);
  // Only show a selection that still fits (the pattern may have been resized or replaced).
  const sel = tool === "select" && selection && selection.r1 < H && selection.c1 < W ? selection : null;

  // ---------- loading patterns ----------

  const fitCell = useCallback((g: Grid, o: Orientation) => {
    const el = centerRef.current;
    if (!el) return 14;
    const rows = g.length;
    const cols = g[0].length;
    if (o === "horizontal") return Math.max(6, Math.min(26, Math.floor((el.clientWidth - 110) / rows)));
    const byH = Math.floor((el.clientHeight - 90) / rows);
    const byW = Math.floor((el.clientWidth - 90) / cols);
    return Math.max(10, Math.min(26, byH, byW));
  }, []);

  const loadPattern = useCallback(
    (g: Grid, next: Partial<Meta>, opts: { fresh?: boolean } = {}) => {
      setSelection(null);
      if (opts.fresh) history.reset(g);
      else commit(g);
      setBg(mostCommonColor(g));
      setCell(fitCell(g, orientation));
      setMeta((m) => ({
        ...m,
        ...next,
        // a remix stays a remix even after AI or text changes
        source: m.source === "remix" && !opts.fresh ? "remix" : (next.source ?? m.source),
      }));
    },
    [commit, fitCell, history, orientation],
  );

  useEffect(() => {
    if (!start.remix) return;
    let alive = true;
    fetchLibrary().then((all) => {
      const p = all.find((x) => x.id === start.remix);
      if (!alive) return;
      if (!p) {
        toast("Couldn't find that pattern to remix.", "warn");
        return;
      }
      // Traditional patterns are remixed in their own editor.
      if (isTraditional(p)) {
        router.replace(`/create/normal?remix=${encodeURIComponent(p.id)}`);
        return;
      }
      loadPattern(
        p.grid,
        { title: `${p.title} (remix)`, source: "remix", remixedFrom: p.id, remixTitle: p.title, tags: p.tags.filter((t) => t !== "remix") },
        { fresh: true },
      );
      setColor(usedColorIds(p.grid)[1] ?? "hot-pink");
      toast(
        <>
          Remixing <b>{p.title}</b> by {p.author}. Make it yours!
        </>,
        "info",
      );
      window.history.replaceState(null, "", withBase("/create"));
    });
    return () => {
      alive = false;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave the draft so a refresh never loses work.
  useEffect(() => {
    const t = setTimeout(() => saveLocal(KEYS.draft, { ...meta, grid } satisfies Draft), 300);
    return () => clearTimeout(t);
  }, [grid, meta]);

  // ---------- painting ----------

  const canUse = (id: string) => {
    const ids = used;
    if (ids.includes(id) || ids.length < MAX_COLORS) return true;
    toast(`Patterns can use up to ${MAX_COLORS} colours. Swap one out first.`, "warn");
    return false;
  };

  const cellsFor = (r: number, c: number): [number, number][] => (mirror ? [[r, c], [r, W - 1 - c]] : [[r, c]]);

  // ---------- selecting and moving ----------

  const onSelectStart = (r: number, c: number, alt: boolean) => {
    if (sel && inRect(sel, r, c)) {
      // Lift the knots; a move leaves the background colour behind, a copy leaves the original.
      const copy = (selectMode === "copy") !== alt;
      const patch = copyRect(grid, sel);
      const base = copy ? grid : setCells(grid, rectCells(sel), bg);
      selectDrag.current = { kind: "move", r, c, from: sel, orig: grid, base, patch };
      history.beginStroke();
      return;
    }
    selectDrag.current = { kind: "select", r, c, moved: false };
    setSelection(rectFrom(r, c, r, c));
  };

  const onSelectMove = (r: number, c: number) => {
    const d = selectDrag.current;
    if (!d) return;
    if (d.kind === "select") {
      d.moved = true;
      setSelection(rectFrom(d.r, d.c, r, c));
      return;
    }
    // Keep the whole box on the pattern so nothing gets cut off.
    const dr = Math.max(-d.from.r0, Math.min(H - 1 - d.from.r1, r - d.r));
    const dc = Math.max(-d.from.c0, Math.min(W - 1 - d.from.c1, c - d.c));
    const to = { r0: d.from.r0 + dr, c0: d.from.c0 + dc, r1: d.from.r1 + dr, c1: d.from.c1 + dc };
    history.strokeUpdate(() => (dr === 0 && dc === 0 ? d.orig : pastePatch(d.base, d.patch, to.r0, to.c0)));
    setSelection(to);
  };

  const onSelectEnd = () => {
    const d = selectDrag.current;
    selectDrag.current = null;
    if (!d) return;
    if (d.kind === "move") history.endStroke();
    else if (!d.moved) setSelection(null); // a plain click deselects
  };

  // Undo/redo can put knots back somewhere else, so drop the box rather than outline the wrong spot.
  const undo = () => {
    setSelection(null);
    history.undo();
  };
  const redo = () => {
    setSelection(null);
    history.redo();
  };

  const clearSelection = () => {
    if (sel) commit((g) => setCells(g, rectCells(sel), bg));
  };

  const onStrokeStart = (r: number, c: number, mods: { alt: boolean }) => {
    if (tool === "select") return onSelectStart(r, c, mods.alt);
    if (tool === "picker") {
      setColor(grid[r][c]);
      setTool("pencil");
      return;
    }
    if (tool === "fill") {
      if (!canUse(color)) return;
      commit((g) => {
        let n = floodFill(g, r, c, color);
        if (mirror) n = floodFill(n, r, W - 1 - c, color);
        return n;
      });
      return;
    }
    const col = tool === "eraser" ? bg : color;
    if (!canUse(col)) return;
    strokeColor.current = col;
    history.beginStroke();
    history.strokeUpdate((g) => setCells(g, cellsFor(r, c), col));
  };

  const onStrokeMove = (r: number, c: number) => {
    if (tool === "select") return onSelectMove(r, c);
    const col = strokeColor.current;
    if (!col) return;
    history.strokeUpdate((g) => setCells(g, cellsFor(r, c), col));
  };

  const onStrokeEnd = () => {
    if (tool === "select") return onSelectEnd();
    if (!strokeColor.current) return;
    strokeColor.current = null;
    history.endStroke();
  };

  // ---------- actions ----------

  const makeBackground = (id: string) => {
    if (id === bg) return;
    commit((g) => replaceColor(g, bg, id));
    setBg(id);
    toast(`Background is now ${getThread(id).name}.`, "success");
  };

  const replace = (from: string, to: string) => {
    commit((g) => replaceColor(g, from, to));
    if (from === bg) setBg(to);
    if (color === from) setColor(to);
    toast(`Swapped ${getThread(from).name} for ${getThread(to).name}. String lengths updated.`, "success");
  };

  const resize = (w: number, h: number) => {
    const nw = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(w)));
    const nh = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(h)));
    if (nw === W && nh === H) return;
    commit((g) => resizeGrid(g, nw, nh, bg));
  };

  const applyRecipe = (recipe: Recipe) => {
    // Keep the bracelet the size it already is; the builder fits the design inside it.
    const built = buildFromRecipe(recipe, { width: W, height: H });
    const r = built.recipe;
    const name = r.text ? titleCase(r.text) : r.motifs.length ? r.motifs.map((m) => MOTIFS[m].name).join(" & ") : "My";
    loadPattern(built.grid, {
      title: `${name} bracelet`,
      source: "ai",
      tags: [...new Set([...r.motifs, getThread(r.backgroundColor).name, getThread(r.mainColor).name, ...(r.text ? ["word"] : [])])],
    });
    setColor(r.mainColor);
    for (const n of built.notes) toast(n, "info");
  };

  const makeText = (recipe: Recipe, spacing: number) => {
    const built = buildFromRecipe(recipe, { letterSpacing: spacing });
    loadPattern(built.grid, { title: titleCase(built.recipe.text), source: "text", tags: ["word", getThread(recipe.backgroundColor).name] });
    for (const n of built.notes) toast(n, "info");
  };

  const addMotif = (id: MotifId, row: number, col: string, detail: string) => {
    if (!canUse(col)) return;
    if (detail !== col && !used.includes(detail) && used.length + (used.includes(col) ? 0 : 1) >= MAX_COLORS) {
      toast(`That would go over ${MAX_COLORS} colours, so the detail uses the same colour.`, "info");
      detail = col;
    }
    commit((g) => insertMotif(g, id, row, col, detail));
    setMeta((m) => ({ ...m, source: m.source === "manual" ? "motif" : m.source, tags: [...new Set([...m.tags, id])] }));
  };

  const usePhoto = (g: Grid) => {
    loadPattern(g, { title: "Photo bracelet", source: "photo", tags: ["photo"] });
  };

  const exportPng = async (mirrored: boolean) => {
    try {
      await downloadPatternPng(grid, meta.title, undefined, { mirrored });
      toast(mirrored ? "Mirrored PNG downloaded." : "PNG downloaded.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't export.", "warn");
    }
  };

  const publish = async (f: PublishFields) => {
    try {
      const { pattern, savedTo } = await publishPattern({
        title: f.title,
        author: f.author,
        tags: f.tags,
        width: W,
        height: H,
        grid,
        source: meta.source,
        remixedFrom: meta.remixedFrom,
      });
      saveLocal(KEYS.author, f.author);
      setPublishOpen(false);
      setMeta((m) => ({ ...m, title: f.title, tags: f.tags }));
      toast(savedTo === "library" ? "Published to the library!" : "Published! (Saved in this browser on this demo site.)", "success");
      router.push(patternHref(pattern.id));
    } catch (e) {
      toast(e instanceof PublishError ? e.message : "Couldn't publish right now.", "warn");
    }
  };

  const zoom = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((z) => z >= cell);
    const idx = Math.max(0, Math.min(ZOOMS.length - 1, (i === -1 ? ZOOMS.length - 1 : i) + dir));
    setCell(ZOOMS[idx]);
  };

  const switchView = (o: Orientation) => {
    setOrientation(o);
    setCell(fitCell(grid, o));
  };

  // ---------- keyboard shortcuts ----------
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && k === "y") {
        e.preventDefault();
        redo();
      } else if (sel && (k === "escape" || k === "delete" || k === "backspace")) {
        e.preventDefault();
        if (k === "escape") setSelection(null);
        else clearSelection();
      } else if (!mod) {
        if (k === "p") setTool("pencil");
        else if (k === "s") setTool("select");
        else if (k === "f") setTool("fill");
        else if (k === "e") setTool("eraser");
        else if (k === "i") setTool("picker");
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

  const author = typeof window !== "undefined" ? loadLocal<string>(KEYS.author, "") : "";

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem-var(--banner-h,0px))]">
      {/* ---------- top bar ---------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white/70 px-4 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <label className="group flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 hover:bg-blush/60">
            <PenLine className="h-4 w-4 shrink-0 text-faint group-hover:text-berry" />
            <input
              aria-label="Pattern name"
              className="w-48 min-w-0 bg-transparent font-display text-lg font-semibold outline-none xl:w-60"
              value={meta.title}
              maxLength={60}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            />
          </label>
          <EditorTypeSwitch current="alpha" />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SizeFields key={`${W}x${H}`} w={W} h={H} onResize={resize} />
          <div className="mx-1 h-6 w-px bg-line" />
          <button className="icon-btn" onClick={undo} disabled={!history.canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button className="icon-btn" onClick={redo} disabled={!history.canRedo} title="Redo (Shift+Ctrl/Cmd+Z)" aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-line" />
          <button className="icon-btn" onClick={() => zoom(-1)} title="Zoom out" aria-label="Zoom out">
            <Minus className="h-4 w-4" />
          </button>
          <button className="icon-btn" onClick={() => setCell(fitCell(grid, orientation))} title="Fit to screen" aria-label="Fit to screen">
            <Maximize className="h-4 w-4" />
          </button>
          <button className="icon-btn" onClick={() => zoom(1)} title="Zoom in" aria-label="Zoom in">
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex rounded-full border border-line bg-white p-0.5">
            {(
              [
                ["vertical", "Pattern"],
                ["horizontal", "Bracelet"],
              ] as const
            ).map(([o, label]) => (
              <button
                key={o}
                onClick={() => switchView(o)}
                className={`rounded-full px-3 py-1 text-sm font-bold transition ${orientation === o ? "bg-berry text-white" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mx-1 h-6 w-px bg-line" />
          <button className="icon-btn" onClick={() => setClearOpen(true)} title="Clear pattern" aria-label="Clear pattern">
            <Trash2 className="h-4 w-4" />
          </button>
          <ExportButton onExport={exportPng} />
          {/* The wrapper carries the tooltip: disabled buttons don't show one. */}
          <span title={LIVE_SITE ? LIVE_PUBLISH_OFF : undefined}>
            <button className="btn-primary" onClick={() => setPublishOpen(true)} disabled={LIVE_SITE}>
              <Send className="h-4 w-4" /> Publish
            </button>
          </span>
        </div>
      </div>

      {/* ---------- three columns ---------- */}
      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[248px_minmax(0,1fr)_360px]">
        <aside className="border-line p-4 lg:overflow-y-auto lg:border-r">
          <LeftRail
            tool={tool}
            setTool={setTool}
            mirror={mirror}
            setMirror={setMirror}
            selectMode={selectMode}
            setSelectMode={setSelectMode}
            hasSelection={!!sel}
            color={color}
            setColor={setColor}
            bg={bg}
            usedColors={used}
            onMakeBackground={makeBackground}
            onReplace={replace}
          />
        </aside>

        <main className="flex min-h-[60vh] flex-col lg:min-h-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cream/80 px-4 py-2">
            <Legend grid={grid} selected={color} onSelect={(id) => setColor(id)} />
            <span className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted">
              {meta.remixedFrom && (
                <span className="chip border-lav-soft bg-lav-soft text-purple-700" title="Publishing credits the original pattern">
                  <GitFork className="h-3.5 w-3.5" /> Remix of {meta.remixTitle ?? "a pattern"}
                </span>
              )}
              {W} knots wide · {H} rows
            </span>
          </div>
          <div ref={centerRef} className="relative flex-1 overflow-auto">
            <div className="flex min-h-full min-w-full items-start justify-center p-6">
              <div className="rounded-3xl bg-white/80 p-3 shadow-soft ring-1 ring-line">
                <KnotGrid
                  grid={grid}
                  cell={cell}
                  orientation={orientation}
                  interactive
                  mirrorLine={mirror && tool !== "select"}
                  selection={sel}
                  clampDrag={tool === "select"}
                  onStrokeStart={onStrokeStart}
                  onStrokeMove={onStrokeMove}
                  onStrokeEnd={onStrokeEnd}
                />
              </div>
            </div>
          </div>
        </main>

        <aside className="flex flex-col border-line lg:min-h-0 lg:border-l">
          <div className="grid grid-cols-5 gap-1 border-b border-line p-2">
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
              <DescribePanel onRecipe={applyRecipe} autoFocus={start.mode === "ai"} />
            </div>
            <div className={tab === "motifs" ? "" : "hidden"}>
              <MotifPanel color={color} onColor={setColor} bg={bg} height={H} onInsert={addMotif} />
            </div>
            <div className={tab === "text" ? "" : "hidden"}>
              <TextPanel initialBg={bg} width={W} onMake={makeText} />
            </div>
            <div className={tab === "photo" ? "" : "hidden"}>
              <PhotoPanel width={W} onUse={usePhoto} />
            </div>
            <div className={tab === "strings" ? "" : "hidden"}>
              <StringCalculator grid={grid} />
            </div>
          </div>
          {tab !== "strings" && (
            <div className="border-t border-line p-3">
              <StringSummary grid={grid} onOpen={() => setTab("strings")} />
            </div>
          )}
        </aside>
      </div>

      <PublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        preview={<BraceletThumb grid={grid} maxWidth={400} />}
        initial={{ title: meta.title, author, tags: meta.tags }}
        onPublish={publish}
      />
      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title="Start over?">
        <p className="mb-5 text-sm text-muted">
          This fills the whole pattern with the background colour. You can still undo it.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn-soft" onClick={() => setClearOpen(false)}>
            Keep it
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              commit(createGrid(W, H, bg));
              setMeta({ title: "Untitled bracelet", source: "manual", tags: [] });
              setClearOpen(false);
            }}
          >
            <Trash2 className="h-4 w-4" /> Clear pattern
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SizeFields({ w, h, onResize }: { w: number; h: number; onResize: (w: number, h: number) => void }) {
  const [vw, setVw] = useState(String(w));
  const [vh, setVh] = useState(String(h));
  const apply = () => onResize(Number(vw) || w, Number(vh) || h);
  const field = (value: string, set: (v: string) => void, label: string, min: number, max: number) => (
    <input
      aria-label={label}
      title={`${label} (${min}–${max})`}
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => set(e.target.value)}
      onBlur={apply}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-14 rounded-full border border-line bg-white px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-berry"
    />
  );
  return (
    <div className="flex items-center gap-1 text-sm font-semibold text-muted">
      {field(vw, setVw, "Knots across", MIN_WIDTH, MAX_WIDTH)}
      <span>×</span>
      {field(vh, setVh, "Rows", MIN_HEIGHT, MAX_HEIGHT)}
    </div>
  );
}
