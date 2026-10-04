"use client";

import { ImageIcon, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Grid } from "@/lib/grid";
import { photoToGrid, type PhotoOptions } from "@/lib/photo";
import BraceletThumb from "../BraceletThumb";
import { useToast } from "../ui/Toast";

const MAX_BYTES = 15 * 1024 * 1024;

export default function PhotoPanel({ width, onUse }: { width: number; onUse: (grid: Grid) => void }) {
  const toast = useToast();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [opts, setOpts] = useState<Omit<PhotoOptions, "alongBracelet"> & { alongBracelet: boolean | null }>({
    width: Math.max(8, Math.min(20, width)),
    colors: 4,
    crop: "full",
    alongBracelet: null,
  });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const along = opts.alongBracelet ?? (img ? img.naturalWidth >= img.naturalHeight : true);
  const preview = useMemo(() => (img ? photoToGrid(img, { ...opts, alongBracelet: along }) : null), [img, opts, along]);

  const load = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("That doesn't look like an image.", "warn");
    if (file.size > MAX_BYTES) return toast("That image is a bit big. Try one under 15 MB.", "warn");
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const image = new Image();
      image.onload = () => {
        setImg(image);
        setSrc(url);
      };
      image.onerror = () => toast("Couldn't open that image.", "warn");
      image.src = url;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-soft">
          <ImageIcon className="h-4 w-4 text-emerald-600" />
        </span>
        <div>
          <h3 className="section-title leading-tight">Photo to pattern</h3>
          <p className="text-xs text-muted">Simple shapes and bold colours work best.</p>
        </div>
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          load(e.dataTransfer.files[0]);
        }}
        className={`flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-sm font-semibold transition ${dragging ? "border-berry bg-blush" : "border-line bg-cream hover:border-berry/40"}`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Your upload" className="max-h-32 rounded-xl object-contain" />
        ) : (
          <>
            <Upload className="h-6 w-6 text-berry" />
            Drop a photo here or click to choose
          </>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} />

      {img && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="pw">Knots across: {opts.width}</label>
              <input id="pw" type="range" min={5} max={30} value={opts.width} onChange={(e) => setOpts({ ...opts, width: Number(e.target.value) })} className="w-full accent-berry" />
            </div>
            <div>
              <label className="label" htmlFor="pc">Colours: {opts.colors}</label>
              <input id="pc" type="range" min={3} max={6} value={opts.colors} onChange={(e) => setOpts({ ...opts, colors: Number(e.target.value) })} className="w-full accent-berry" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(["full", "square"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setOpts({ ...opts, crop: c })}
                className={`rounded-2xl border px-2 py-1.5 text-sm font-bold transition ${opts.crop === c ? "border-berry bg-blush text-berry-dark" : "border-line bg-white text-muted hover:text-ink"}`}
              >
                {c === "full" ? "Whole photo" : "Centre square"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-berry" checked={along} onChange={(e) => setOpts({ ...opts, alongBracelet: e.target.checked })} />
            Run the photo along the bracelet
          </label>
          {preview && (
            <div className="rounded-2xl border border-line bg-cream p-3">
              <p className="label">Preview · {preview[0].length} × {preview.length}</p>
              <BraceletThumb grid={preview} maxWidth={320} maxCell={8} />
            </div>
          )}
          <button className="btn-primary w-full py-2.5" onClick={() => preview && onUse(preview)}>
            Use this pattern
          </button>
        </>
      )}
    </div>
  );
}
