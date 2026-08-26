"use client";

import { useState } from "react";
import { Check, Calendar, ArrowUpRight, Send } from "lucide-react";
import { Button } from "@/components/hub/ui/button";
import { Reveal } from "@/components/hub/reveal";
import { TwoTone } from "@/components/hub/ui/type";
import { BowlIcon } from "@/components/hub/ui/brand-mark";
import { getDict, fill, type Dict, type Locale } from "@/lib/marketing/i18n";

const CALENDLY_URL = "https://calendly.com/info-bapita/30min";
const EMAIL = "info.bapita@gmail.com";

/**
 * The close, and the page's only dark surface.
 *
 * Everything above this is one continuous warm world; espresso arrives once, at
 * the end, as a full stop. That's a different thing from the old page, which
 * flipped between cream and near-black five times and read as five sites.
 */

const fieldClass =
  "w-full rounded-field border border-clay/20 bg-clay/[0.06] px-3.5 py-2.5 text-sm text-clay placeholder:text-clay/35 focus:border-clay/45 focus:outline-none";

function LeadForm({ t, lang }: { t: Dict["connect"]["form"]; lang: Locale }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      // Book's own lead endpoint (inserts into `leads` + mails info.bapita).
      // The hub's /api/lead wrote to the hub Supabase project, which this app
      // has no credentials for — `business` maps to `business_name` here.
      const res = await fetch("/api/public/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          business_name: data.get("business"),
          phone: data.get("phone"),
          email: data.get("email"),
          lang,
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError(fill(t.error, { email: EMAIL }));
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="flex items-center gap-2.5 rounded-field bg-hub-success/15 px-4 py-3 text-sm font-semibold text-hub-success"
      >
        <Check className="h-4 w-4 shrink-0" />
        {t.sent}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:gap-3">
      {/* Two up on every width. Stacked, four fields were four 46px rows plus
          gaps — 110px that pushed the send button and the email fallback off
          the bottom of a phone screen. */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <input name="name" type="text" placeholder={t.name} required aria-label={t.nameLabel} autoComplete="name" className={fieldClass} />
        <input name="business" type="text" placeholder={t.business} aria-label={t.businessLabel} autoComplete="organization" className={fieldClass} />
        <input name="phone" type="tel" placeholder={t.phone} aria-label={t.phoneLabel} autoComplete="tel" className={fieldClass} />
        <input name="email" type="email" placeholder={t.email} required aria-label={t.emailLabel} autoComplete="email" className={fieldClass} />
      </div>
      <Button type="submit" variant="onDark" disabled={pending} className="w-full">
        {pending ? t.sending : t.submit}
        <Send className="h-4 w-4" />
      </Button>
      {error && <p className="text-xs text-hub-danger">{error}</p>}
    </form>
  );
}

/**
 * Headline is overridable so the marketing home and the /hub suite page can
 * close on their own promise while sharing this section verbatim; the defaults
 * are the suite page's original copy.
 */
export function Connect({
  locale = "en",
  lead = "Your shop, sorted.",
  trail = "Starting with one call.",
  blurb = "Twenty minutes. I'll ask what's eating your time, show you what it looks like fixed, and give you a straight number. No slides.",
}: {
  locale?: Locale;
  lead?: string;
  trail?: string;
  blurb?: string;
} = {}) {
  const t = getDict(locale).connect;
  return (
    <section id="connect" className="relative overflow-hidden bg-espresso py-5 phone-short:py-4 sm:py-32">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-clay opacity-[0.04]"
        aria-hidden="true"
      >
        <BowlIcon size={460} />
      </div>

      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="flex items-center justify-center gap-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-clay-toast">
              {t.eyebrow}
            </p>
            <TwoTone
              tone="dark"
              lead={lead}
              trail={trail}
              className="mt-2 sm:mt-4"
            />
            <p className="mx-auto mt-2.5 text-[0.8125rem] leading-snug text-clay/55 sm:mt-6 sm:text-lg sm:leading-relaxed">
              {blurb}
            </p>
          </div>
        </Reveal>

        <div className="mt-3 grid gap-2 sm:mt-14 sm:gap-5 sm:grid-cols-2">
          <Reveal>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              /* Horizontal on a phone, the original stacked card from `sm`.
                 Not a word changes — the icon just moves out of the copy's
                 way. Stacked this was 176px, and with the form card beneath it
                 the email fallback fell off the bottom of the screen. */
              className="group flex h-full flex-row items-start gap-3 rounded-3xl border border-clay/[0.12] bg-clay/[0.04] p-3.5 transition-colors hover:border-clay/25 hover:bg-clay/[0.07] sm:flex-col sm:gap-0 sm:p-7"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-clay/10 text-clay sm:mb-5 sm:h-11 sm:w-11">
                <Calendar className="h-5 w-5" />
              </span>
              {/* `sm:contents` dissolves this wrapper back into the card at the
                  breakpoint, so the desktop layout is byte-for-byte what it
                  was — including `mt-auto` pinning the link to the bottom. */}
              <span className="flex min-w-0 flex-col sm:contents">
                <h3 className="text-lg font-bold text-clay sm:text-xl">
                  {t.calendly.title}
                </h3>
                <p className="mt-1 text-[0.8125rem] leading-snug text-clay/50 sm:mt-2 sm:text-sm sm:leading-relaxed">
                  {t.calendly.body}
                </p>
                <span className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-clay group-hover:underline group-hover:underline-offset-4 sm:mt-auto sm:pt-6">
                  {t.calendly.cta}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </span>
            </a>
          </Reveal>

          <Reveal delay={90}>
            <div className="flex h-full flex-col rounded-3xl border border-clay/[0.12] bg-clay/[0.04] p-3.5 sm:p-7">
              {/* Same horizontal-on-phone treatment as the card above, so the
                  two read as a pair and the form starts higher up the card. */}
              <div className="flex items-start gap-3 sm:block">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-clay/10 text-clay sm:mb-5 sm:h-11 sm:w-11">
                  <Send className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-clay sm:text-xl">
                    {t.form.title}
                  </h3>
                  <p className="mt-1 text-[0.8125rem] leading-snug text-clay/50 sm:mt-2 sm:text-sm sm:leading-relaxed">
                    {t.form.body}
                  </p>
                </div>
              </div>
              <div className="pt-3 sm:pt-6">
                <LeadForm t={t.form} lang={locale} />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <p className="mt-2 text-center text-sm text-clay/40 sm:mt-10">
            {t.emailPrefix}{" "}
            {/* min-h-11: was a 21px target. */}
            <a
              href={`mailto:${EMAIL}`}
              className="inline-flex min-h-11 items-center text-clay/70 underline underline-offset-4 hover:text-clay"
            >
              {EMAIL}
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
