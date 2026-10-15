"use client";

import { Send } from "lucide-react";
import { useState, type ReactNode } from "react";
import Modal from "../ui/Modal";

export type PublishFields = { title: string; author: string; tags: string[] };

export default function PublishModal({
  open,
  onClose,
  preview,
  initial,
  onPublish,
}: {
  open: boolean;
  onClose: () => void;
  preview: ReactNode;
  initial: PublishFields;
  onPublish: (fields: PublishFields) => Promise<void>;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Share to the library">
      {/* keyed so the form resets to the latest title each time it opens */}
      {open && <PublishForm key={initial.title} preview={preview} initial={initial} onPublish={onPublish} />}
    </Modal>
  );
}

function PublishForm({ preview, initial, onPublish }: { preview: ReactNode; initial: PublishFields; onPublish: (f: PublishFields) => Promise<void> }) {
  const [title, setTitle] = useState(initial.title);
  const [author, setAuthor] = useState(initial.author);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onPublish({
        title: title.trim() || "Untitled bracelet",
        author: author.trim() || "Anonymous",
        tags: tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-3"
    >
      <div className="overflow-hidden rounded-2xl border border-line bg-cream p-3">{preview}</div>
      <div>
        <label className="label" htmlFor="pub-title">Pattern name</label>
        <input id="pub-title" className="input" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="pub-author">Your name</label>
        <input id="pub-author" className="input" maxLength={40} placeholder="Shown on the pattern" value={author} onChange={(e) => setAuthor(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="pub-tags">Tags</label>
        <input id="pub-tags" className="input" placeholder="hearts, pink, name" value={tags} onChange={(e) => setTags(e.target.value)} />
        <p className="mt-1 text-xs text-muted">Separate with commas. Helps people find it.</p>
      </div>
      <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
        <Send className="h-4 w-4" /> {busy ? "Publishing…" : "Publish pattern"}
      </button>
    </form>
  );
}
