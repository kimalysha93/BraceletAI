import { createGrid, paletteFor, replaceColor, type Grid } from "./grid";
import { buildFromRecipe, sanitizeRecipe, type Recipe } from "./recipe";
import type { AlphaPattern, PatternSource } from "./types";

// Sample library patterns, all made with this app's own font and motifs. Authors are made up.

function fromRecipe(r: Partial<Recipe>): Grid {
  return buildFromRecipe(sanitizeRecipe(r)).grid;
}

function bands(width: number, height: number, colors: string[], band: number, diagonal = false): Grid {
  return createGrid(width, height, colors[0]).map((row, r) =>
    row.map((_, c) => colors[Math.floor((diagonal ? r + c : r) / band) % colors.length]),
  );
}

function checker(width: number, height: number, a: string, b: string, size = 2): Grid {
  return createGrid(width, height, a).map((row, r) =>
    row.map((_, c) => ((Math.floor(r / size) + Math.floor(c / size)) % 2 ? b : a)),
  );
}

function zigzag(width: number, height: number, colors: string[], band = 3): Grid {
  const mid = (width - 1) / 2;
  return createGrid(width, height, colors[0]).map((row, r) =>
    row.map((_, c) => colors[Math.floor((r + Math.round(Math.abs(c - mid))) / band) % colors.length]),
  );
}

type SeedDef = {
  id: string;
  title: string;
  author: string;
  tags: string[];
  source: PatternSource;
  grid: Grid;
  remixedFrom?: string;
  day: number;
};

const maya = fromRecipe({ text: "MAYA", motifs: ["heart"], motifPlacement: "ends", backgroundColor: "pink", mainColor: "white", accentColor: "hot-pink", border: "none", width: 11 });
const hello = fromRecipe({ text: "HELLO", motifs: ["star"], motifPlacement: "ends", backgroundColor: "teal", mainColor: "white", accentColor: "yellow", border: "none", width: 11 });

const DEFS: SeedDef[] = [
  { id: "seed-maya", title: "Maya with hearts", author: "Jess K.", tags: ["name", "hearts", "pink"], source: "text", grid: maya, day: 2 },
  { id: "seed-hello", title: "Hello stars", author: "Priya", tags: ["word", "stars", "teal"], source: "ai", grid: hello, day: 3 },
  { id: "seed-bff", title: "BFF stripes", author: "Noor & Ellie", tags: ["bff", "friends", "purple", "stripes"], source: "text", day: 4,
    grid: fromRecipe({ text: "BFF", motifs: ["heart"], motifPlacement: "ends", backgroundColor: "lavender", mainColor: "purple", accentColor: "white", border: "stripes", width: 13 }) },
  { id: "seed-sunny", title: "Sunny days", author: "Marco", tags: ["sun", "summer", "yellow"], source: "ai", day: 5,
    grid: fromRecipe({ text: "SUNNY", motifs: ["sun"], motifPlacement: "repeat", backgroundColor: "sky-blue", mainColor: "white", accentColor: "yellow", border: "none", width: 13 }) },
  { id: "seed-rainbow", title: "Rainbow diagonals", author: "Sam T.", tags: ["rainbow", "stripes", "beginner"], source: "manual", day: 6,
    grid: bands(12, 40, ["red", "orange", "yellow", "green", "sky-blue", "purple"], 2, true) },
  { id: "seed-cherry", title: "Cherry picking", author: "Lou", tags: ["cherry", "fruit", "cute"], source: "motif", day: 7,
    grid: fromRecipe({ text: "", motifs: ["cherry"], motifPlacement: "repeat", backgroundColor: "cream", mainColor: "red", accentColor: "red", border: "dots", width: 13 }) },
  { id: "seed-night", title: "Moon and stars", author: "Aiko", tags: ["moon", "stars", "night", "navy"], source: "motif", day: 8,
    grid: fromRecipe({ text: "", motifs: ["moon", "star"], motifPlacement: "repeat", backgroundColor: "navy", mainColor: "yellow", accentColor: "yellow", border: "none", width: 13 }) },
  { id: "seed-checkers", title: "Checkerboard", author: "Dev", tags: ["checker", "black and white", "beginner"], source: "manual", day: 9,
    grid: checker(12, 36, "white", "black", 2) },
  { id: "seed-butterfly", title: "Butterfly garden", author: "Rosa M.", tags: ["butterfly", "spring", "lavender"], source: "motif", day: 10,
    grid: fromRecipe({ text: "", motifs: ["butterfly", "flower"], motifPlacement: "repeat", backgroundColor: "mint", mainColor: "purple", accentColor: "purple", border: "none", width: 13 }) },
  { id: "seed-love", title: "L-O-V-E", author: "Hannah", tags: ["love", "hearts", "red", "word"], source: "text", day: 11,
    grid: fromRecipe({ text: "LOVE", motifs: ["heart"], motifPlacement: "between_letters", backgroundColor: "white", mainColor: "red", accentColor: "pink", border: "none", width: 11 }) },
  { id: "seed-paws", title: "Puppy paws", author: "Theo", tags: ["paw", "dog", "pets", "brown"], source: "motif", day: 12,
    grid: fromRecipe({ text: "", motifs: ["paw"], motifPlacement: "repeat", backgroundColor: "beige", mainColor: "brown", accentColor: "brown", border: "stripes", width: 13 }) },
  { id: "seed-zigzag", title: "Mint zigzag", author: "Kira", tags: ["zigzag", "chevron", "mint", "beginner"], source: "manual", day: 13,
    grid: zigzag(11, 40, ["mint", "teal", "white"], 3) },
  { id: "seed-kitty", title: "Kitty club", author: "Mei", tags: ["cat", "pets", "grey"], source: "motif", day: 14,
    grid: fromRecipe({ text: "MEOW", motifs: ["cat"], motifPlacement: "ends", backgroundColor: "grey", mainColor: "white", accentColor: "black", border: "none", width: 11 }) },
  { id: "seed-sunset", title: "Sunset stripes", author: "Jordan", tags: ["stripes", "sunset", "orange", "beginner"], source: "manual", day: 15,
    grid: bands(10, 40, ["yellow", "orange", "coral", "hot-pink", "purple"], 4) },
  { id: "seed-rock", title: "Rock on", author: "Alex P.", tags: ["music", "concert", "black"], source: "ai", day: 16,
    grid: fromRecipe({ text: "ROCK", motifs: ["music", "lightning"], motifPlacement: "ends", backgroundColor: "black", mainColor: "hot-pink", accentColor: "white", border: "dots", width: 13 }) },
  { id: "seed-daisy", title: "Daisy chain", author: "Grace", tags: ["flower", "daisy", "spring"], source: "motif", day: 17,
    grid: fromRecipe({ text: "", motifs: ["flower"], motifPlacement: "repeat", backgroundColor: "sky-blue", mainColor: "white", accentColor: "white", border: "dots", width: 11 }) },
  { id: "seed-zap", title: "ZAP!", author: "Ravi", tags: ["lightning", "word", "yellow"], source: "text", day: 18,
    grid: fromRecipe({ text: "ZAP!", motifs: ["lightning"], motifPlacement: "ends", backgroundColor: "black", mainColor: "yellow", accentColor: "yellow", border: "none", width: 11 }) },
  { id: "seed-smile", title: "Smile more", author: "Bea", tags: ["smiley", "happy", "yellow"], source: "ai", day: 19,
    grid: fromRecipe({ text: "SMILE", motifs: ["smiley"], motifPlacement: "ends", backgroundColor: "yellow", mainColor: "navy", accentColor: "navy", border: "none", width: 11 }) },
  { id: "seed-berry", title: "Berry sweet", author: "Ines", tags: ["strawberry", "fruit", "pink", "cute"], source: "motif", day: 22,
    grid: fromRecipe({ text: "", motifs: ["strawberry"], motifPlacement: "repeat", backgroundColor: "pink", mainColor: "red", accentColor: "red", border: "none", width: 11 }) },
  { id: "seed-toadstool", title: "Toadstool trail", author: "Wren", tags: ["mushroom", "fairy", "cottagecore", "green"], source: "ai", day: 23,
    grid: fromRecipe({ text: "", motifs: ["mushroom"], motifPlacement: "repeat", backgroundColor: "mint", backgroundStyle: "zigzag", backgroundColors: ["mint", "lavender"], mainColor: "red", accentColor: "red", border: "none", width: 13 }) },
  { id: "seed-queen", title: "Queen", author: "Tasha", tags: ["crown", "word", "purple", "royal"], source: "text", day: 24,
    grid: fromRecipe({ text: "QUEEN", motifs: ["crown"], motifPlacement: "ends", backgroundColor: "purple", mainColor: "white", accentColor: "yellow", border: "dots", width: 13 }) },
  { id: "seed-autumn", title: "Falling leaves", author: "Ben O.", tags: ["leaf", "autumn", "fall", "orange"], source: "ai", day: 25,
    grid: fromRecipe({ text: "", motifs: ["leaf"], motifPlacement: "repeat", backgroundColor: "orange", backgroundStyle: "gradient", backgroundColors: ["yellow", "orange", "burgundy"], mainColor: "white", accentColor: "white", border: "none", width: 11 }) },
  { id: "seed-fish", title: "Just keep swimming", author: "Lena", tags: ["fish", "ocean", "blue"], source: "motif", day: 26,
    grid: fromRecipe({ text: "", motifs: ["fish"], motifPlacement: "repeat", backgroundColor: "sky-blue", mainColor: "orange", accentColor: "orange", border: "none", width: 11 }) },
  { id: "seed-sailor", title: "Ahoy", author: "Finn", tags: ["anchor", "nautical", "navy", "word"], source: "text", day: 27,
    grid: fromRecipe({ text: "AHOY", motifs: ["anchor"], motifPlacement: "ends", backgroundColor: "navy", mainColor: "white", accentColor: "red", border: "stripes", width: 13 }) },
  { id: "seed-pines", title: "Into the woods", author: "Owen", tags: ["tree", "forest", "green", "camping"], source: "motif", day: 28,
    grid: fromRecipe({ text: "", motifs: ["tree"], motifPlacement: "repeat", backgroundColor: "cream", mainColor: "dark-green", accentColor: "dark-green", border: "dots", width: 13 }) },
  { id: "seed-scoops", title: "Two scoops", author: "Pia", tags: ["ice cream", "summer", "pink", "word"], source: "ai", day: 29,
    grid: fromRecipe({ text: "YUM", motifs: ["icecream"], motifPlacement: "ends", backgroundColor: "mint", mainColor: "hot-pink", accentColor: "pink", border: "none", width: 11 }) },
  { id: "seed-dreamy", title: "Head in the clouds", author: "Sky", tags: ["cloud", "sky", "pastel", "dreamy"], source: "motif", day: 30,
    grid: fromRecipe({ text: "", motifs: ["cloud", "star"], motifPlacement: "repeat", backgroundColor: "sky-blue", mainColor: "white", accentColor: "white", border: "none", width: 11 }) },
  { id: "seed-lit", title: "On fire", author: "Jay", tags: ["flame", "fire", "black", "word"], source: "text", day: 31,
    grid: fromRecipe({ text: "LIT", motifs: ["flame"], motifPlacement: "ends", backgroundColor: "black", mainColor: "orange", accentColor: "red", border: "none", width: 11 }) },
  { id: "seed-pastel", title: "Pastel stripes", author: "Amara", tags: ["stripes", "pastel", "beginner"], source: "manual", day: 32,
    grid: bands(10, 40, ["pink", "lavender", "mint", "sky-blue", "peach"], 2) },
  { id: "seed-candy", title: "Candy cane", author: "Nico", tags: ["diagonal", "christmas", "red", "beginner"], source: "manual", day: 33,
    grid: bands(10, 40, ["red", "white"], 2, true) },
  { id: "seed-spooky-word", title: "Boo crew", author: "Remy", tags: ["halloween", "ghost", "word", "spooky"], source: "ai", day: 34,
    grid: fromRecipe({ text: "BOO", motifs: ["ghost", "bat"], motifPlacement: "repeat", backgroundColor: "black", backgroundStyle: "stripes", backgroundColors: ["black", "purple"], mainColor: "orange", accentColor: "white", border: "none", width: 13 }) },
  { id: "seed-galaxy", title: "Galaxy brain", author: "Zoe L.", tags: ["galaxy", "stars", "space", "ombre"], source: "ai", day: 35,
    grid: fromRecipe({ text: "", motifs: ["star", "moon"], motifPlacement: "repeat", backgroundColor: "navy", backgroundStyle: "gradient", backgroundColors: ["black", "navy", "purple"], mainColor: "yellow", accentColor: "yellow", border: "none", width: 13 }) },
  { id: "seed-checker-pink", title: "Pink check", author: "Lily", tags: ["checker", "pink", "beginner"], source: "manual", day: 36,
    grid: checker(12, 36, "pink", "white", 2) },
  { id: "seed-lucky", title: "Lucky charm", author: "Aoife", tags: ["clover", "lucky", "green", "word"], source: "text", day: 37,
    grid: fromRecipe({ text: "LUCKY", motifs: ["clover"], motifPlacement: "ends", backgroundColor: "green", mainColor: "white", accentColor: "white", border: "dots", width: 13 }) },
  { id: "seed-maya-mint", title: "Maya in mint", author: "Olivia", tags: ["name", "hearts", "mint", "remix"], source: "remix", remixedFrom: "seed-maya", day: 20,
    grid: replaceColor(replaceColor(maya, "pink", "mint"), "hot-pink", "teal") },
  { id: "seed-hello-purple", title: "Hello in purple", author: "Chris", tags: ["word", "stars", "purple", "remix"], source: "remix", remixedFrom: "seed-hello", day: 21,
    grid: replaceColor(hello, "teal", "purple") },
];

export const SEED_PATTERNS: AlphaPattern[] = DEFS.map((d) => ({
  id: d.id,
  title: d.title,
  author: d.author,
  width: d.grid[0].length,
  height: d.grid.length,
  palette: paletteFor(d.grid),
  grid: d.grid,
  tags: d.tags,
  remixedFrom: d.remixedFrom,
  createdAt: new Date(Date.UTC(2026, 7, d.day, 15, 0, 0)).toISOString(),
  source: d.source,
}));

export const FEATURED_IDS = ["seed-maya", "seed-night", "seed-rainbow", "seed-cherry"];
