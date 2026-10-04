"use client";

import { Library, Palette } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { aiIsReady, useAiStatus } from "@/lib/aiStatus";
import { APP_NAME } from "@/lib/constants";
import Logo from "./Logo";

export default function Header() {
  const path = usePathname();
  const status = useAiStatus();
  const ready = aiIsReady(status);
  const label = !status ? "Checking AI…" : ready ? (status.warm ? "AI ready" : "AI warming up") : status.connected ? "Model missing" : "Offline mode";
  const title = !status
    ? ""
    : ready
      ? `Connected to ${status.model} on this laptop`
      : status.connected
        ? `Ollama is running but ${status.model} isn't downloaded. Run: ollama pull ${status.model}`
        : "Local AI not detected. Descriptions are built with the offline keyword helper.";

  const nav = [
    { href: "/create", label: "Create", icon: Palette },
    { href: "/library", label: "Library", icon: Library },
  ];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 rounded-full pr-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <nav className="ml-4 flex items-center gap-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href) || (href === "/library" && path.startsWith("/pattern"));
            return (
              <Link
                key={href}
                href={href}
                className={`btn ${active ? "bg-blush text-berry-dark" : "text-muted hover:bg-blush/60 hover:text-ink"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold" title={title}>
          <span className="relative flex h-2.5 w-2.5">
            {ready && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${ready ? "bg-emerald-500" : "bg-gray-300"}`} />
          </span>
          <span className={ready ? "text-emerald-700" : "text-muted"}>{label}</span>
        </div>
      </div>
    </header>
  );
}
