import Link from "next/link";

/** Switch between the alpha (pixel) editor and the traditional (diagonal knot) editor. */
export default function EditorTypeSwitch({ current }: { current: "alpha" | "normal" }) {
  const items = [
    { id: "alpha", href: "/create", label: "Alpha", title: "Pixel-style patterns: words, pictures, photos" },
    { id: "normal", href: "/create/normal", label: "Traditional", title: "Diagonal knot patterns: chevrons, candy stripes, zigzags" },
  ] as const;
  return (
    <div className="flex rounded-full border border-line bg-white p-0.5">
      {items.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          title={it.title}
          className={`rounded-full px-3 py-1 text-sm font-bold transition ${current === it.id ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}
