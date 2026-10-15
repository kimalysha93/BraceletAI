"use client";

import { APP_NAME } from "./constants";
import { countColors, mirrorGrid, type Grid } from "./grid";
import { getThread } from "./palette";

const FONT = "'Nunito', 'Arial Rounded MT Bold', Arial, sans-serif";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A self-contained SVG of the pattern with legend, row numbers and direction arrows. */
export function patternToSvg(grid: Grid, opts: { title: string; author?: string; cell?: number; mirrored?: boolean }) {
  const cell = opts.cell ?? 22;
  const w = grid[0].length;
  const h = grid.length;
  const pad = 28;
  const numW = 34;
  const arrowW = 26;
  const counts = countColors(grid);

  // Legend chips wrap across lines.
  const gridW = numW + w * cell + arrowW;
  const contentW = Math.max(gridW, 360);
  const chips: { x: number; y: number; id: string; label: string }[] = [];
  let cx = 0;
  let cy = 0;
  for (const { id, count } of counts) {
    const label = `${getThread(id).name} · ${count}`;
    const chipW = 30 + label.length * 7.2;
    if (cx + chipW > contentW && cx > 0) {
      cx = 0;
      cy += 30;
    }
    chips.push({ x: cx, y: cy, id, label });
    cx += chipW + 10;
  }
  const headerH = 64;
  const legendH = cy + 30 + 14;
  const gridTop = pad + headerH + legendH;
  const totalW = contentW + pad * 2;
  const totalH = gridTop + h * cell + 52 + pad;
  const gridLeft = pad + (contentW - gridW) / 2 + numW;
  const r = cell * 0.42;
  const k = cell * 0.86;
  const off = (cell - k) / 2;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
    `<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs>`,
    `<rect width="100%" height="100%" fill="#FFF9F5"/>`,
    `<text x="${pad}" y="${pad + 26}" font-family="${FONT}" font-size="24" font-weight="800" fill="#3B2F3A">${esc(opts.title)}</text>`,
    `<text x="${pad}" y="${pad + 50}" font-family="${FONT}" font-size="14" fill="#8A7A86">${esc(`${opts.author ? `by ${opts.author} · ` : ""}${w} × ${h} knots · ${counts.length} colours${opts.mirrored ? " · mirrored" : ""}`)}</text>`,
  );
  for (const c of chips) {
    const x = pad + c.x;
    const y = pad + headerH + c.y;
    const t = getThread(c.id);
    parts.push(
      `<rect x="${x}" y="${y}" width="${30 + c.label.length * 7.2}" height="24" rx="12" fill="#fff" stroke="#F1E4EA"/>`,
      `<circle cx="${x + 13}" cy="${y + 12}" r="7" fill="${t.hex}" stroke="rgba(0,0,0,.15)"/>`,
      `<text x="${x + 25}" y="${y + 16.5}" font-family="${FONT}" font-size="12.5" fill="#3B2F3A">${esc(c.label)}</text>`,
    );
  }
  // base strings behind the knots
  for (let c = 0; c < w; c++) {
    const x = gridLeft + c * cell + cell / 2;
    parts.push(`<line x1="${x}" y1="${gridTop - 10}" x2="${x}" y2="${gridTop + h * cell + 10}" stroke="#E9DCE3" stroke-width="2" stroke-linecap="round"/>`);
  }
  for (let row = 0; row < h; row++) {
    const y = gridTop + row * cell;
    const n = row + 1;
    const strong = n % 5 === 0;
    parts.push(
      `<text x="${gridLeft - 10}" y="${y + cell * 0.68}" text-anchor="end" font-family="${FONT}" font-size="${strong ? 12 : 10}" font-weight="${n % 10 === 0 ? 800 : strong ? 700 : 400}" fill="${strong ? "#3B2F3A" : "#A898A4"}">${n}</text>`,
      `<text x="${gridLeft + w * cell + 8}" y="${y + cell * 0.7}" font-family="Arial, sans-serif" font-size="12" fill="#B8A8B4">${row % 2 === 0 ? "→" : "←"}</text>`,
    );
    for (let c = 0; c < w; c++) {
      const x = gridLeft + c * cell;
      const hex = getThread(grid[row][c]).hex;
      parts.push(
        `<rect x="${x + off}" y="${y + off}" width="${k}" height="${k}" rx="${r}" fill="${hex}" stroke="rgba(0,0,0,.14)"/>`,
        `<rect x="${x + off}" y="${y + off}" width="${k}" height="${k}" rx="${r}" fill="url(#shade)"/>`,
      );
    }
  }
  parts.push(
    `<text x="${totalW / 2}" y="${totalH - pad + 4}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#B8A8B4">Made with ${esc(APP_NAME)}</text>`,
    `</svg>`,
  );
  return { svg: parts.join(""), width: totalW, height: totalH };
}

export async function downloadPatternPng(grid: Grid, title: string, author?: string, opts: { mirrored?: boolean } = {}) {
  const mirrored = !!opts.mirrored;
  const { svg, width, height } = patternToSvg(mirrored ? mirrorGrid(grid) : grid, { title, author, mirrored });
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't render the pattern image."));
      img.src = url;
    });
    const scale = Math.min(2, 16000 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Couldn't create the PNG.");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bracelet";
    a.download = `${slug}${mirrored ? "-mirrored" : ""}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
