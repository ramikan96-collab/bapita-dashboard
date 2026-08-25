"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/hub/ui/button";

export function NotifyForm({ productName, productId }: { productName: string; productId: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || pending) return;
    setPending(true);
    setError(null);
    try {
      // Same endpoint as the main lead form — this app has no `waitlist`
      // table; the product being asked about rides along in `message`.
      const res = await fetch("/api/public/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: email.split("@")[0],
          email,
          message: `Waitlist: ${productId}`,
          lang: "en",
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-field bg-hub-success/15 px-4 py-2.5 text-sm font-semibold text-hub-success">
        <Check className="h-4 w-4" />
        You&apos;re on the list!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`Get notified about ${productName}`}
          required
          aria-label={`Email for ${productName} notifications`}
          className="min-w-0 flex-1 rounded-field border border-hub-cream/15 bg-hub-cream/[0.04] px-3.5 py-2 text-sm text-hub-cream placeholder:text-hub-cream/35 focus:border-hub-cream/35 focus:outline-none"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "…" : "Notify me"}
        </Button>
      </div>
      {error && <p className="text-xs text-hub-danger">{error}</p>}
    </form>
  );
}
