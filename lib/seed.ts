import { paintBackground } from "./backgrounds";
import { createGrid, paletteFor, replaceColor, type Grid } from "./grid";
import { buildFromRecipe, sanitizeRecipe, type Recipe } from "./recipe";
import type { AlphaPattern, PatternSource } from "./types";

// Sample library patterns, all made with this app's own font and motifs. Authors are made up.

/** `size` locks the bracelet to width × height (rows) and fits the design inside. */
function fromRecipe(r: Partial<Recipe>, size?: { width: number; height: number }): Grid {
  return buildFromRecipe(sanitizeRecipe(r), size).grid;
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

/** Diamonds down the middle, touching tip to tip. */
function diamonds(width: number, height: number, bg: string, fg: string, inner?: string): Grid {
  const mid = (width - 1) / 2;
  const half = Math.floor(width / 2);
  const period = half * 2;
  return createGrid(width, height, bg).map((row, r) =>
    row.map((_, c) => {
      const d = Math.abs(c - mid) + Math.abs((r % period) - half + 0.5);
      if (inner && d <= half / 2) return inner;
      return d <= half ? fg : bg;
    }),
  );
}

/** Argyle: diamonds that alternate colour, outlined by a thin crossing line. */
function argyle(width: number, height: number, bg: string, a: string, b: string, line: string): Grid {
  const mid = (width - 1) / 2;
  const half = Math.floor(width / 2);
  const period = half * 2;
  return createGrid(width, height, bg).map((row, r) =>
    row.map((_, c) => {
      const d = Math.abs(c - mid) + Math.abs((r % period) - half + 0.5);
      if (d > half) return bg;
      if (d > half - 1) return line;
      return Math.floor(r / period) % 2 ? b : a;
    }),
  );
}

/** Plaid: crossing bands, with a thin accent line through each. */
function plaid(width: number, height: number, base: string, band: string, line: string): Grid {
  return createGrid(width, height, base).map((row, r) =>
    row.map((_, c) => {
      const rowBand = r % 8 < 3;
      const colBand = c % 6 < 2;
      if (r % 8 === 6 || c % 6 === 4) return line;
      return rowBand || colBand ? band : base;
    }),
  );
}

/** Soft waves rolling along the bracelet. */
function waves(width: number, height: number, colors: string[], band = 3): Grid {
  return createGrid(width, height, colors[0]).map((row, r) =>
    row.map((_, c) => colors[Math.floor((r + Math.round(2 * Math.sin((c / width) * Math.PI * 2))) / band + 100) % colors.length]),
  );
}

/** Staggered polka dots (2×2). */
function polka(width: number, height: number, bg: string, dot: string): Grid {
  return createGrid(width, height, bg).map((row, r) =>
    row.map((_, c) => {
      const shift = Math.floor(r / 4) % 2 ? 3 : 0;
      return r % 4 < 2 && (c + shift) % 6 >= 1 && (c + shift) % 6 < 3 ? dot : bg;
    }),
  );
}

/** Arrows (chevrons) all pointing one way. */
function arrows(width: number, height: number, bg: string, fg: string, gap = 4): Grid {
  const mid = (width - 1) / 2;
  return createGrid(width, height, bg).map((row, r) =>
    row.map((_, c) => ((r + Math.round(Math.abs(c - mid))) % (gap + 2) < 2 ? fg : bg)),
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
  { id: "seed-diamond-teal", title: "Diamond road", author: "Mira", tags: ["diamond", "geometric", "teal", "classic"], source: "manual", day: 38,
    grid: diamonds(11, 44, "white", "teal", "navy") },
  { id: "seed-argyle", title: "Preppy argyle", author: "Hugo", tags: ["argyle", "geometric", "navy", "classic"], source: "manual", day: 39,
    grid: argyle(11, 44, "navy", "sky-blue", "teal", "white") },
  { id: "seed-plaid", title: "Picnic plaid", author: "Elsie", tags: ["plaid", "red", "geometric", "cottagecore"], source: "manual", day: 40,
    grid: plaid(12, 40, "white", "red", "burgundy") },
  { id: "seed-waves", title: "Ocean waves", author: "Kai", tags: ["waves", "ocean", "blue", "summer"], source: "manual", day: 41,
    grid: waves(12, 42, ["navy", "blue", "sky-blue", "white"], 3) },
  { id: "seed-polka", title: "Polka party", author: "Dot", tags: ["polka dots", "pink", "cute", "beginner"], source: "manual", day: 42,
    grid: polka(12, 40, "hot-pink", "white") },
  { id: "seed-arrows", title: "Arrowhead", author: "Robin", tags: ["arrows", "chevron", "black", "geometric"], source: "manual", day: 43,
    grid: arrows(11, 42, "black", "lime") },
  { id: "seed-ombre-lav", title: "Lavender haze", author: "Nadia", tags: ["ombre", "purple", "pastel", "gradient"], source: "manual", day: 44,
    grid: paintBackground(10, 40, "gradient", ["white", "lavender", "purple", "navy"]) },
  { id: "seed-diamond-sunset", title: "Desert diamonds", author: "Luis", tags: ["diamond", "boho", "orange", "geometric"], source: "manual", day: 45,
    grid: diamonds(13, 48, "cream", "coral", "orange") },
  { id: "seed-unicorn", title: "Believe in magic", author: "Ivy", tags: ["unicorn", "magic", "pastel", "rainbow"], source: "ai", day: 46,
    grid: fromRecipe({ text: "", motifs: ["unicorn", "star"], motifPlacement: "repeat", backgroundColor: "lavender", backgroundStyle: "gradient", backgroundColors: ["pink", "lavender", "sky-blue"], mainColor: "white", accentColor: "white", border: "none", width: 12 }) },
  { id: "seed-boba", title: "Boba break", author: "Vivian", tags: ["boba", "bubble tea", "food", "cute"], source: "motif", day: 47,
    grid: fromRecipe({ text: "", motifs: ["boba"], motifPlacement: "repeat", backgroundColor: "mint", mainColor: "brown", accentColor: "brown", border: "dots", width: 12 }) },
  { id: "seed-panda", title: "Panda pals", author: "Lin", tags: ["panda", "animals", "black and white", "cute"], source: "motif", day: 48,
    grid: fromRecipe({ text: "", motifs: ["panda", "leaf"], motifPlacement: "repeat", backgroundColor: "mint", mainColor: "white", accentColor: "white", border: "none", width: 11 }) },
  { id: "seed-beach", title: "Shell seeker", author: "Coral", tags: ["shell", "starfish", "beach", "summer"], source: "ai", day: 49,
    grid: fromRecipe({ text: "", motifs: ["shell", "starfish"], motifPlacement: "repeat", backgroundColor: "sky-blue", mainColor: "white", accentColor: "white", border: "none", width: 11 }) },
  { id: "seed-snowman", title: "Let it snow", author: "Holly", tags: ["snowman", "snowflake", "winter", "christmas"], source: "ai", day: 50,
    grid: fromRecipe({ text: "", motifs: ["snowman", "snowflake"], motifPlacement: "repeat", backgroundColor: "navy", mainColor: "white", accentColor: "white", border: "dots", width: 13 }) },
  { id: "seed-bookworm", title: "Bookworm", author: "Agnes", tags: ["book", "reading", "word", "burgundy"], source: "text", day: 51,
    grid: fromRecipe({ text: "READ", motifs: ["book"], motifPlacement: "ends", backgroundColor: "burgundy", mainColor: "cream", accentColor: "cream", border: "none", width: 11 }) },
  { id: "seed-game", title: "Game on", author: "Max", tags: ["gamer", "gamepad", "word", "purple"], source: "text", day: 52,
    grid: fromRecipe({ text: "GG", motifs: ["gamepad"], motifPlacement: "ends", backgroundColor: "black", mainColor: "lime", accentColor: "purple", border: "stripes", width: 13 }) },
  { id: "seed-bday", title: "Party time", author: "Gigi", tags: ["birthday", "balloon", "cupcake", "party"], source: "ai", day: 53,
    grid: fromRecipe({ text: "", motifs: ["balloon", "cupcake"], motifPlacement: "repeat", backgroundColor: "white", backgroundStyle: "checker", backgroundColors: ["white", "yellow"], mainColor: "hot-pink", accentColor: "hot-pink", border: "none", width: 12 }) },
  { id: "seed-dino", title: "Dino stomp", author: "Arlo", tags: ["dinosaur", "kids", "green", "animals"], source: "motif", day: 54,
    grid: fromRecipe({ text: "", motifs: ["dino"], motifPlacement: "repeat", backgroundColor: "yellow", mainColor: "green", accentColor: "green", border: "dots", width: 12 }) },
  { id: "seed-sakura", title: "Sakura season", author: "Hana", tags: ["cherry blossom", "spring", "pink", "flower"], source: "motif", day: 55,
    grid: fromRecipe({ text: "", motifs: ["blossom"], motifPlacement: "repeat", backgroundColor: "white", mainColor: "pink", accentColor: "pink", border: "none", width: 11 }) },
  { id: "seed-mrs", title: "Bride to be", author: "Tess", tags: ["wedding", "ring", "word", "white"], source: "text", day: 56,
    grid: fromRecipe({ text: "BRIDE", motifs: ["ring"], motifPlacement: "ends", backgroundColor: "white", mainColor: "yellow", accentColor: "yellow", border: "none", width: 11 }) },
  { id: "seed-witchy", title: "Witchy vibes", author: "Salem", tags: ["witch", "halloween", "spooky", "purple"], source: "ai", day: 57,
    grid: fromRecipe({ text: "", motifs: ["witchhat", "spider"], motifPlacement: "repeat", backgroundColor: "purple", mainColor: "black", accentColor: "black", border: "none", width: 12 }) },
  { id: "seed-fruit", title: "Fruit salad", author: "Juno", tags: ["fruit", "pineapple", "banana", "summer"], source: "motif", day: 58,
    grid: fromRecipe({ text: "", motifs: ["pineapple", "banana"], motifPlacement: "repeat", backgroundColor: "hot-pink", mainColor: "yellow", accentColor: "yellow", border: "none", width: 11 }) },
  { id: "seed-team", title: "Team spirit", author: "Drew", tags: ["sports", "basketball", "word", "orange"], source: "text", day: 59,
    grid: fromRecipe({ text: "MVP", motifs: ["basketball"], motifPlacement: "ends", backgroundColor: "navy", mainColor: "white", accentColor: "orange", border: "stripes", width: 13 }) },
  { id: "seed-kitty-pink", title: "Kitty club in pink", author: "Rin", tags: ["cat", "pets", "pink", "remix"], source: "remix", remixedFrom: "seed-kitty", day: 60,
    grid: fromRecipe({ text: "MEOW", motifs: ["cat"], motifPlacement: "ends", backgroundColor: "pink", mainColor: "white", accentColor: "hot-pink", border: "none", width: 11 }) },
  { id: "seed-rainbow-hearts", title: "Rainbow hearts", author: "Pip", tags: ["rainbow", "hearts", "pride", "colourful"], source: "ai", day: 61,
    grid: fromRecipe({ text: "", motifs: ["heart"], motifPlacement: "repeat", backgroundColor: "navy", backgroundStyle: "diagonal", backgroundColors: ["red", "orange", "yellow", "green", "sky-blue", "purple"], mainColor: "white", accentColor: "white", border: "none", width: 13 }) },
  // ---- narrow ----
  { id: "seed-skinny", title: "Skinny stripes", author: "Juniper", tags: ["stripes", "narrow", "stacking", "beginner"], source: "manual", day: 62,
    grid: bands(6, 40, ["navy", "white", "red"], 2) },
  { id: "seed-mini-hearts", title: "Mini hearts", author: "Bree", tags: ["hearts", "narrow", "stacking", "red"], source: "motif", day: 63,
    grid: fromRecipe({ text: "", motifs: ["heart"], motifPlacement: "repeat", backgroundColor: "white", mainColor: "red", accentColor: "red", border: "none" }, { width: 8, height: 40 }) },
  { id: "seed-ava", title: "Ava (kids size)", author: "Nell", tags: ["name", "kids", "short", "narrow", "lavender"], source: "text", day: 64,
    grid: fromRecipe({ text: "AVA", motifs: [], motifPlacement: "none", backgroundColor: "lavender", mainColor: "purple", border: "none" }, { width: 9, height: 32 }) },
  { id: "seed-thin-chevron", title: "Thin chevron", author: "Otto", tags: ["chevron", "narrow", "stacking", "mint"], source: "manual", day: 65,
    grid: arrows(7, 36, "mint", "teal", 3) },
  { id: "seed-long-diamonds", title: "Long diamond chain", author: "Sage", tags: ["diamond", "narrow", "long", "anklet"], source: "manual", day: 66,
    grid: diamonds(9, 80, "black", "yellow") },
  { id: "seed-anklet", title: "Beach anklet", author: "Marisol", tags: ["anklet", "long", "narrow", "ocean"], source: "ai", day: 67,
    grid: fromRecipe({ text: "", motifs: ["starfish", "shell"], motifPlacement: "repeat", backgroundColor: "sky-blue", mainColor: "white", accentColor: "white", border: "none" }, { width: 10, height: 64 }) },
  // ---- wide ----
  { id: "seed-wide-argyle", title: "Wide argyle", author: "Felix", tags: ["argyle", "wide", "geometric", "classic"], source: "manual", day: 68,
    grid: argyle(17, 64, "cream", "burgundy", "dark-green", "yellow") },
  { id: "seed-wide-plaid", title: "Tartan cuff", author: "Isla", tags: ["plaid", "wide", "cuff", "green"], source: "manual", day: 69,
    grid: plaid(18, 48, "dark-green", "navy", "yellow") },
  { id: "seed-besties", title: "Besties cuff", author: "Rae & Lou", tags: ["bff", "word", "wide", "cuff", "rainbow"], source: "text", day: 70,
    grid: fromRecipe({ text: "BESTIES", motifs: ["heart"], motifPlacement: "ends", backgroundColor: "white", backgroundStyle: "diagonal", backgroundColors: ["pink", "lavender", "sky-blue", "mint"], mainColor: "purple", accentColor: "hot-pink", border: "stripes" }, { width: 16, height: 64 }) },
  { id: "seed-wide-galaxy", title: "Wide galaxy", author: "Orion", tags: ["galaxy", "space", "wide", "stars"], source: "ai", day: 71,
    grid: fromRecipe({ text: "", motifs: ["planet", "star", "rocket"], motifPlacement: "repeat", backgroundColor: "navy", backgroundStyle: "gradient", backgroundColors: ["black", "navy", "purple"], mainColor: "yellow", accentColor: "yellow", border: "dots" }, { width: 20, height: 60 }) },
  { id: "seed-wide-waves", title: "Big surf", author: "Nalu", tags: ["waves", "wide", "ocean", "blue"], source: "manual", day: 72,
    grid: waves(16, 48, ["navy", "teal", "sky-blue", "white"], 3) },
  { id: "seed-wide-diamonds", title: "Statement diamonds", author: "Zara", tags: ["diamond", "wide", "long", "boho"], source: "manual", day: 73,
    grid: diamonds(19, 76, "white", "hot-pink", "orange") },
  // ---- short / long ----
  { id: "seed-short-sun", title: "Little sunshine", author: "Poppy", tags: ["sun", "kids", "short", "yellow"], source: "motif", day: 74,
    grid: fromRecipe({ text: "", motifs: ["sun"], motifPlacement: "repeat", backgroundColor: "sky-blue", mainColor: "yellow", accentColor: "yellow", border: "none" }, { width: 11, height: 28 }) },
  { id: "seed-long-name", title: "Long name", author: "Annabelle", tags: ["name", "word", "long", "pink"], source: "text", day: 75,
    grid: fromRecipe({ text: "ANNABELLE", motifs: ["flower"], motifPlacement: "ends", backgroundColor: "pink", mainColor: "white", accentColor: "hot-pink", border: "dots" }, { width: 12, height: 84 }) },
  { id: "seed-long-rainbow", title: "Rainbow wrap", author: "Skye", tags: ["rainbow", "stripes", "long", "wrap"], source: "manual", day: 76,
    grid: bands(10, 100, ["red", "orange", "yellow", "green", "sky-blue", "purple"], 3, true) },
  { id: "seed-short-paws", title: "Tiny paws", author: "Benji", tags: ["paw", "pets", "short", "narrow"], source: "motif", day: 77,
    grid: fromRecipe({ text: "", motifs: ["paw"], motifPlacement: "repeat", backgroundColor: "beige", mainColor: "brown", accentColor: "brown", border: "none" }, { width: 10, height: 30 }) },
  { id: "seed-short-mia", title: "Mia (kids size)", author: "Tamsin", tags: ["name", "kids", "short", "hearts"], source: "text", day: 78,
    grid: fromRecipe({ text: "MIA", motifs: ["heart"], motifPlacement: "ends", backgroundColor: "mint", mainColor: "white", accentColor: "hot-pink", border: "none" }, { width: 11, height: 35 }) },
  { id: "seed-short-checker", title: "Tiny checks", author: "Eli", tags: ["checker", "short", "narrow", "beginner"], source: "manual", day: 79,
    grid: checker(8, 28, "yellow", "white", 2) },
  { id: "seed-short-polka", title: "Polka mini", author: "Dot", tags: ["polka dots", "short", "kids", "blue"], source: "manual", day: 80,
    grid: polka(12, 32, "sky-blue", "white") },
  { id: "seed-wide-hearts", title: "Sweetheart cuff", author: "Valentina", tags: ["hearts", "wide", "cuff", "valentine"], source: "motif", day: 81,
    grid: fromRecipe({ text: "", motifs: ["heart"], motifPlacement: "repeat", backgroundColor: "white", backgroundStyle: "checker", backgroundColors: ["white", "pink"], mainColor: "red", accentColor: "red", border: "stripes" }, { width: 16, height: 56 }) },
  { id: "seed-wide-summer", title: "Summer cuff", author: "Lola", tags: ["summer", "word", "wide", "sunflower"], source: "text", day: 82,
    grid: fromRecipe({ text: "SUMMER", motifs: ["sunflower"], motifPlacement: "ends", backgroundColor: "sky-blue", mainColor: "white", accentColor: "yellow", border: "dots" }, { width: 18, height: 64 }) },
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
  createdAt: new Date(Date.UTC(2026, 6, d.day, 15, 0, 0)).toISOString(),
  source: d.source,
}));

export const FEATURED_IDS = ["seed-maya", "seed-night", "seed-rainbow", "seed-cherry"];
