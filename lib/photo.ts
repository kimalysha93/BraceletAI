"use client";

import { MAX_HEIGHT, MIN_HEIGHT } from "./constants";
import type { Grid } from "./grid";
import { hexToRgb, labDistance, nearestThreadIdRgb, rgbToLab, THREADS } from "./palette";

export type PhotoOptions = {
  width: number; // knots across
  colors: number; // 3 to 6
  crop: "full" | "square";
  alongBracelet: boolean; // rotate so the photo reads upright when worn
};

type Lab = [number, number, number];

/** Downscale a photo onto the knot grid and reduce it to a few palette colours. No AI involved. */
export function photoToGrid(img: HTMLImageElement, opts: PhotoOptions): Grid {
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (opts.crop === "square") {
    const s = Math.min(sw, sh);
    sx = (sw - s) / 2;
    sy = (sh - s) / 2;
    sw = sh = s;
  }

  const W = opts.width;
  // Along the bracelet: photo width runs down the rows, photo height runs across.
  const rows = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(opts.alongBracelet ? (W * sw) / sh : (W * sh) / sw)));
  const outW = opts.alongBracelet ? rows : W;
  const outH = opts.alongBracelet ? W : rows;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  const data = ctx.getImageData(0, 0, outW, outH).data;

  const labs: Lab[] = [];
  const rgbs: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    const rgb: [number, number, number] = [data[i], data[i + 1], data[i + 2]];
    rgbs.push(rgb);
    labs.push(rgbToLab(rgb));
  }

  // k-means in Lab space, then snap each cluster to the nearest thread colour.
  const centers = kMeans(labs, Math.max(2, Math.min(6, opts.colors)));
  const threadLabs = THREADS.map((t) => ({ id: t.id, lab: rgbToLab(hexToRgb(t.hex)) }));
  const chosen = [
    ...new Set(
      centers.map((c) => threadLabs.reduce((best, t) => (labDistance(c, t.lab) < labDistance(c, best.lab) ? t : best)).id),
    ),
  ];

  const pixelColor = (i: number) => nearestThreadIdRgb(rgbs[i], chosen);
  const grid: Grid = Array.from({ length: rows }, () => Array<string>(W).fill(chosen[0]));
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const id = pixelColor(y * outW + x);
      if (opts.alongBracelet) grid[x][W - 1 - y] = id;
      else grid[y][x] = id;
    }
  }
  return grid;
}

function kMeans(points: Lab[], k: number): Lab[] {
  if (!points.length) return [[100, 0, 0]];
  // Deterministic farthest-point initialisation.
  const centers: Lab[] = [points[0]];
  while (centers.length < k) {
    let best = points[0];
    let bestD = -1;
    for (const p of points) {
      const d = Math.min(...centers.map((c) => labDistance(p, c)));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    if (bestD <= 0) break;
    centers.push(best);
  }
  for (let iter = 0; iter < 10; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of points) {
      let bi = 0;
      let bd = Infinity;
      centers.forEach((c, i) => {
        const d = labDistance(p, c);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      const s = sums[bi];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3]++;
    }
    sums.forEach((s, i) => {
      if (s[3]) centers[i] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
  }
  return centers;
}
