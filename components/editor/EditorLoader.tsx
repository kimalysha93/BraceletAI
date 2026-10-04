"use client";

import dynamic from "next/dynamic";

// The editor reads the saved draft and URL on first render, so it only runs in the browser.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center gap-2 py-24 text-sm font-semibold text-muted">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-3 w-3 rounded-full bg-berry/60" style={{ animation: `bead-bounce 1s ${i * 0.15}s infinite` }} />
      ))}
      <span className="ml-2">Getting your strings ready…</span>
    </div>
  ),
});

export default function EditorLoader() {
  return <Editor />;
}
