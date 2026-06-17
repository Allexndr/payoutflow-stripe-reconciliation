"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  emailLabel: string;
  passwordLabel: string;
  passwordHint: string;
  createLabel: string;
  creatingLabel: string;
  fallbackError: string;
};

export function RegisterForm({
  emailLabel,
  passwordLabel,
  passwordHint,
  createLabel,
  creatingLabel,
  fallbackError,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? fallbackError);
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-xs font-medium text-muted"
        >
          {emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-xs font-medium text-muted"
        >
          {passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <p className="mt-1 text-xs text-muted">{passwordHint}</p>
      </div>
      <Button type="submit" className="w-full py-3" disabled={pending}>
        {pending ? creatingLabel : createLabel}
      </Button>
    </form>
  );
}
