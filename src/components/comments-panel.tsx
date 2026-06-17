"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
};

export type CommentsLabels = {
  empty: string;
  placeholder: string;
  post: string;
  posting: string;
  saveError: string;
};

type Props = {
  payoutId: string;
  initial: CommentItem[];
  labels: CommentsLabels;
};

export function CommentsPanel({ payoutId, initial, labels }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CommentItem[]>(initial);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/payouts/${encodeURIComponent(payoutId)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (!res.ok) {
        setError(labels.saveError);
        return;
      }
      const data = (await res.json()) as { item: CommentItem };
      setItems((prev) => [...prev, data.item]);
      setDraft("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-muted">{labels.empty}</li>
        ) : (
          items.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-surface px-3 py-2"
            >
              <p className="whitespace-pre-wrap text-sm text-text">{c.body}</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </li>
          ))
        )}
      </ul>

      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
          placeholder={labels.placeholder}
          rows={2}
          className="flex-1 resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm text-text shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none focus:border-primary/60"
        />
        <Button
          onClick={submit}
          disabled={pending || draft.trim().length === 0}
        >
          {pending ? labels.posting : labels.post}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
