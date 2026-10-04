import { createGrid, type Grid } from "./grid";

export const BACKGROUND_STYLES = ["solid", "stripes", "diagonal", "zigzag", "checker", "gradient"] as const;
export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];

/** Fill a whole grid with a repeating background made from the given colours. */
export function paintBackground(width: number, height: number, style: BackgroundStyle, colors: string[]): Grid {
  const cs = colors.length ? colors : ["white"];
  const n = cs.length;
  const mid = (width - 1) / 2;
  const grid = createGrid(width, height, cs[0]);
  if (style === "solid" || n === 1) return grid;

  // Ombré: one band per colour along the length, with a dithered row where colours meet.
  const band = height / n;
  return grid.map((row, r) =>
    row.map((_, c) => {
      switch (style) {
        case "stripes":
          return cs[Math.floor(r / 3) % n];
        case "diagonal":
          return cs[Math.floor((r + c) / 2) % n];
        case "zigzag":
          return cs[Math.floor((r + Math.round(Math.abs(c - mid))) / 3) % n];
        case "checker":
          return cs[(Math.floor(r / 2) + Math.floor(c / 2)) % n];
        case "gradient": {
          const i = Math.min(n - 1, Math.floor(r / band));
          const next = Math.min(n - 1, i + 1);
          const intoBand = r - i * band;
          // last 2 rows of a band blend into the next colour
          if (next !== i && intoBand >= band - 2) return (r + c) % 2 ? cs[next] : cs[i];
          return cs[i];
        }
        default:
          return cs[0];
      }
    }),
  );
}

/** Ready-made colour sets for themes people often ask for. */
export const THEMES: Record<string, { colors: string[]; style: BackgroundStyle; main?: string; motifs?: string[] }> = {
  rainbow: { colors: ["red", "orange", "yellow", "green", "sky-blue", "purple"], style: "diagonal", main: "white" },
  sunset: { colors: ["yellow", "orange", "coral", "hot-pink", "purple"], style: "gradient", main: "white" },
  ocean: { colors: ["mint", "teal", "sky-blue", "blue", "navy"], style: "gradient", main: "white", motifs: ["fish"] },
  beach: { colors: ["sky-blue", "beige", "yellow"], style: "gradient", main: "white", motifs: ["sun"] },
  pastel: { colors: ["pink", "lavender", "mint", "sky-blue", "peach"], style: "stripes", main: "white" },
  halloween: { colors: ["black", "purple"], style: "stripes", main: "orange", motifs: ["pumpkin", "ghost", "bat"] },
  spooky: { colors: ["black", "purple"], style: "checker", main: "white", motifs: ["ghost", "bat"] },
  christmas: { colors: ["red", "white", "green"], style: "stripes", main: "white", motifs: ["snowflake"] },
  winter: { colors: ["navy", "sky-blue", "white"], style: "gradient", main: "white", motifs: ["snowflake"] },
  spring: { colors: ["mint", "pink", "yellow"], style: "zigzag", main: "white", motifs: ["flower", "butterfly"] },
  candy: { colors: ["hot-pink", "white"], style: "diagonal", main: "white" },
  galaxy: { colors: ["black", "navy", "purple"], style: "gradient", main: "white", motifs: ["star", "moon"] },
  forest: { colors: ["dark-green", "green", "lime"], style: "zigzag", main: "white", motifs: ["tree"] },
  autumn: { colors: ["burgundy", "orange", "yellow", "brown"], style: "gradient", main: "white", motifs: ["leaf"] },
  fall: { colors: ["burgundy", "orange", "yellow", "brown"], style: "gradient", main: "white", motifs: ["leaf"] },
  summer: { colors: ["hot-pink", "yellow", "sky-blue"], style: "stripes", main: "white", motifs: ["icecream", "sun"] },
  fairy: { colors: ["mint", "lavender", "pink"], style: "zigzag", main: "white", motifs: ["mushroom", "butterfly"] },
  cottagecore: { colors: ["cream", "mint", "pink"], style: "checker", main: "brown", motifs: ["mushroom", "strawberry"] },
  royal: { colors: ["purple", "navy"], style: "diagonal", main: "yellow", motifs: ["crown"] },
  nautical: { colors: ["navy", "white"], style: "stripes", main: "red", motifs: ["anchor"] },
  birthday: { colors: ["pink", "yellow", "sky-blue", "mint"], style: "checker", main: "white", motifs: ["cupcake", "gift"] },
  easter: { colors: ["lavender", "mint", "yellow", "pink"], style: "stripes", main: "white", motifs: ["bunny"] },
  space: { colors: ["black", "navy", "purple"], style: "gradient", main: "white", motifs: ["rocket", "planet"] },
  lucky: { colors: ["green", "dark-green"], style: "checker", main: "white", motifs: ["clover"] },
};
