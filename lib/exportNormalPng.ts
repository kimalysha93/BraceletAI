"use client";

import { APP_NAME } from "./constants";
import { downloadSvgAsPng, esc, fileSlug, FONT } from "./exportPng";
import { KNOT_INFO, KNOTS, mirrorNormal, simulate, type NormalPattern } from "./normal";
import { braceletDiamonds, knotArrow, normalLayout } from "./normalLayout";
import { stringLabel } from "./normalStrings";
import { getThread, luminance } from "./palette";

/** A self-contained SVG of a traditional pattern: preview, string letters, knots with arrows and a knot key. */
export function normalPatternToSvg(p: NormalPattern, opts: { title: string; author?: string; mirrored?: boolean }) {
  const sim = simulate(p);
  const n = p.strings.length;
  const rows = p.knots.length;
  const cell = 26;
  const pad = 28;
  const numW = 30;
  const headerH = 64;

  // Colour key: how many knots show each colour.
  const counts = new Map<string, number>();
  sim.colors.flat().forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
  const chips = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const strip = braceletDiamonds(p, sim, 6.2, 5, Math.max(rows * 2, 48));
  const diagramW = numW + n * cell + 20;
  const contentW = Math.max(diagramW, strip.width, 380);
  const totalW = contentW + pad * 2;

  let y = pad + headerH;
  const parts: string[] = [];
  const chipParts: string[] = [];
  let cx = 0;
  for (const [id, count] of chips) {
    const label = `${getThread(id).name} · ${count}`;
    const w = 30 + label.length * 7.2;
    if (cx + w > contentW && cx > 0) {
      cx = 0;
      y += 30;
    }
    chipParts.push(
      `<rect x="${pad + cx}" y="${y}" width="${w}" height="24" rx="12" fill="#fff" stroke="#F1E4EA"/>`,
      `<circle cx="${pad + cx + 13}" cy="${y + 12}" r="7" fill="${getThread(id).hex}" stroke="rgba(0,0,0,.15)"/>`,
      `<text x="${pad + cx + 25}" y="${y + 16.5}" font-family="${FONT}" font-size="12.5" fill="#3B2F3A">${esc(label)}</text>`,
    );
    cx += w + 10;
  }
  y += 24 + 18;

  // Worn preview.
  const stripX = pad + (contentW - strip.width) / 2;
  const stripY = y;
  y += strip.height + 26;

  // Diagram.
  const left = pad + (contentW - diagramW) / 2 + numW;
  const lettersY = y;
  const top = y + 44;
  const L = normalLayout(p, sim, cell, left, top);
  const keyY = top + L.height + 26;
  const totalH = keyY + 64 + 34 + pad;

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
    `<defs><radialGradient id="shade" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#3b2f3a" stop-opacity=".22"/></radialGradient></defs>`,
    `<rect width="100%" height="100%" fill="#FFF9F5"/>`,
    `<text x="${pad}" y="${pad + 26}" font-family="${FONT}" font-size="24" font-weight="800" fill="#3B2F3A">${esc(opts.title)}</text>`,
    `<text x="${pad}" y="${pad + 50}" font-family="${FONT}" font-size="14" fill="#8A7A86">${esc(`${opts.author ? `by ${opts.author} · ` : ""}Traditional · ${n} strings · ${rows} rows${opts.mirrored ? " · mirrored" : ""}`)}</text>`,
    ...chipParts,
    `<g transform="translate(${stripX},${stripY})"><rect x="-4" y="-4" width="${strip.width + 8}" height="${strip.height + 8}" rx="${strip.height / 4}" fill="#F4EAF0"/>`,
    ...strip.diamonds.map(
      (d) => `<polygon points="${d.x - 6.2},${d.y} ${d.x},${d.y - 5} ${d.x + 6.2},${d.y} ${d.x},${d.y + 5}" fill="${getThread(d.color).hex}" stroke="rgba(59,47,58,.18)" stroke-width=".6"/>`,
    ),
    `</g>`,
  );

  // String letters and starting colours.
  p.strings.forEach((id, s) => {
    const x = L.x(s);
    parts.push(
      `<text x="${x}" y="${lettersY + 12}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="800" fill="#8A7A86">${stringLabel(s)}</text>`,
      `<circle cx="${x}" cy="${lettersY + 28}" r="9" fill="${getThread(id).hex}" stroke="rgba(59,47,58,.25)"/>`,
      `<line x1="${x}" y1="${lettersY + 37}" x2="${x}" y2="${top}" stroke="${getThread(id).hex}" stroke-width="5" stroke-linecap="round"/>`,
    );
  });
  for (const seg of L.segments) {
    parts.push(
      `<polyline points="${seg.points.map((pt) => pt.join(",")).join(" ")}" fill="none" stroke="${getThread(seg.color).hex}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }
  for (let r = 0; r < rows; r++) {
    const n1 = r + 1;
    parts.push(
      `<text x="${left - 12}" y="${top + r * cell + cell * 0.62}" text-anchor="end" font-family="${FONT}" font-size="${n1 % 10 === 0 ? 12 : 10}" font-weight="${n1 % 10 === 0 ? 800 : 500}" fill="${n1 % 10 === 0 ? "#C93D7A" : "#A898A4"}">${n1}</text>`,
    );
  }
  const radius = cell * 0.6;
  for (const k of L.knots) {
    const hex = getThread(k.color).hex;
    const ink = luminance(hex) > 0.55 ? "rgba(59,47,58,.7)" : "rgba(255,255,255,.92)";
    const a = knotArrow(k.knot, k.cx, k.cy, radius * 0.42);
    parts.push(
      `<circle cx="${k.cx}" cy="${k.cy}" r="${radius}" fill="${hex}" stroke="rgba(59,47,58,.22)"/>`,
      `<circle cx="${k.cx}" cy="${k.cy}" r="${radius}" fill="url(#shade)"/>`,
      `<path d="${a.line}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="${a.head}" fill="${ink}" stroke="${ink}" stroke-width=".5" stroke-linejoin="round"/>`,
    );
  }

  // Knot key, two per line.
  const keyW = contentW / 2;
  KNOTS.forEach((k, j) => {
    const x = pad + (j % 2) * keyW + 16;
    const ky = keyY + Math.floor(j / 2) * 32;
    const a = knotArrow(k, x, ky + 14, 5.5);
    parts.push(
      `<circle cx="${x}" cy="${ky + 14}" r="13" fill="#fff" stroke="#E9DCE3"/>`,
      `<path d="${a.line}" fill="none" stroke="#3B2F3A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="${a.head}" fill="#3B2F3A"/>`,
      `<text x="${x + 20}" y="${ky + 18.5}" font-family="${FONT}" font-size="12" fill="#3B2F3A">${KNOT_INFO[k].name} knot</text>`,
    );
  });

  parts.push(
    `<text x="${totalW / 2}" y="${totalH - pad + 4}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#B8A8B4">Made with ${esc(APP_NAME)}</text>`,
    `</svg>`,
  );
  return { svg: parts.join(""), width: totalW, height: totalH };
}

export async function downloadNormalPng(p: NormalPattern, title: string, opts: { mirrored?: boolean; author?: string } = {}) {
  const mirrored = !!opts.mirrored;
  const { svg, width, height } = normalPatternToSvg(mirrored ? mirrorNormal(p) : p, { title, author: opts.author, mirrored });
  await downloadSvgAsPng(svg, width, height, `${fileSlug(title)}${mirrored ? "-mirrored" : ""}.png`);
}
