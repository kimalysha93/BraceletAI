import type { Bitmap } from "./grid";

// Hand-made pixel-art motifs, drawn upright (as they appear when the bracelet is worn).
// '#' = motif colour, '+' = detail colour (stems, centres, noses), '.' = background.
export const MOTIF_IDS = [
  "heart",
  "star",
  "flower",
  "smiley",
  "music",
  "moon",
  "sun",
  "cat",
  "paw",
  "lightning",
  "cherry",
  "butterfly",
] as const;

export type MotifId = (typeof MOTIF_IDS)[number];

export type Motif = { id: MotifId; name: string; bitmap: Bitmap; detail?: string };

export const MOTIFS: Record<MotifId, Motif> = {
  heart: {
    id: "heart",
    name: "Heart",
    bitmap: [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."],
  },
  star: {
    id: "star",
    name: "Star",
    bitmap: ["....#....", "...###...", "...###...", "#########", ".#######.", "..#####..", "..#####..", ".###.###.", ".##...##."],
  },
  flower: {
    id: "flower",
    name: "Flower",
    detail: "yellow",
    bitmap: [".##.##.", "#######", "##+++##", ".#+++#.", "##+++##", "#######", ".##.##."],
  },
  smiley: {
    id: "smiley",
    name: "Smiley",
    bitmap: ["..#####..", ".#######.", "##.###.##", "##.###.##", "#########", "#.#####.#", "##.....##", ".#######.", "..#####.."],
  },
  music: {
    id: "music",
    name: "Music note",
    bitmap: ["..#####", "..#####", "..#...#", "..#...#", ".##..##", "###.###", ".#...#."],
  },
  moon: {
    id: "moon",
    name: "Moon",
    bitmap: ["..###..", ".###...", "###....", "###....", "###....", ".###...", "..###.."],
  },
  sun: {
    id: "sun",
    name: "Sun",
    bitmap: ["#...#...#", ".#.....#.", "...###...", "..#####..", "#.#####.#", "..#####..", "...###...", ".#.....#.", "#...#...#"],
  },
  cat: {
    id: "cat",
    name: "Cat face",
    detail: "pink",
    bitmap: ["#.......#", "##.....##", "#########", "##.###.##", "#########", "####+####", ".#######.", "..#####.."],
  },
  paw: {
    id: "paw",
    name: "Paw print",
    bitmap: [".##...##.", ".##...##.", ".........", "##.....##", "##.###.##", "..#####..", ".#######.", ".#######.", "..##.##.."],
  },
  lightning: {
    id: "lightning",
    name: "Lightning",
    bitmap: ["...###.", "..###..", ".###...", "#######", "...###.", "..###..", ".###...", ".##....", "#......"],
  },
  cherry: {
    id: "cherry",
    name: "Cherry",
    detail: "green",
    bitmap: [".....++..", "....+.+..", "...+...+.", "..+....+.", ".##...##.", "####.####", "####.####", ".##...##."],
  },
  butterfly: {
    id: "butterfly",
    name: "Butterfly",
    detail: "black",
    bitmap: ["##.....##", "###...###", "####+####", "####+####", ".###+###.", "..##+##..", ".###+###.", ".##...##."],
  },
};

export const MOTIF_LIST: Motif[] = MOTIF_IDS.map((id) => MOTIFS[id]);

/** Words people might type for each motif (used by the offline keyword parser). */
export const MOTIF_WORDS: Record<string, MotifId> = {
  heart: "heart",
  hearts: "heart",
  love: "heart",
  star: "star",
  stars: "star",
  sparkle: "star",
  sparkles: "star",
  flower: "flower",
  flowers: "flower",
  daisy: "flower",
  daisies: "flower",
  floral: "flower",
  smiley: "smiley",
  smileys: "smiley",
  smile: "smiley",
  "smiley face": "smiley",
  happy: "smiley",
  music: "music",
  note: "music",
  notes: "music",
  "music note": "music",
  "music notes": "music",
  moon: "moon",
  moons: "moon",
  crescent: "moon",
  sun: "sun",
  suns: "sun",
  sunny: "sun",
  sunshine: "sun",
  cat: "cat",
  cats: "cat",
  kitty: "cat",
  kitten: "cat",
  paw: "paw",
  paws: "paw",
  "paw print": "paw",
  "paw prints": "paw",
  dog: "paw",
  lightning: "lightning",
  bolt: "lightning",
  bolts: "lightning",
  thunder: "lightning",
  cherry: "cherry",
  cherries: "cherry",
  butterfly: "butterfly",
  butterflies: "butterfly",
};
