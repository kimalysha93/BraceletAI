import { ArrowRight, Library, Palette, Ruler, Scissors, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import BraceletThumb from "@/components/BraceletThumb";
import PatternCard from "@/components/PatternCard";
import { APP_SHORT_PITCH, APP_TAGLINE } from "@/lib/constants";
import { FEATURED_IDS, SEED_PATTERNS } from "@/lib/seed";
import { DEFAULT_STRING_SETTINGS } from "@/lib/stringConfig";
import { calculateStrings, formatLength } from "@/lib/strings";

const STEPS = [
  {
    icon: Wand2,
    tint: "bg-lav-soft text-purple-600",
    title: "Describe it or draw it",
    body: "Type “pink and white, says MAYA, hearts on the ends”, or paint knots yourself like pixel art.",
  },
  {
    icon: Palette,
    tint: "bg-blush text-berry",
    title: "Get a real, knottable pattern",
    body: "Row numbers, direction arrows and a colour key, so you always know which knot comes next.",
  },
  {
    icon: Ruler,
    tint: "bg-butter text-amber-600",
    title: "Know exactly what to cut",
    body: "String lengths for every colour, worked out for you. No more giant leftover tails.",
  },
];

export default function Home() {
  const featured = FEATURED_IDS.map((id) => SEED_PATTERNS.find((p) => p.id === id)!).filter(Boolean);
  const hero = SEED_PATTERNS.find((p) => p.id === "seed-maya")!;
  const hero2 = SEED_PATTERNS.find((p) => p.id === "seed-night")!;
  const cut = calculateStrings(hero.grid, DEFAULT_STRING_SETTINGS).basePieces[0];
  const remixes = (id: string) => SEED_PATTERNS.filter((p) => p.remixedFrom === id).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-10 pb-16 sm:pt-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="chip mb-5 border-berry/20 bg-blush text-berry-dark">
            <Sparkles className="h-3.5 w-3.5" /> Describe it, we&apos;ll knot it
          </span>
          <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">{APP_TAGLINE}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{APP_SHORT_PITCH}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/create?mode=ai" className="btn-primary px-6 py-3 text-base">
              <Sparkles className="h-5 w-5" /> Describe it
            </Link>
            <Link href="/create?mode=draw" className="btn-soft px-6 py-3 text-base">
              <Palette className="h-5 w-5 text-berry" /> Draw it
            </Link>
            <Link href="/library" className="btn-soft px-6 py-3 text-base">
              <Library className="h-5 w-5 text-purple-500" /> Browse library
            </Link>
          </div>
          <p className="mt-4 text-sm text-faint">Free, no account needed. Made for beginners.</p>
        </div>

        <div className="relative mx-auto w-full max-w-md py-6">
          <div className="card rotate-[-4deg] p-5">
            <BraceletThumb grid={hero.grid} maxWidth={420} maxCell={9} />
          </div>
          <div className="card mt-[-10px] ml-10 rotate-[3deg] p-5">
            <BraceletThumb grid={hero2.grid} maxWidth={420} maxCell={9} />
          </div>
          <div className="absolute -top-1 right-2 rotate-[6deg] rounded-2xl border border-line bg-white px-3 py-2 text-xs font-bold shadow-soft">
            <span className="flex items-center gap-1.5">
              <Scissors className="h-3.5 w-3.5 text-berry" /> Cut {cut.count} strings at {formatLength(cut.cutCm, "cm")}
            </span>
          </div>
          <div className="absolute -bottom-2 left-0 rotate-[-5deg] rounded-2xl bg-ink px-3 py-2 font-mono text-[11px] text-pink-100 shadow-soft">
            {`{ "text": "MAYA", "motifs": ["heart"] }`}
          </div>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, tint, title, body }, i) => (
          <div key={title} className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-display text-sm font-semibold text-faint">Step {i + 1}</span>
            </div>
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="mt-20">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Fresh from the library</h2>
            <p className="text-sm text-muted">Remix any pattern, recolour it, and share it back with credit.</p>
          </div>
          <Link href="/library" className="btn-ghost">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <PatternCard key={p.id} pattern={p} remixes={remixes(p.id)} />
          ))}
        </div>
      </section>

      <footer className="mt-20 text-center text-xs text-faint">Prototype for a class pitch demo. All sample patterns were made with this app.</footer>
    </main>
  );
}
