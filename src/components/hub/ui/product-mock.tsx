import {
  Star,
  Check,
  CheckCheck,
  MapPin,
  TrendingUp,
  Plus,
  Sparkles,
  Inbox,
  Smile,
} from "lucide-react";
import { BrowserFrame, PhoneFrame } from "@/components/hub/ui/frame";
import type { ProductId } from "@/lib/hub/products";

/**
 * What each product actually looks like.
 *
 * The old homepage showed abstract clay art and never once showed the product,
 * so a visitor had no idea what they'd be getting. These are built as DOM so
 * they stay sharp at any size and can carry each product's accent color. They
 * are illustrative, not live screenshots — kept generic (a stand-in shop, round
 * numbers) so nothing here reads as a claim about a specific client.
 */

const BOOK = "#e8920a";
const SOCIAL = "#d4622a";
const BOTS = "#1fa971";
const REACH = "#2d6cf0";

/* ─────────────────────────── Book ─────────────────────────── */

const SERVICES = [
  { name: "Haircut", meta: "30 min", price: "₪80" },
  { name: "Beard trim", meta: "20 min", price: "₪50" },
  { name: "Cut + beard", meta: "45 min", price: "₪120" },
];

const SLOTS = ["09:30", "11:00", "14:30", "16:00", "17:15"];

function BookMock() {
  return (
    <BrowserFrame url="shimi.bapita.com" accent={BOOK}>
      <div className="bg-white">
        {/* shop header */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ background: `linear-gradient(120deg, ${BOOK}14, transparent)` }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white"
            style={{ background: BOOK }}
          >
            S
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-espresso">Shimi Barbershop</p>
            <p className="flex items-center gap-1 text-[0.6875rem] text-espresso/45">
              <span className="h-1.5 w-1.5 rounded-full bg-hub-success" />
              Open · books 24/7
            </p>
          </div>
        </div>

        {/* services */}
        <div className="space-y-1.5 px-5 pb-1">
          {SERVICES.map((s, i) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-xl border px-3.5 py-2.5"
              style={
                i === 0
                  ? { borderColor: `${BOOK}55`, background: `${BOOK}0d` }
                  : { borderColor: "rgba(42,29,20,0.08)" }
              }
            >
              <div>
                <p className="text-[0.8125rem] font-semibold text-espresso">{s.name}</p>
                <p className="text-[0.6875rem] text-espresso/40">{s.meta}</p>
              </div>
              <span className="text-[0.8125rem] font-bold tabular-nums text-espresso">
                {s.price}
              </span>
            </div>
          ))}
        </div>

        {/* slots */}
        <div className="px-5 pt-3.5">
          <p className="mb-2 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-espresso/35">
            Thursday
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SLOTS.map((t, i) => (
              <span
                key={t}
                className="rounded-hub-lg px-2.5 py-1.5 text-[0.75rem] font-semibold tabular-nums"
                style={
                  i === 3
                    ? { background: BOOK, color: "#fff" }
                    : { background: "rgba(42,29,20,0.05)", color: "rgba(42,29,20,0.6)" }
                }
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="p-5 pt-4">
          <div
            className="rounded-pill py-2.5 text-center text-[0.8125rem] font-bold text-white"
            style={{ background: BOOK }}
          >
            Book 16:00 · ₪80
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ────────────────────────── Social ────────────────────────── */

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
/**
 * A month, not a week. The product's claim is that you sit down once and the
 * next four weeks are done — a seven-cell strip showed the opposite, a calendar
 * you come back to every Sunday. Days are indexed 0–27 across four rows.
 */
const POSTS = [
  { day: 1, label: "New set reel", tone: 1 },
  { day: 3, label: "Before / after", tone: 0.7 },
  { day: 5, label: "Weekend promo", tone: 0.85 },
  { day: 8, label: "Client review", tone: 0.55 },
  { day: 10, label: "Open slots", tone: 0.45 },
  { day: 13, label: "Behind the scenes", tone: 0.8 },
  { day: 15, label: "Aftercare tips", tone: 0.6 },
  { day: 18, label: "Before / after", tone: 0.7 },
  { day: 20, label: "Weekend promo", tone: 0.85 },
  { day: 23, label: "New set reel", tone: 1 },
  { day: 25, label: "Client review", tone: 0.55 },
  { day: 27, label: "Month recap", tone: 0.9 },
];

function SocialMock() {
  return (
    <BrowserFrame url="app.bapita.com/social" accent={SOCIAL}>
      <div className="bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-espresso">This month</p>
          <span
            className="rounded-pill px-2.5 py-1 text-[0.6875rem] font-bold"
            style={{ background: `${SOCIAL}1a`, color: SOCIAL }}
          >
            {POSTS.length} scheduled
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d, i) => (
            <span
              key={i}
              className="pb-0.5 text-center text-[0.5625rem] font-bold text-espresso/30"
            >
              {d}
            </span>
          ))}
          {Array.from({ length: 28 }, (_, i) => {
            const post = POSTS.find((p) => p.day === i);
            return (
              <div
                key={i}
                /* h-8, not h-9: all four mocks share one grid cell in the tab
                   panel, so the tallest sets the panel height — and the panel
                   is inside a pinned viewport. Four rows of h-9 pushed Social
                   past Book and cost the section 16px it doesn't have. */
                className="flex h-8 items-end rounded-hub-md p-1"
                style={{
                  background: post
                    ? `color-mix(in srgb, ${SOCIAL} ${post.tone * 24}%, #fff)`
                    : "rgba(42,29,20,0.035)",
                  border: post ? `1px solid ${SOCIAL}44` : "1px solid transparent",
                }}
              >
                {post && (
                  <span className="line-clamp-2 text-[0.4375rem] font-semibold leading-[1.15] text-espresso/70">
                    {post.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* composer — one caption, every channel, written for you */}
        <div className="mt-3.5 rounded-xl border border-espresso/[0.08] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.6875rem] font-semibold text-espresso/50">
              Instagram · Facebook · TikTok
            </span>
            <span
              className="flex items-center gap-1 rounded-pill px-2 py-0.5 text-[0.5625rem] font-bold"
              style={{ background: `${SOCIAL}1a`, color: SOCIAL }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              AI caption
            </span>
          </div>
          <p className="mt-2 text-[0.75rem] leading-relaxed text-espresso/70">
            Two slots left this Friday. Tap the link to grab one ✨
          </p>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="font-mono text-[0.625rem] text-espresso/35">
              Fri · 09:00
            </span>
            <span
              className="rounded-pill px-3 py-1 text-[0.6875rem] font-bold text-white"
              style={{ background: SOCIAL }}
            >
              Scheduled
            </span>
          </div>
        </div>

        {/* the inbox half — DMs, comments and reviews, already read for tone */}
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-espresso/[0.08] px-3 py-2.5">
          <Inbox className="h-3.5 w-3.5 shrink-0" style={{ color: SOCIAL }} />
          <span className="text-[0.6875rem] font-semibold text-espresso/60">
            18 in your inbox
          </span>
          <span className="ms-auto flex items-center gap-1 text-[0.625rem] font-bold text-hub-success">
            <Smile className="h-3 w-3" />
            92% positive
          </span>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ─────────────────────────── Bots ─────────────────────────── */

// A physio clinic, not the barbershop the Book mock uses. Same page, four
// different trades — the reader should never conclude this is a barber product.
const CHAT = [
  { from: "them" as const, text: "hi, anything after work this week?" },
  { from: "us" as const, text: "Yes — Thursday 17:15 with Lior. Want it?" },
  { from: "them" as const, text: "perfect 🙏" },
  {
    from: "us" as const,
    text: "Booked. Thursday 17:15, first session ₪280. Reminder sent.",
  },
];

function BotsMock() {
  return (
    <PhoneFrame className="mx-auto max-w-[280px]">
      <div className="bg-[#ECE5DD]">
        {/* chat header */}
        <div className="flex items-center gap-2.5 bg-[#075E54] px-3.5 py-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[0.625rem] font-extrabold text-white"
            style={{ background: BOTS }}
          >
            L
          </span>
          <div>
            <p className="text-[0.75rem] font-bold text-white">Lior Physio</p>
            <p className="text-[0.5625rem] text-white/60">answers in seconds</p>
          </div>
        </div>

        <div className="space-y-2 px-3 py-3.5">
          {CHAT.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from === "us" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[0.6875rem] leading-snug shadow-hub-sm ${
                  m.from === "us"
                    ? "bg-[#DCF8C6] text-espresso"
                    : "bg-white text-espresso"
                }`}
              >
                {m.text}
                <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[0.5rem] text-espresso/35">
                  {m.from === "us" ? (
                    <>
                      16:0{i} <CheckCheck className="h-2.5 w-2.5 text-[#34B7F1]" />
                    </>
                  ) : (
                    <>15:5{i}</>
                  )}
                </span>
              </div>
            </div>
          ))}

          <div className="flex justify-center pt-1">
            <span
              className="flex items-center gap-1 rounded-pill px-2.5 py-1 text-[0.5625rem] font-bold text-white"
              style={{ background: BOTS }}
            >
              <Check className="h-2.5 w-2.5" />
              Added to your calendar
            </span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ─────────────────────────── Reach ────────────────────────── */

function ReachMock() {
  return (
    <BrowserFrame url="google.com/maps" accent={REACH}>
      <div className="bg-white p-5">
        <div className="mb-3 flex items-center gap-2 rounded-pill border border-espresso/[0.08] px-3 py-2">
          <MapPin className="h-3.5 w-3.5" style={{ color: REACH }} />
          <span className="text-[0.75rem] text-espresso/50">dog groomer near me</span>
        </div>

        {/* the win: ranked first */}
        <div
          className="rounded-xl p-3.5"
          style={{ background: `${REACH}0d`, border: `1px solid ${REACH}44` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.8125rem] font-bold text-espresso">Bark &amp; Bath Grooming</p>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="text-[0.6875rem] font-bold text-espresso">4.9</span>
                <span className="flex" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-2.5 w-2.5 fill-warning text-warning" />
                  ))}
                </span>
                <span className="text-[0.6875rem] text-espresso/40">(128)</span>
              </div>
              <p className="mt-1 text-[0.6875rem] text-espresso/45">
                Open · 400 m · Herzliya
              </p>
            </div>
            <span
              className="shrink-0 rounded-pill px-2 py-0.5 text-[0.625rem] font-bold text-white"
              style={{ background: REACH }}
            >
              #1
            </span>
          </div>
          <div className="mt-3 flex gap-1.5">
            <span
              className="rounded-hub-lg px-2.5 py-1 text-[0.625rem] font-bold text-white"
              style={{ background: REACH }}
            >
              Book online
            </span>
            <span className="rounded-hub-lg bg-espresso/[0.06] px-2.5 py-1 text-[0.625rem] font-semibold text-espresso/55">
              Directions
            </span>
          </div>
        </div>

        {/* two quieter competitors, to show the ranking is relative */}
        {["Paws & Co.", "The Grooming Room"].map((n) => (
          <div
            key={n}
            className="mt-1.5 flex items-center justify-between rounded-xl border border-espresso/[0.06] px-3.5 py-2.5"
          >
            <div>
              <p className="text-[0.75rem] font-semibold text-espresso/45">{n}</p>
              <p className="text-[0.625rem] text-espresso/30">4.3 · 1.2 km</p>
            </div>
            <Plus className="h-3 w-3 text-espresso/20" />
          </div>
        ))}

        <div className="mt-3.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold" style={{ color: REACH }}>
          <TrendingUp className="h-3.5 w-3.5" />
          Up 3 places this month
        </div>
      </div>
    </BrowserFrame>
  );
}

export const PRODUCT_MOCKS: Record<ProductId, () => React.JSX.Element> = {
  book: BookMock,
  social: SocialMock,
  bots: BotsMock,
  reach: ReachMock,
};
