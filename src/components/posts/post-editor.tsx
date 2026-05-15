"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateGeneratedPost } from "@/app/actions/dashboard";

export function PostEditor({
  postId,
  contentText,
  hook,
}: {
  postId: string;
  contentText: string;
  hook: string;
}) {
  const [text, setText] = useState(contentText);
  const [hookText, setHookText] = useState(hook);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateGeneratedPost(postId, {
        contentText: text,
        hook: hookText,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={hookText}
        onChange={(e) => setHookText(e.target.value)}
        placeholder="Hook"
        className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
      />
      <Button type="button" onClick={handleSave} disabled={saving} variant="secondary" className="text-xs">
        {saving ? "Saving…" : "Save edits"}
      </Button>
    </div>
  );
}
