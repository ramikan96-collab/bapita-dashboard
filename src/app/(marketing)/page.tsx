import type { Metadata } from "next";
import Script from "next/script";
import InteractivityScript from "./InteractivityScript";

// Ported from public/home.html. The static prototype used ~1900 lines of
// hand-tuned CSS (custom properties, gradients, device mockups, marquee
// animation) tightly coupled to specific class names throughout the markup
// below. Rather than re-deriving every rule as Tailwind utilities (high risk
// of visual regression for no functional gain), the original CSS is kept
// close to verbatim in the <style> tag below, scoped to this page only. The
// shared (marketing) layout (header/footer) uses Tailwind as requested.
//
// Interactivity (pain-section tabs, how-it-works tabs, FAQ/addon accordions,
// the "connect" modal, scroll-fade-ins, testimonial marquee pause, etc.) was
// vanilla DOM JS in home.html with no framework. It's preserved the same way
// here as a single inline <script> — a Server Component page can't attach
// React event handlers without a "use client" boundary, and this task is
// scoped to exactly two files, so a separate client-component file isn't an
// option. Native `onclick="..."` attributes (lowercase) are used on a few
// modal buttons for the same reason: React does not treat lowercase
// `onclick` as a synthetic event prop, so it passes through to the DOM
// exactly like it did in the static HTML.
//
// Dropped in this port (see PR/agent notes): the original home.html <nav>
// (in-page anchors, hamburger mobile menu, EN/HE language toggle) and its
// own <footer> — both are superseded by the new shared (marketing) layout
// chrome. The EN/HE i18n dictionary (~250 strings) was dropped with it since
// there is no toggle left to drive it; this page renders the English copy
// only, matching home.html's default (lang="en") state.

const SITE_URL = "https://book.bapita.com/";
const TITLE = "Bapita | Built for you. Runs without you.";
const DESCRIPTION =
  "Bapita builds your booking page, dashboard and automations in 48 hours. No tech needed. Built for barbers, salons & coaches in Israel.";
const OG_DESCRIPTION =
  "A booking website, owner dashboard, and automations, built for your appointment based business in 48 hours. No tech needed.";
const OG_IMAGE = "https://book.bapita.com/img/og-image.png?v=2";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
    languages: {
      en: SITE_URL,
      he: SITE_URL,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Bapita",
      url: "https://book.bapita.com",
      description:
        "Bapita builds a booking website, owner dashboard, and automations for appointment based businesses in 48 hours. No tech skills needed.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        priceCurrency: "ILS",
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@type": "Organization",
      name: "Bapita",
      url: "https://book.bapita.com",
      email: "info.bapita@gmail.com",
      description:
        "Built for barbers, salons, personal trainers, and other appointment based businesses in Israel.",
      areaServed: "IL",
      sameAs: ["https://instagram.com/bapita", "https://www.facebook.com/bapita"],
    },
  ],
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

const shimi = {
  quote:
    "I never had time for any of this, I'm cutting hair all day. Bapita set everything up for me and it worked from day one. Now my clients book themselves and my chair stays full.",
  name: "Shimi Azut",
  meta: "Shimi Azut Hair Studio, Herzliya",
};

const faqs = [
  {
    q: "How much does it cost?",
    qKey: "faq.1.q",
    a: "It depends on your business: your services, your size, what you actually need. We do not do one size pricing. Tell us about your setup and we will give you a straight number on the call. No pressure, no pitch.",
    aKey: "faq.1.a",
  },
  {
    q: "How long until I am live?",
    qKey: "faq.2.q",
    a: "48 hours from our call. We work fast. If you have custom requests it can take a little longer, and we will tell you that upfront.",
    aKey: "faq.2.a",
  },
  {
    q: "I already run bookings on WhatsApp. Why change?",
    qKey: "faq.3.q",
    a: "You keep WhatsApp. We add a booking page so clients pick their own slot instead of messaging you for one. The back and forth stops. The bookings do not.",
    aKey: "faq.3.a",
  },
  {
    q: "Will my clients actually book online?",
    qKey: "faq.4.q",
    a: "They already book haircuts, tables, and doctors online. Yours will be the easy option: open at any hour, no waiting for you to reply at night.",
    aKey: "faq.4.a",
  },
  {
    q: "What do I actually need to do?",
    qKey: "faq.5.q",
    a: "One 30 minute call. Tell us your services, prices, and schedule. We build and run everything from there. No homework, no back and forth.",
    aKey: "faq.5.a",
  },
  {
    q: "Do I need to know anything about tech?",
    qKey: "faq.6.q",
    a: "Zero. That is the whole point. We build it, we maintain it. New service, new price, something to change? You message us and it is done.",
    aKey: "faq.6.a",
  },
];

const pageCss = `
.bp-home, .bp-home *, .bp-home *::before, .bp-home *::after { box-sizing: border-box; margin: 0; padding: 0; }

#scroll-progress {
  position: fixed;
  top: 0; left: 0;
  width: 0%;
  height: 3px;
  background: var(--amber, #E8920A);
  z-index: 9999;
  transition: width .08s linear;
  border-radius: 0 2px 2px 0;
}

.bp-home {
  --amber:       #E8920A;
  --amber-dark:  #B86800;
  --amber-hover: #d4830a;
  --dark:        #1E1A14;
  --dark-2:      #2a241b;
  --dark-footer: #16120d;
  --cream:       #FAF5EC;
  --cream-2:     #F5EFE3;
  --cream-3:     #EFE7D6;
  --terra:       #D4622A;
  --text-muted:  #6b6052;
  --line:        rgba(30,26,20,.09);

  --wash-amber: linear-gradient(157deg, #F8DEAE 0%, #E79B22 100%);
  --wash-sand:  linear-gradient(157deg, #F6EEDF 0%, #E6CB9E 100%);
  --wash-terra: linear-gradient(157deg, #EEB389 0%, #D4622A 100%);

  --r-card:  16px;
  --r-pill:  9999px;
  --r-soft:  12px;

  --shadow-card:  0 1px 2px rgba(30,26,20,.05), 0 8px 28px rgba(30,26,20,.07);
  --shadow-float: 0 12px 40px rgba(30,26,20,.16);
  --shadow-amber: 0 12px 30px rgba(232,146,10,.32);

  --maxw: 1160px;

  --bg:         #FBF9F4;
  --surface:    #FFFFFF;
  --surface-2:  #F6F1E8;
  --ink:        #1E1A14;
  --amber-soft: rgba(232,146,10,.10);

  --r-sm: 10px;
  --r-md: 14px;
  --r-lg: 20px;

  --shadow-xs: 0 1px 2px rgba(30,26,20,.05);
  --shadow-sm: 0 2px 6px rgba(30,26,20,.05),0 1px 2px rgba(30,26,20,.04);
  --shadow-md: 0 6px 18px rgba(30,26,20,.07),0 2px 6px rgba(30,26,20,.04);
  --shadow-lg: 0 18px 44px rgba(30,26,20,.11),0 6px 14px rgba(30,26,20,.05);

  --ease:      cubic-bezier(.16,1,.3,1);
  --ease-soft: cubic-bezier(.2,.7,.2,1);

  font-family: 'Heebo', sans-serif;
  font-weight: 400;
  background: var(--bg);
  color: var(--dark);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

.bp-home .display {
  font-size: clamp(2.6rem, 6.4vw, 4.4rem);
  font-weight: 900;
  line-height: 1.02;
  letter-spacing: -0.035em;
}
.bp-home .section-title {
  font-size: clamp(1.9rem, 4.4vw, 2.85rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.07;
  color: var(--dark);
}
.bp-home .section-label {
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 1rem;
}

.bp-home .section { padding: clamp(3.75rem, 7vw, 6rem) 1.5rem; scroll-margin-top: 72px; }
.bp-home .section-inner { max-width: var(--maxw); margin: 0 auto; }
.bp-home .section-head { margin-bottom: 2.75rem; max-width: 640px; }
.bp-home .section-head.center { margin-inline: auto; text-align: center; }
.bp-home .section-sub {
  font-size: 1.0625rem;
  font-weight: 300;
  line-height: 1.62;
  color: var(--text-muted);
  margin-top: 1rem;
}

.bp-home .btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  background: var(--amber);
  color: #fff;
  font-family: 'Heebo', sans-serif;
  font-weight: 700;
  font-size: 1.0625rem;
  border: none;
  border-radius: var(--r-pill);
  padding: 1rem 2.125rem;
  cursor: pointer;
  text-decoration: none;
  line-height: 1.2;
  box-shadow: var(--shadow-sm);
  transition: background .2s, transform .15s var(--ease), box-shadow .2s var(--ease);
}
.bp-home .btn-primary:hover {
  background: var(--amber-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-amber);
}
.bp-home .btn-primary.lg { font-size: 1.125rem; padding: 1.125rem 2.5rem; }
.bp-home .btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  font-weight: 700;
  font-size: .9375rem;
  color: var(--dark);
  text-decoration: none;
  opacity: .72;
  transition: opacity .2s;
}
.bp-home .btn-ghost:hover { opacity: 1; }

.bp-home .hero {
  --glow-x: 50%;
  --glow-y: 34%;
  background: var(--bg);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 92vh;
  padding: clamp(3.5rem,9vh,6rem) 1.5rem clamp(4rem,9vh,6.5rem);
  justify-content: flex-start;
}
.bp-home .hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(640px circle at var(--glow-x) var(--glow-y), rgba(232,146,10,.16) 0%, transparent 58%),
    radial-gradient(900px circle at 50% 118%, rgba(230,203,158,.35) 0%, transparent 60%);
  pointer-events: none; z-index: 0;
  transition: background .08s linear;
}
.bp-home .hero::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 60% 35% at 20% 20%, rgba(232,146,10,.10) 0%, transparent 70%),
    radial-gradient(ellipse 50% 30% at 80% 70%, rgba(212,98,42,.07) 0%, transparent 65%),
    radial-gradient(ellipse 40% 25% at 60% 10%, rgba(248,222,174,.18) 0%, transparent 60%);
  animation: heroShimmer 9s ease-in-out infinite alternate;
}
@keyframes heroShimmer {
  0%   { opacity: .6; transform: scale(1)    translateX(0px)   translateY(0px); }
  33%  { opacity: 1;  transform: scale(1.04) translateX(12px)  translateY(-8px); }
  66%  { opacity: .7; transform: scale(.97)  translateX(-10px) translateY(10px); }
  100% { opacity: .9; transform: scale(1.02) translateX(6px)   translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) { .bp-home .hero::after { animation: none; } }
.bp-home .hero-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
  max-width: var(--maxw);
  position: relative;
  z-index: 1;
}
.bp-home .hero-copy { max-width: 640px; margin: 0 auto; }
.bp-home .hero-eyebrow {
  display: inline-block;
  background: var(--amber-soft);
  border: 1px solid rgba(232,146,10,.3);
  border-radius: var(--r-pill);
  padding: .4rem 1.125rem;
  font-size: .75rem; font-weight: 700;
  letter-spacing: .07em; text-transform: uppercase;
  color: var(--amber-dark);
  margin-bottom: 1.5rem;
}
.bp-home .hero h1 { color: var(--ink); margin-bottom: 1.25rem; letter-spacing: -.04em; line-height: 1.02; }
.bp-home .hero h1 > span:first-child { white-space: nowrap; }
.bp-home .hero h1 .accent { color: var(--amber); }
.bp-home .hero-sub {
  font-size: clamp(1.125rem, 2.2vw, 1.3125rem);
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 460px;
  margin: 0 auto 2.25rem;
}
.bp-home .hero-ctas { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; justify-content: center; }
.bp-home .hero-ctas .btn-ghost { color: var(--ink); opacity: .72; }
.bp-home .hero-ctas .btn-ghost:hover { opacity: 1; }
.bp-home .hero-trust { margin-top: 1.1rem; font-size: .85rem; color: var(--text-muted); display:flex; align-items:center; justify-content:center; gap:.45rem; }
.bp-home .hero-trust svg { width:15px; height:15px; color:var(--amber); flex-shrink:0; }
.bp-home .hero-visual {
  margin-top: clamp(2.5rem,6vh,4.5rem);
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.bp-home .phone-stage { position: relative; display: inline-flex; }
.bp-home .phone-floor { position:absolute; left:50%; bottom:-20px; transform:translateX(-50%); width:78%; height:36px; border-radius:50%; background:radial-gradient(ellipse at center, rgba(30,26,20,.26), transparent 70%); filter:blur(9px); z-index:-1; pointer-events:none; }
.bp-home .phone { width: clamp(320px,86vw,404px); background:linear-gradient(155deg,#2c2620,#16120c); border-radius:50px; padding:13px; box-shadow: var(--shadow-lg), inset 0 0 0 2px rgba(255,255,255,.07), 0 0 0 1px rgba(0,0,0,.35); flex-shrink:0; position:relative; }
.bp-home .phone::before { content:""; position:absolute; top:13px; left:50%; transform:translateX(-50%); width:40%; height:26px; background:#16120c; border-radius:0 0 16px 16px; z-index:4; }
.bp-home .phone-stage::before { content:""; position:absolute; top:23%; inset-inline-start:-3px; width:4px; height:48px; background:linear-gradient(90deg,#16120c,#2c2620); border-radius:4px 0 0 4px; }
.bp-home .phone-stage::after { content:""; position:absolute; top:19%; inset-inline-end:-3px; width:4px; height:30px; background:linear-gradient(270deg,#16120c,#2c2620); border-radius:0 4px 4px 0; }
.bp-home .phone-screen { background:#fff; border-radius:38px; overflow:hidden; font-size:12px; position:relative; }
.bp-home .pp-status { display:flex; justify-content:space-between; align-items:center; padding:14px 22px 4px; font-size:11px; font-weight:700; color:var(--ink); }
.bp-home .pp-status-dots { display:flex; gap:3px; }
.bp-home .pp-status-dots i { width:5px; height:5px; border-radius:50%; background:var(--ink); opacity:.5; }
.bp-home .pp-top { display:flex; align-items:center; gap:10px; padding:10px 16px 14px; border-bottom:1px solid var(--line); background:linear-gradient(180deg, var(--amber-soft), transparent); }
.bp-home .pp-avatar { width:38px; height:38px; border-radius:12px; background:var(--wash-amber); color:#fff; font-weight:800; font-size:15px; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:var(--shadow-xs); }
.bp-home .pp-shop { font-size:15px; font-weight:800; letter-spacing:-.01em; color:var(--ink); }
.bp-home .pp-shop-meta { font-size:11px; color:var(--text-muted); margin-top:1px; }
.bp-home .pp-body { padding:14px 16px 16px; }
.bp-home .pp-h { font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); margin:2px 0 8px; }
.bp-home .pp-svc { display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid var(--line); border-radius:14px; padding:11px 13px; margin-bottom:8px; cursor: pointer; transition: all .18s var(--ease); }
.bp-home .pp-svc.sel { border-color:var(--amber); background:var(--amber-soft); }
.bp-home .pp-svc-main { display:flex; flex-direction:column; }
.bp-home .pp-svc-name { font-size:12.5px; font-weight:700; color:var(--ink); }
.bp-home .pp-svc-dur { font-size:10.5px; color:var(--text-muted); margin-top:1px; }
.bp-home .pp-svc-dot { width:18px; height:18px; border-radius:50%; border:2px solid var(--line); flex-shrink:0; display:flex; align-items:center; justify-content:center; margin-inline-start:auto; }
.bp-home .pp-svc.sel .pp-svc-dot { border-color:var(--amber); background:var(--amber); color:#fff; }
.bp-home .pp-svc-dot svg { width:11px; height:11px; opacity:0; }
.bp-home .pp-svc.sel .pp-svc-dot svg { opacity:1; }
.bp-home .pp-dates { display:flex; gap:7px; margin-bottom:12px; }
.bp-home .pp-date { flex:1; text-align:center; background:#fff; border:1.5px solid var(--line); border-radius:12px; padding:9px 0; cursor: pointer; transition: all .18s var(--ease); }
.bp-home .pp-date.sel { background:var(--amber); border-color:var(--amber); }
.bp-home .pp-date-d { font-size:9.5px; color:var(--text-muted); }
.bp-home .pp-date.sel .pp-date-d { color:rgba(255,255,255,.85); }
.bp-home .pp-date-n { font-size:14px; font-weight:800; color:var(--ink); margin-top:2px; }
.bp-home .pp-date.sel .pp-date-n { color:#fff; }
.bp-home .pp-times { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin-bottom:14px; }
.bp-home .pp-time { text-align:center; font-size:11.5px; font-weight:700; color:var(--ink); background:#fff; border:1.5px solid var(--line); border-radius:11px; padding:9px 0; cursor: pointer; transition: all .18s var(--ease); }
.bp-home .pp-time.sel { background:var(--amber); border-color:var(--amber); color:#fff; }
.bp-home .pp-time.off { color:var(--text-muted); opacity:.4; cursor: default; }
.bp-home .pp-book { background:var(--amber); color:#fff; text-align:center; font-size:13.5px; font-weight:800; border-radius:var(--r-pill); padding:13px 0; box-shadow:var(--shadow-sm); cursor: pointer; }
.bp-home .pp-chip { position:absolute; top:20%; inset-inline-end:-26px; inset-inline-start:auto; z-index:3; display:flex; align-items:center; gap:8px; background:#fff; border-radius:14px; padding:9px 13px 9px 9px; box-shadow:var(--shadow-md); border:1px solid rgba(30,26,20,.05); animation:chipFloat 3.4s var(--ease-soft) infinite; }
.bp-home .pp-chip-ico { width:26px; height:26px; border-radius:50%; background:var(--amber); color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.bp-home .pp-chip-ico svg { width:14px; height:14px; }
.bp-home .pp-chip-txt { font-size:11.5px; font-weight:700; color:var(--ink); line-height:1.3; }
.bp-home .pp-chip-txt small { display:block; font-weight:500; color:var(--text-muted); font-size:10px; }
@keyframes chipFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@media (max-width:480px){ .bp-home .pp-chip{ inset-inline-end:-8px; inset-inline-start:auto; top:18%; padding:7px 10px 7px 7px; font-size:10.5px; } }
@media (prefers-reduced-motion:reduce){ .bp-home .pp-chip{ animation:none; } }
.bp-home .pp-success { display:none; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:46px 18px; gap:10px; }
.bp-home #heroBooking.done .pp-body { display:none; }
.bp-home #heroBooking.done .pp-success { display:flex; }
.bp-home .pp-check { width:56px; height:56px; border-radius:50%; background:var(--amber); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-amber); }
.bp-home .pp-success.pop { animation:ppPop .45s var(--ease); }
@keyframes ppPop { 0%{transform:scale(.6);opacity:0} 100%{transform:scale(1);opacity:1} }
@media (prefers-reduced-motion:reduce){ .bp-home .pp-success.pop{ animation:none; } }

.bp-home .proof-bar { background: var(--surface); padding: .55rem 1.5rem; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.bp-home .proof-bar-inner {
  max-width: 1040px; margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
  gap: 0;
}
.bp-home .proof-item { display: flex; align-items: center; gap: .5rem; padding: .2rem 1.75rem; position: relative; flex-shrink: 0; }
.bp-home .proof-item + .proof-item::before { content: ""; position: absolute; inset-inline-start: 0; top: 50%; transform: translateY(-50%); width: 1px; height: 18px; background: var(--line); }
.bp-home .proof-num { font-size: .9375rem; font-weight: 800; letter-spacing: -.02em; color: var(--amber); line-height: 1; font-variant-numeric: tabular-nums; }
.bp-home .proof-lbl { font-size: .775rem; font-weight: 500; color: var(--text-muted); line-height: 1; white-space: nowrap; }
@media (max-width: 600px) {
  .bp-home .proof-bar { padding: .4rem 0; }
  .bp-home .proof-bar-inner { gap: 0; flex-wrap: wrap; }
  .bp-home .proof-item { padding: .5rem 0; width: 50%; justify-content: center; flex-shrink: 1; gap: .4rem; }
  .bp-home .proof-item + .proof-item::before { display: none; }
  .bp-home .proof-item:nth-child(1), .bp-home .proof-item:nth-child(2) { border-bottom: 1px solid var(--line); }
  .bp-home .proof-item:nth-child(odd) { border-right: 1px solid var(--line); }
}

.bp-home .pain { background: var(--cream-2); }
.bp-home .pain-layout { display: grid; grid-template-columns: 42% 1fr; gap: 3rem; align-items: start; margin-top: 2.5rem; }
.bp-home .pain-left { display: flex; flex-direction: column; gap: .35rem; }
.bp-home .pain-row {
  display: flex; align-items: flex-start; gap: .875rem;
  padding: 1rem 1.125rem; border-radius: var(--r-soft);
  cursor: pointer; border-inline-start: 3px solid transparent;
  transition: background .25s, border-color .25s;
}
.bp-home .pain-row:hover { background: rgba(232,146,10,.04); }
.bp-home .pain-row.active { background: #fff; border-inline-start-color: var(--amber); box-shadow: var(--shadow-card); }
.bp-home .pain-dot-ind { width: 8px; height: 8px; border-radius: 50%; background: var(--amber); flex-shrink: 0; margin-top: .45rem; opacity: .3; transition: opacity .25s; }
.bp-home .pain-row.active .pain-dot-ind { opacity: 1; }
.bp-home .pain-row-headline { font-size: 1.0625rem; font-weight: 700; color: var(--dark); opacity: .58; transition: opacity .25s, color .25s; margin-bottom: .25rem; line-height: 1.3; }
.bp-home .pain-row.active .pain-row-headline { opacity: 1; color: var(--amber-dark); }
.bp-home .pain-row-sub { font-size: .9rem; line-height: 1.55; color: var(--text-muted); }
.bp-home .pain-right {
  position: relative; height: 440px;
  border-radius: var(--r-card); overflow: hidden;
  background: var(--surface-2);
  box-shadow: var(--shadow-card);
  display: flex; align-items: center; justify-content: center;
}
.bp-home .pain-scene {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 2rem;
  opacity: 0;
  transition: opacity .4s var(--ease);
  pointer-events: none;
}
.bp-home .pain-scene.active { opacity: 1; pointer-events: auto; }
@media (prefers-reduced-motion: reduce) { .bp-home .pain-scene { transition: none; } }

.bp-home .psc-card {
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
  padding: 1.75rem;
  width: 100%;
  max-width: 340px;
  min-height: 392px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.bp-home .psc-result {
  display: flex; align-items: center; gap: .75rem;
  padding: .65rem .75rem; border-radius: var(--r-sm);
  border: 1px solid var(--line); margin-bottom: .625rem;
  background: var(--surface);
}
.bp-home .psc-result-lines { flex: 1; display: flex; flex-direction: column; gap: .35rem; }
.bp-home .psc-result-name { font-size: .8125rem; font-weight: 700; color: var(--dark); margin-bottom: .2rem; }
.bp-home .psc-result-meta { font-size: .7rem; font-weight: 600; color: var(--amber); }

.bp-home .psc-maps-shell {
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
  width: 100%;
  max-width: 340px;
  min-height: 392px;
  box-sizing: border-box;
  overflow: hidden;
}
.bp-home .psc-map-area { position: relative; width: 100%; }
.bp-home .psc-map-svg { display: block; width: 100%; height: auto; }
.bp-home .psc-map-search {
  position: absolute;
  top: .6rem; inset-inline-start: .6rem; inset-inline-end: .6rem;
  display: flex; align-items: center; gap: .5rem;
  background: var(--surface);
  border-radius: var(--r-sm);
  padding: .4rem .7rem;
  box-shadow: var(--shadow-sm);
  color: var(--text-muted);
}
.bp-home .psc-map-search svg { flex-shrink: 0; opacity: .6; }
.bp-home .psc-maps-list { padding: .75rem .875rem .875rem; display: flex; flex-direction: column; gap: .5rem; }
.bp-home .psc-result--map { margin-bottom: 0; }
.bp-home .psc-map-pin-badge {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--amber); color: #fff;
  font-size: .65rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bp-home .psc-slot-empty {
  display: flex; align-items: center; justify-content: center;
  padding: .75rem; border-radius: var(--r-sm);
  border: 1.5px dashed var(--amber);
  margin-top: .25rem;
}
.bp-home .psc-slot-label { font-size: .8125rem; font-weight: 500; color: var(--amber); opacity: .75; }

.bp-home .psc-chat-top { display: flex; align-items: center; gap: .6rem; margin-bottom: 1.375rem; }
.bp-home .psc-chat-time { font-size: .8125rem; font-weight: 600; color: var(--text-muted); margin-inline-start: auto; }
.bp-home .psc-moon { color: var(--text-muted); opacity: .7; }
.bp-home .psc-bubble-wrap { display: flex; flex-direction: column; gap: .75rem; }
.bp-home .psc-bubble { max-width: 82%; padding: .65rem .9rem; border-radius: 14px; font-size: .875rem; line-height: 1.45; color: var(--ink); }
.bp-home .psc-bubble.incoming { background: var(--surface-2); border-end-start-radius: 4px; align-self: flex-start; }
.bp-home .psc-badge { display: inline-flex; align-items: center; justify-content: center; width: 8px; height: 8px; border-radius: 50%; background: var(--amber); margin-inline-start: .5rem; flex-shrink: 0; }
.bp-home .psc-unanswered { display: flex; align-items: center; gap: .4rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--line); font-size: .775rem; color: var(--text-muted); }

.bp-home .psc-cal-hours { display: flex; flex-direction: column; gap: .5rem; }
.bp-home .psc-cal-row { display: flex; align-items: center; gap: .75rem; }
.bp-home .psc-cal-hour { font-size: .75rem; font-weight: 600; color: var(--text-muted); width: 2.75rem; flex-shrink: 0; text-align: end; }
.bp-home .psc-appt {
  flex: 1; height: 44px; border-radius: var(--r-sm);
  background: var(--surface-2);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 .75rem; gap: .5rem;
}
.bp-home .psc-appt-name { font-size: .8125rem; font-weight: 600; color: var(--text-muted); text-decoration: line-through; opacity: .55; }
.bp-home .psc-appt-tag { font-size: .7rem; font-weight: 600; color: var(--amber); background: var(--amber-soft); border-radius: var(--r-pill); padding: .15rem .55rem; white-space: nowrap; flex-shrink: 0; }
.bp-home .psc-cal-empty { flex: 1; height: 44px; border-radius: var(--r-sm); border: 1.5px dashed var(--amber); display: flex; align-items: center; justify-content: center; }
.bp-home .psc-cal-empty-label { font-size: .775rem; font-weight: 500; color: var(--amber); opacity: .7; }

.bp-home .psc-wa-header { font-size: .7rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted); margin-bottom: .625rem; padding: 0 .25rem; }
.bp-home .psc-wa-list { display: flex; flex-direction: column; gap: 0; width: 100%; }
.bp-home .psc-wa-row { display: flex; align-items: center; gap: .75rem; padding: .6rem .5rem; border-bottom: 1px solid var(--line); }
.bp-home .psc-wa-row:last-child { border-bottom: none; }
.bp-home .psc-wa-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; background: var(--surface-2); }
.bp-home .psc-wa-avatar.amber { background: rgba(232,146,10,.18); }
.bp-home .psc-wa-avatar.muted { background: rgba(0,0,0,.07); }
.bp-home .psc-wa-body { flex: 1; min-width: 0; }
.bp-home .psc-wa-top { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; margin-bottom: .2rem; }
.bp-home .psc-wa-name { font-size: .825rem; font-weight: 700; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bp-home .psc-wa-time { font-size: .7rem; color: var(--text-muted); flex-shrink: 0; }
.bp-home .psc-wa-time.unread { color: var(--amber); font-weight: 600; }
.bp-home .psc-wa-preview { font-size: .75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bp-home .psc-wa-badge {
  min-width: 18px; height: 18px; border-radius: 9px; padding: 0 5px;
  background: var(--amber); color: #fff;
  font-size: .65rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

@media (max-width: 820px) {
  .bp-home .pain-layout { grid-template-columns: 1fr; gap: 0; }
  .bp-home .pain-right { display: none; }
  .bp-home .pain-left { background: var(--surface); border-radius: var(--r-card); border: 1px solid var(--line); overflow: hidden; padding: 0; gap: 0; }
  .bp-home .pain-row { cursor: pointer; border-bottom: 1px solid var(--line); border-inline-start-width: 3px; padding: 1rem 1.125rem 1rem .875rem; border-radius: 0; box-shadow: none; }
  .bp-home .pain-row .pain-row-headline { opacity: 1; }
  .bp-home .pain-mobile-scene { overflow: hidden; max-height: 0; transition: max-height .38s var(--ease); background: var(--surface-2); border-bottom: 1px solid var(--line); }
  .bp-home .pain-row.active + .pain-mobile-scene { max-height: 460px; }
  .bp-home .pain-mobile-scene .pain-scene { position: relative; inset: auto; opacity: 1; pointer-events: auto; padding: 1.25rem 1rem; height: auto; display: flex; align-items: center; justify-content: center; }
  .bp-home .pain-mobile-scene .psc-maps-shell { max-width: 100%; width: 100%; }
  .bp-home .pain-mobile-scene .psc-card { max-width: 100%; width: 100%; padding: 1rem; }
}

.bp-home .step-num {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--amber); color: #fff; font-size: 1.05rem; font-weight: 900;
  display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;
}

.bp-home .build { background: var(--bg); }
.bp-home .bento {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  grid-template-rows: auto;
  gap: 1rem;
  margin-top: 2.75rem;
}
.bp-home .bento-tile {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  padding: 2rem 2rem 1.75rem;
  position: relative;
  overflow: hidden;
  transition: box-shadow .25s var(--ease), border-color .25s var(--ease), transform .25s var(--ease);
}
.bp-home .bento-tile:hover { box-shadow: var(--shadow-md); border-color: rgba(232,146,10,.3); transform: translateY(-3px); }
.bp-home .bento-tile.main { display: flex; flex-direction: column; background: var(--surface); }
.bp-home .bento-tile.main::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(480px circle at 30% 0%, rgba(232,146,10,.07) 0%, transparent 65%);
  pointer-events: none;
}
.bp-home .bento-tile.secondary { background: var(--surface-2); }
.bp-home .bento-tile.tertiary  { background: var(--surface-2); }

.bp-home .bento-tag {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  font-size: .6875rem; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase;
  padding: .25rem .75rem;
  border-radius: var(--r-pill);
  margin-bottom: 1.125rem;
}
.bp-home .bento-tag.paid  { background: rgba(232,146,10,.12); color: var(--amber-dark); }
.bp-home .bento-tag.free  { background: rgba(34,197,94,.12);  color: #16A34A; }
.bp-home .bento-tag.grow  { background: rgba(212,98,42,.12);  color: var(--terra); }

.bp-home .bento-ico {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--amber-soft); color: var(--amber);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1.125rem; flex-shrink: 0;
}
.bp-home .bento-ico svg { width: 22px; height: 22px; }
.bp-home .bento-tile.main .bento-ico { background: var(--amber); color: #fff; box-shadow: var(--shadow-amber); }

.bp-home .bento-h { font-size: 1.3125rem; font-weight: 800; letter-spacing: -.02em; color: var(--dark); margin-bottom: .5rem; line-height: 1.2; }
.bp-home .bento-tile.main .bento-h { font-size: 1.5rem; }
.bp-home .bento-p { font-size: .9375rem; line-height: 1.62; color: var(--text-muted); }

.bp-home .bento-browser {
  flex: 1;
  margin-top: 1rem;
  background: var(--surface-2);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
}
.bp-home .bento-browser-bar { background: var(--cream-2); border-bottom: 1px solid var(--line); height: 28px; display: flex; align-items: center; padding: 0 10px; gap: 5px; flex-shrink: 0; }
.bp-home .bento-browser-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.bp-home .bento-browser-url {
  flex: 1; background: var(--surface); border-radius: var(--r-pill); height: 16px;
  display: flex; align-items: center; padding: 0 8px;
  font-size: 7px; color: var(--text-muted); border: 1px solid var(--line);
  margin: 0 6px; gap: 4px;
}
.bp-home .bento-browser-url svg { width: 8px; height: 8px; color: #22C55E; flex-shrink: 0; }
.bp-home .bento-browser-inner {
  display: flex; align-items: flex-end; justify-content: center;
  padding: .75rem 1rem 0; flex: 1; min-height: 200px;
  background: linear-gradient(180deg, var(--cream) 0%, var(--surface-2) 100%);
}

.bp-home .bento-phone {
  width: 192px; background: #1A1A1E; border-radius: 28px; padding: 10px 8px;
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255,255,255,.08);
  position: relative;
}
.bp-home .bento-phone::before {
  content: ''; position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
  width: 36px; height: 5px; background: #111; border-radius: 3px; z-index: 2;
}
.bp-home .bento-phone-screen { background: #fff; border-radius: 20px; overflow: hidden; padding: 20px 10px 12px; }
.bp-home .bento-pp-avatar {
  width: 28px; height: 28px; border-radius: 50%; background: var(--amber); color: #fff;
  font-size: .6rem; font-weight: 900; display: flex; align-items: center; justify-content: center; margin-bottom: 6px;
}
.bp-home .bento-pp-name { font-size: 9px; font-weight: 800; color: var(--ink); margin-bottom: 1px; }
.bp-home .bento-pp-meta { font-size: 7.5px; color: var(--text-muted); margin-bottom: 8px; }
.bp-home .bento-pp-row {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--surface-2); border-radius: 5px; padding: 5px 7px; margin-bottom: 4px;
  font-size: 8px; font-weight: 600; color: var(--ink);
}
.bp-home .bento-pp-row span { color: var(--text-muted); font-weight: 400; font-size: 7.5px; }
.bp-home .bento-pp-btn { width: 100%; margin-top: 8px; background: var(--amber); color: #fff; border-radius: 20px; padding: 6px; font-size: 8px; font-weight: 700; text-align: center; }
.bp-home .bento-pp-cal { margin: 6px 0 4px; }
.bp-home .bento-pp-cal-label { font-size: 7px; font-weight: 700; color: var(--ink); margin-bottom: 4px; }
.bp-home .bento-pp-cal-row { display: flex; gap: 3px; margin-bottom: 3px; }
.bp-home .bento-pp-cal-day { flex: 1; text-align: center; font-size: 6.5px; font-weight: 600; color: var(--text-muted); background: var(--surface-2); border-radius: 3px; padding: 3px 0; }
.bp-home .bento-pp-cal-day.sel { background: var(--amber); color: #fff; }

.bp-home .bento-dash-mini { margin-top: 1.125rem; background: var(--surface); border-radius: var(--r-md); border: 1px solid var(--line); overflow: hidden; }
.bp-home .bento-dash-stats { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--line); }
.bp-home .bento-dash-stat { padding: .6rem .875rem; }
.bp-home .bento-dash-stat + .bento-dash-stat { border-inline-start: 1px solid var(--line); }
.bp-home .bento-dash-stat-n { font-size: 1.0625rem; font-weight: 800; color: var(--amber); line-height: 1; }
.bp-home .bento-dash-stat-l { font-size: .6rem; color: var(--text-muted); margin-top: 2px; }
.bp-home .bento-dash-appts { padding: .375rem .875rem .625rem; display: flex; flex-direction: column; gap: 0; }
.bp-home .bento-dash-row { display: flex; align-items: center; gap: .625rem; padding: .35rem 0; border-bottom: 1px solid var(--line); font-size: .8125rem; }
.bp-home .bento-dash-row:last-child { border-bottom: none; }
.bp-home .bento-dash-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.bp-home .bento-dash-name { font-weight: 700; color: var(--ink); flex: 1; }
.bp-home .bento-dash-time { font-size: .75rem; color: var(--text-muted); }

.bp-home .bento-addon-stack { display: flex; flex-direction: column; gap: .375rem; margin-top: 1rem; }
.bp-home .bento-addon-row { background: var(--surface); border-radius: var(--r-md); border: 1px solid var(--line); padding: .5rem .75rem; display: flex; align-items: center; gap: .625rem; }
.bp-home .bento-addon-ico { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bp-home .bento-addon-ico svg { width: 13px; height: 13px; }
.bp-home .bento-addon-label { font-size: .8125rem; font-weight: 700; color: var(--ink); flex: 1; }
.bp-home .bento-addon-sub { font-size: .6875rem; color: var(--text-muted); }
.bp-home .bento-addon-toggle { width: 24px; height: 13px; border-radius: var(--r-pill); position: relative; flex-shrink: 0; }
.bp-home .bento-addon-toggle.on  { background: var(--amber); }
.bp-home .bento-addon-toggle.off { background: rgba(30,26,20,.15); }
.bp-home .bento-addon-toggle::after { content: ''; position: absolute; top: 2.5px; width: 8px; height: 8px; border-radius: 50%; background: #fff; }
.bp-home .bento-addon-toggle.on::after  { right: 2.5px; }
.bp-home .bento-addon-toggle.off::after { left: 2.5px; }

@media (max-width: 860px) {
  .bp-home .bento { grid-template-columns: 1fr; grid-template-rows: auto; }
  .bp-home .bento-phone-wrap { min-height: 160px; }
  .bp-home .bento-tile.secondary, .bp-home .bento-tile.tertiary { padding: .875rem 1rem .75rem; }
  .bp-home .bento-tile.secondary .bento-p, .bp-home .bento-tile.tertiary .bento-p { display: none; }
  .bp-home .bento-tile.secondary .bento-ico, .bp-home .bento-tile.tertiary .bento-ico { width: 34px; height: 34px; border-radius: 9px; margin-bottom: .75rem; }
  .bp-home .bento-tile.secondary .bento-ico svg, .bp-home .bento-tile.tertiary .bento-ico svg { width: 17px; height: 17px; }
  .bp-home .bento-tile.secondary .bento-h, .bp-home .bento-tile.tertiary .bento-h { font-size: 1rem; margin-bottom: .375rem; }
  .bp-home .bento-tile.secondary .bento-dash-stats { font-size: .75rem; }
  .bp-home .bento-tile.secondary .bento-dash-stat-n { font-size: .875rem; }
  .bp-home .bento-tile.secondary .bento-dash-stat-l { font-size: .6rem; }
  .bp-home .bento-tile.secondary .bento-dash-appts { margin-top: .375rem; }
  .bp-home .bento-tile.secondary .bento-dash-row { font-size: .75rem; padding: .2rem 0; }
  .bp-home .bento-tile.secondary .bento-dash-row:last-child { display: none; }
  .bp-home .bento-tile.secondary .bento-dash-mini { margin-top: .5rem; }
  .bp-home .bento-tile.tertiary .bento-addon-stack { gap: .25rem; margin-top: .5rem; }
  .bp-home .bento-tile.tertiary .bento-addon-row { padding: .35rem .625rem; }
  .bp-home .bento-tile.tertiary .bento-addon-label { font-size: .75rem; }
  .bp-home .bento-tile.tertiary .bento-addon-sub { font-size: .6125rem; }
  .bp-home .bento-tile.tertiary .bento-addon-row:last-child { display: none; }
  .bp-home .bento-h { font-size: 1.125rem; }
  .bp-home .bento-tile.main .bento-h { font-size: 1.25rem; }
}

.bp-home .addons { background: var(--cream-2); }
.bp-home .addon-group { margin-bottom: 2.5rem; }
.bp-home .addon-group:last-child { margin-bottom: 0; }
.bp-home .addon-group-label { font-size: .6875rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: .75rem; padding-inline-start: .25rem; }
.bp-home .addon-list { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: var(--r-card); overflow: hidden; background: var(--surface); box-shadow: var(--shadow-sm); }
.bp-home .addon-item { border-bottom: 1px solid var(--line); }
.bp-home .addon-item:last-child { border-bottom: none; }
.bp-home .addon-row {
  width: 100%; background: none; border: none; cursor: pointer;
  font-family: 'Heebo', sans-serif; text-align: start;
  padding: 1.125rem 1.375rem;
  display: flex; align-items: center; gap: 1rem;
  transition: background .18s var(--ease);
}
.bp-home .addon-row:hover { background: rgba(232,146,10,.04); }
.bp-home .addon-item.open .addon-row { background: rgba(232,146,10,.05); }
.bp-home .addon-ico { width: 38px; height: 38px; border-radius: var(--r-soft); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: transform .2s var(--ease); }
.bp-home .addon-ico svg { width: 17px; height: 17px; }
.bp-home .addon-row:hover .addon-ico { transform: scale(1.08); }
.bp-home .addon-row-text { flex: 1; min-width: 0; }
.bp-home .addon-row-name { display: block; font-size: 1rem; font-weight: 700; color: var(--dark); margin-bottom: .15rem; line-height: 1.3; transition: color .18s; }
.bp-home .addon-row:hover .addon-row-name, .bp-home .addon-item.open .addon-row-name { color: var(--amber-dark); }
.bp-home .addon-row-tagline { display: block; font-size: .85rem; color: var(--text-muted); line-height: 1.4; }
.bp-home .addon-badge { display: inline-flex; align-items: center; padding: .22rem .75rem; border-radius: var(--r-pill); font-size: .6875rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; flex-shrink: 0; }
.bp-home .addon-badge.monthly { background: rgba(30,26,20,.07); color: var(--text-muted); }
.bp-home .addon-badge.one-time { background: rgba(212,98,42,.1); color: var(--terra); }
.bp-home .addon-chevron { width: 20px; height: 20px; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center; transition: transform .32s var(--ease); }
.bp-home .addon-chevron::before, .bp-home .addon-chevron::after { content: ''; position: absolute; height: 1.5px; width: 6px; background: var(--text-muted); border-radius: 2px; transition: transform .32s var(--ease), background .18s; }
.bp-home .addon-chevron::before { transform: translateX(-3px) rotate(45deg); transform-origin: right center; }
.bp-home .addon-chevron::after  { transform: translateX(3px)  rotate(-45deg); transform-origin: left center; }
.bp-home .addon-item.open .addon-chevron::before { transform: translateX(-3px) rotate(-45deg); }
.bp-home .addon-item.open .addon-chevron::after  { transform: translateX(3px) rotate(45deg); }
.bp-home .addon-row:hover .addon-chevron::before, .bp-home .addon-row:hover .addon-chevron::after { background: var(--amber); }
.bp-home .addon-item:not(.open) .addon-row:hover .addon-chevron { transform: translateY(2px); }
.bp-home .addon-panel { overflow: hidden; max-height: 0; transition: max-height .42s var(--ease); }
.bp-home .addon-item.open .addon-panel { max-height: 640px; }
.bp-home .addon-panel-inner { display: grid; grid-template-columns: 1fr 220px; gap: 1.5rem; padding: 1rem 1.375rem 1.75rem; align-items: start; }
.bp-home .addon-panel-desc { font-size: .9375rem; line-height: 1.65; color: var(--text-muted); }
.bp-home .addon-panel-desc strong { color: var(--dark); font-weight: 700; }
.bp-home .addon-visual {
  background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-md);
  overflow: hidden; min-height: 148px; display: flex; align-items: center; justify-content: center;
  padding: 1rem; flex-shrink: 0;
}

.bp-home .av-wa { display: flex; flex-direction: column; gap: .5rem; width: 100%; }
.bp-home .av-pay { display: flex; flex-direction: column; gap: .5rem; width: 100%; }
.bp-home .av-pay-row { display: flex; justify-content: space-between; align-items: center; }
.bp-home .av-pay-label { font-size: .7rem; color: var(--text-muted); }
.bp-home .av-pay-val { font-size: .7rem; font-weight: 700; color: var(--dark); }
.bp-home .av-pay-bar { height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; }
.bp-home .av-pay-bar-fill { height: 100%; width: 65%; background: var(--amber); border-radius: 3px; }
.bp-home .av-pay-btn { background: var(--amber); color: #fff; font-size: .7rem; font-weight: 700; border-radius: var(--r-pill); padding: .35rem .75rem; text-align: center; margin-top: .25rem; }

.bp-home .av-reviews { display: flex; flex-direction: column; gap: .5rem; width: 100%; align-items: center; }
.bp-home .av-reviews-stars { display: flex; gap: 3px; }
.bp-home .av-reviews-star { width: 16px; height: 16px; color: var(--amber); }
.bp-home .av-reviews-score { font-size: 1.5rem; font-weight: 900; color: var(--dark); line-height: 1; }
.bp-home .av-reviews-count { font-size: .7rem; color: var(--text-muted); }
.bp-home .av-reviews-bar-row { display: flex; align-items: center; gap: .4rem; width: 100%; }
.bp-home .av-reviews-bar-label { font-size: .65rem; color: var(--text-muted); flex-shrink: 0; }
.bp-home .av-reviews-track { flex: 1; height: 5px; border-radius: 3px; background: var(--line); overflow: hidden; }
.bp-home .av-reviews-fill { height: 100%; border-radius: 3px; background: var(--amber); }

.bp-home .av-ads { display: flex; flex-direction: column; gap: .4rem; width: 100%; }
.bp-home .av-ads-header { font-size: .65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
.bp-home .av-ads-stat-row { display: flex; gap: .5rem; }
.bp-home .av-ads-stat { flex: 1; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-soft); padding: .4rem .5rem; }
.bp-home .av-ads-stat-val { font-size: .9rem; font-weight: 900; color: var(--dark); }
.bp-home .av-ads-stat-label { font-size: .6rem; color: var(--text-muted); }
.bp-home .av-ads-bar-row { display: flex; align-items: center; gap: .4rem; }
.bp-home .av-ads-track { flex: 1; height: 5px; border-radius: 3px; background: var(--line); overflow: hidden; }
.bp-home .av-ads-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--amber) 0%, var(--terra) 100%); width: 72%; }
.bp-home .av-ads-bar-label { font-size: .65rem; color: var(--text-muted); }

.bp-home .av-sms { display: flex; flex-direction: column; gap: .45rem; width: 100%; }
.bp-home .av-sms-bubble { border-radius: 12px; padding: .4rem .65rem; font-size: .7rem; line-height: 1.4; max-width: 85%; }
.bp-home .av-sms-bubble.out { background: var(--amber); color: #fff; border-bottom-right-radius: 3px; align-self: flex-end; }
.bp-home .av-sms-bubble.in  { background: var(--surface); border: 1px solid var(--line); color: var(--ink); border-bottom-left-radius: 3px; align-self: flex-start; }
.bp-home .av-sms-time { font-size: .6rem; color: var(--text-muted); text-align: center; }

.bp-home .addon-channel-tabs { display: flex; gap: .375rem; margin-bottom: 1rem; }
.bp-home .addon-channel-tab {
  display: inline-flex; align-items: center; gap: .35rem;
  font-family: 'Heebo', sans-serif; font-size: .75rem; font-weight: 700;
  color: var(--text-muted); background: var(--surface-2);
  border: 1px solid var(--line); border-radius: var(--r-pill);
  padding: .3rem .75rem; cursor: pointer;
  transition: background .18s, border-color .18s, color .18s;
}
.bp-home .addon-channel-tab:hover { border-color: var(--amber); color: var(--amber-dark); }
.bp-home .addon-channel-tab.active { background: var(--amber-soft); border-color: rgba(232,146,10,.35); color: var(--amber-dark); }
.bp-home .addon-channel-desc { display: none; font-size: .9375rem; line-height: 1.65; color: var(--text-muted); margin-top: 0; }
.bp-home .addon-channel-desc.active { display: block; }
.bp-home .addon-channel-desc strong { color: var(--dark); font-weight: 700; }
.bp-home .addon-channel-visual { display: none; width: 100%; }
.bp-home .addon-channel-visual.active { display: block; }

.bp-home .av-email { display: flex; flex-direction: column; gap: .4rem; width: 100%; }
.bp-home .av-email-from { display: flex; align-items: center; gap: .4rem; margin-bottom: .15rem; }
.bp-home .av-email-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--amber); flex-shrink: 0; }
.bp-home .av-email-sender { font-size: .7rem; font-weight: 700; color: var(--dark); }
.bp-home .av-email-subject { font-size: .75rem; font-weight: 700; color: var(--ink); }
.bp-home .av-email-line { height: 7px; border-radius: 3px; background: var(--line); }
.bp-home .av-email-btn {
  margin-top: .25rem; align-self: flex-start;
  font-size: .65rem; font-weight: 700; color: var(--amber-dark);
  background: var(--amber-soft); border: 1px solid rgba(232,146,10,.25);
  border-radius: var(--r-pill); padding: .25rem .65rem;
}

.bp-home .av-gmb { display: flex; flex-direction: column; gap: .5rem; width: 100%; }
.bp-home .av-gmb-header { display: flex; align-items: center; gap: .5rem; }
.bp-home .av-gmb-logo { width: 24px; height: 24px; border-radius: 50%; background: rgba(232,146,10,.15); display: flex; align-items: center; justify-content: center; font-size: .65rem; font-weight: 900; color: var(--amber-dark); }
.bp-home .av-gmb-name { font-size: .75rem; font-weight: 700; color: var(--dark); }
.bp-home .av-gmb-stars { display: flex; gap: 2px; margin-top: .1rem; }
.bp-home .av-gmb-star { width: 10px; height: 10px; color: var(--amber); }
.bp-home .av-gmb-tag { font-size: .65rem; color: var(--text-muted); }
.bp-home .av-gmb-pill { display: inline-flex; align-items: center; gap: .3rem; background: rgba(232,146,10,.1); border-radius: var(--r-pill); padding: .25rem .6rem; font-size: .65rem; font-weight: 700; color: var(--amber-dark); }

@media (max-width: 640px) {
  .bp-home .addon-panel-inner { grid-template-columns: 1fr; padding: .875rem 1rem 1.25rem; }
  .bp-home .addon-visual { min-height: 120px; height: auto; }
  .bp-home .addon-row { padding: 1rem; }
}

.bp-home .tstrip { background: var(--cream); padding: clamp(5rem,9vw,8rem) 0; overflow: hidden; }
.bp-home .tstrip-head { max-width: var(--maxw); margin: 0 auto; padding: 0 1.5rem 3rem; text-align: center; }
.bp-home .pricing { background: var(--cream); }
.bp-home .pricing-card { position: relative; max-width: 440px; margin: 0 auto; background: #fff; border: 1px solid rgba(28,24,20,.08); border-radius: 26px; box-shadow: 0 30px 70px -40px rgba(28,24,20,.45); padding: clamp(2rem,4vw,2.75rem); text-align: center; overflow: hidden; transition: transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s cubic-bezier(.22,1,.36,1); }
.bp-home .pricing-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--amber), #f5b642, var(--amber)); }
.bp-home .pricing-card:hover { transform: translateY(-6px); box-shadow: 0 44px 90px -44px rgba(232,146,10,.5); }
.bp-home .pricing-glow { position: absolute; top: -40%; left: 50%; width: 320px; height: 320px; transform: translateX(-50%); background: radial-gradient(circle, rgba(232,146,10,.14), transparent 70%); pointer-events: none; opacity: 0; transition: opacity .5s ease; }
.bp-home .pricing-card:hover .pricing-glow { opacity: 1; }
.bp-home .pricing-plan { position: relative; font-size: .8rem; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: var(--amber-dark); margin: 0 0 1.25rem; }
.bp-home .pricing-price { position: relative; display: flex; flex-direction: column; align-items: center; gap: .4rem; margin: 0 0 1.75rem; }
.bp-home .pricing-setup { font-size: clamp(2rem,5vw,2.6rem); font-weight: 800; letter-spacing: -.03em; background: linear-gradient(120deg, var(--dark), var(--amber-dark)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.bp-home .pricing-month { font-size: .95rem; font-weight: 600; color: var(--text-muted); background: rgba(232,146,10,.08); padding: .3rem .85rem; border-radius: 999px; }
.bp-home .pricing-features { position: relative; list-style: none; margin: 0 0 2rem; padding: 1.5rem 0 0; border-top: 1px solid rgba(28,24,20,.07); display: flex; flex-direction: column; gap: 1rem; text-align: start; }
.bp-home .pricing-features li { display: flex; align-items: center; gap: .75rem; font-size: .975rem; font-weight: 500; color: var(--dark); opacity: 0; transform: translateY(8px); animation: pricingRowIn .5s cubic-bezier(.22,1,.36,1) forwards; }
.bp-home .pricing-check { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg, var(--amber), #f5b642); color: #fff; box-shadow: 0 2px 8px rgba(232,146,10,.35); }
.bp-home .pricing-cta { width: 100%; }
.bp-home .pricing-note { text-align: center; margin: 1.75rem auto 0; font-size: .9rem; }
.bp-home .pricing-note a { color: var(--text-muted); text-decoration: underline; text-underline-offset: 3px; transition: color .2s; }
.bp-home .pricing-note a:hover { color: var(--amber-dark); }
@keyframes pricingRowIn { to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .bp-home .pricing-card { transition: none; } .bp-home .pricing-features li { animation: none; opacity: 1; transform: none; } }
.bp-home .tfeature { max-width: 980px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1.5rem,3vw,2.75rem); align-items: center; padding: clamp(1.75rem,3vw,2.75rem); background: #fff; border: 1px solid rgba(28,24,20,.08); border-radius: 24px; box-shadow: 0 30px 80px -40px rgba(28,24,20,.45); }
.bp-home .tfeature-body { text-align: start; }
.bp-home .tfeature-stars { color: var(--amber); font-size: 1.05rem; letter-spacing: .18em; }
.bp-home .tfeature-quote { margin: 1rem 0 1.5rem; font-size: clamp(1.15rem,1.8vw,1.4rem); line-height: 1.5; font-weight: 600; color: var(--dark); }
.bp-home .tfeature-person { display: flex; align-items: center; gap: .75rem; }
.bp-home .tfeature-photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.bp-home .tfeature-id { display: flex; flex-direction: column; }
.bp-home .tfeature-name { font-weight: 700; color: var(--dark); }
.bp-home .tfeature-meta { font-size: .875rem; color: var(--text-muted); }
.bp-home .tfeature-google { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid rgba(28,24,20,.08); }
.bp-home .tfeature-glogo { width: 18px; height: 18px; flex-shrink: 0; }
.bp-home .tfeature-grade { font-weight: 800; color: var(--dark); }
.bp-home .tfeature-gstars { color: #fbbc05; letter-spacing: .06em; font-size: .95rem; }
.bp-home .tfeature-greviews { font-size: .875rem; color: var(--text-muted); }
.bp-home .tfeature-gpt { border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,.08); box-shadow: 0 20px 50px -25px rgba(0,0,0,.55); background: #0d1117; line-height: 0; }
.bp-home .tfeature-gpt img { width: 100%; height: auto; display: block; }
.bp-home .tfeature-gpt-cap { margin-top: .875rem; font-size: .9rem; line-height: 1.5; color: var(--text-muted); text-align: start; }
@media (max-width: 860px) { .bp-home .tfeature { grid-template-columns: 1fr; max-width: 560px; } }
.bp-home .tmarquee { display: flex; flex-direction: column; gap: 1.25rem; }
.bp-home .tmarquee-row { overflow: hidden; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%); }
.bp-home .tmarquee-track { display: flex; gap: 1.25rem; width: max-content; will-change: transform; animation: tscrollL 60s linear infinite; }
.bp-home .tmarquee-row.rev .tmarquee-track { animation-name: tscrollR; }
.bp-home .tmarquee-row:hover .tmarquee-track, .bp-home .tmarquee-row:focus-within .tmarquee-track { animation-play-state: paused; }
@keyframes tscrollL { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes tscrollR { from { transform: translateX(-50%); } to { transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .bp-home .tmarquee-track { animation: none !important; } }
@media (max-width: 768px) {
  .bp-home .tmarquee-track { animation-duration: 40s; }
  .bp-home .tmarquee-row.rev .tmarquee-track { animation-duration: 44s; }
  .bp-home .tstrip { padding: clamp(3rem,6vw,5rem) 0; }
}
@media (max-width: 600px) {
  .bp-home .tmarquee { gap: .875rem; }
  .bp-home .tmarquee-row {
    overflow-x: auto !important; overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
    -webkit-mask-image: none !important; mask-image: none !important;
    padding-bottom: 4px;
  }
  .bp-home .tmarquee-row::-webkit-scrollbar { display: none; }
  .bp-home .tmarquee-row.rev { display: none; }
  .bp-home .tmarquee-track { animation: none !important; width: auto; padding: 0 1rem; gap: .875rem; }
  .bp-home .tcard { width: 78vw; flex-shrink: 0; }
  .bp-home .tmarquee-track .tcard:nth-child(n+7) { display: none; }
}
.bp-home .tcard {
  background: #fff; border: 1px solid var(--line);
  border-radius: var(--r-card); padding: 1.5rem; width: 300px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: .75rem;
  transition: box-shadow .2s, border-color .2s;
}
.bp-home .tcard:hover { box-shadow: var(--shadow-card); border-color: rgba(232,146,10,.3); }
.bp-home .tstars { color: var(--amber); font-size: .85rem; letter-spacing: .12em; }
.bp-home .tquote { font-size: .9375rem; line-height: 1.55; color: var(--dark); }
.bp-home .tperson { display: flex; align-items: center; gap: .75rem; margin-top: auto; }
.bp-home .tavatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(232,146,10,.14); color: var(--amber-dark); font-weight: 900; font-size: .8rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bp-home .tname { font-size: .875rem; font-weight: 700; color: var(--dark); }
.bp-home .tmeta { font-size: .8rem; color: var(--text-muted); }

.bp-home .faq { background: var(--cream-2); padding: clamp(5.5rem,11vw,10rem) 1.5rem; }
.bp-home .faq-layout { display: grid; grid-template-columns: 1fr 1.7fr; gap: 5rem; align-items: start; }
.bp-home .faq-sticky { position: sticky; top: 104px; }
@media (max-width: 820px) { .bp-home .faq-layout { grid-template-columns: 1fr; gap: 1.5rem; } .bp-home .faq-sticky { position: static; } }
.bp-home .faq-item { border-bottom: 1px solid var(--line); }
.bp-home .faq-item:first-child { border-top: 1px solid var(--line); }
.bp-home .faq-btn {
  width: 100%; background: none; border: none; cursor: pointer;
  font-family: 'Heebo', sans-serif; font-size: 1.0625rem; font-weight: 700;
  color: var(--dark); text-align: start; padding: 1.375rem 0;
  display: flex; justify-content: space-between; align-items: center; gap: 1rem;
  transition: color .2s;
}
.bp-home .faq-btn:hover { color: var(--amber); }
.bp-home .faq-chevron { width: 22px; height: 22px; border: 2px solid currentColor; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform .3s; position: relative; }
.bp-home .faq-chevron::after { content: ''; width: 5px; height: 5px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg) translate(-1px, -2px); display: block; }
.bp-home .faq-item.open .faq-chevron { transform: rotate(180deg); }
.bp-home .faq-answer { overflow: hidden; max-height: 0; transition: max-height .38s ease; }
.bp-home .faq-item.open .faq-answer { max-height: 360px; }
.bp-home .faq-answer-body { padding-bottom: 1.375rem; font-size: .9375rem; line-height: 1.65; color: var(--text-muted); }

.bp-home .final-cta {
  --glow-x: 50%; --glow-y: 50%;
  background: var(--dark); padding: clamp(6rem, 10vw, 9rem) 1.5rem;
  text-align: center; position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.bp-home .final-cta::before { content: ''; position: absolute; inset: 0; background: radial-gradient(600px circle at var(--glow-x) var(--glow-y), rgba(232,146,10,.16) 0%, transparent 60%); pointer-events: none; z-index: 0; transition: background .08s linear; }
.bp-home .final-cta-inner { max-width: 620px; margin: 0 auto; position: relative; z-index: 1; }
.bp-home .final-cta h2 { font-size: clamp(2.1rem, 5.5vw, 3.25rem); font-weight: 900; letter-spacing: -.03em; color: #fff; line-height: 1.06; margin-bottom: 1.25rem; }
.bp-home .final-cta p { font-size: 1.0625rem; line-height: 1.65; color: rgba(255,255,255,.6); margin-bottom: 2.5rem; }
.bp-home .final-cta-trust { font-size: .8125rem; color: rgba(255,255,255,.3); margin-top: 1.125rem; }
.bp-home .final-trust-chips { display: flex; align-items: center; justify-content: center; gap: 1.75rem; flex-wrap: wrap; margin-top: 1.25rem; font-size: .8125rem; font-weight: 600; color: rgba(255,255,255,.45); }

.bp-home .fade-up { opacity: 0; transform: translateY(24px); transition: opacity .55s var(--ease), transform .55s var(--ease); }
.bp-home .fade-up.visible { opacity: 1; transform: translateY(0); }

.bp-home :focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; border-radius: 3px; }
.bp-home .hero a:focus-visible, .bp-home .final-cta a:focus-visible { outline-color: #fff; }
@media (prefers-reduced-motion: reduce) { .bp-home * { transition: none !important; scroll-behavior: auto !important; } }

.bp-home .hiw { background: var(--bg); }
.bp-home .hiw-layout { display: grid; grid-template-columns: 44% 1fr; gap: 3rem; align-items: start; margin-top: 2.5rem; }
.bp-home .hiw-steps { display: flex; flex-direction: column; position: relative; }
.bp-home .hiw-track { position: absolute; inset-inline-start: 13px; top: 14px; bottom: 14px; width: 1px; background: var(--line); }
.bp-home .hiw-track-fill { position: absolute; top: 0; left: 0; right: 0; background: var(--amber); transition: height .5s var(--ease); height: 0%; }
.bp-home .hiw-row { display: flex; align-items: flex-start; gap: 1.125rem; padding: 1rem 0 1rem .125rem; position: relative; cursor: pointer; }
.bp-home .hiw-row:hover .hiw-h { opacity: .75; }
.bp-home .hiw-num {
  width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--line); background: var(--bg);
  color: var(--text-muted); font-size: .75rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: border-color .35s, background .35s, color .35s;
  position: relative; z-index: 1; margin-top: .125rem;
}
.bp-home .hiw-row.active .hiw-num { border-color: var(--amber); background: var(--amber); color: #fff; }
.bp-home .hiw-text { padding-top: .125rem; flex: 1; min-width: 0; }
.bp-home .hiw-h { font-size: 1.0625rem; font-weight: 700; color: var(--dark); opacity: .4; transition: opacity .35s; margin-bottom: .3rem; }
.bp-home .hiw-row.active .hiw-h { opacity: 1; }
.bp-home .hiw-p { font-size: .9rem; line-height: 1.6; color: var(--text-muted); opacity: 0; max-height: 0; overflow: hidden; transition: opacity .35s var(--ease), max-height .4s var(--ease); }
.bp-home .hiw-row.active .hiw-p { opacity: 1; max-height: 120px; }
.bp-home .hiw-chevron {
  width: 20px; height: 20px; border: 1.5px solid var(--line); border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: .25rem;
  transition: transform .3s var(--ease), border-color .25s; position: relative; z-index: 1;
}
.bp-home .hiw-chevron::after { content: ''; width: 4px; height: 4px; border-right: 1.5px solid var(--text-muted); border-bottom: 1.5px solid var(--text-muted); transform: rotate(45deg) translate(-1px, -2px); display: block; transition: border-color .25s; }
.bp-home .hiw-row.active .hiw-chevron { transform: rotate(180deg); border-color: var(--amber); }
.bp-home .hiw-row.active .hiw-chevron::after { border-color: var(--amber); }

.bp-home .hiw-right {
  position: sticky; top: 104px; height: 400px; border-radius: var(--r-card);
  background: var(--surface-2); box-shadow: var(--shadow-card); overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.bp-home .hiw-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 2rem; opacity: 0; transition: opacity .45s var(--ease); pointer-events: none; }
.bp-home .hiw-scene.active { opacity: 1; pointer-events: auto; }
.bp-home .hiw-card { background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); padding: 1.75rem; width: 100%; max-width: 300px; min-height: 392px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; }

.bp-home .hiw-call-top { display: flex; align-items: center; gap: .875rem; margin-bottom: 1.25rem; }
.bp-home .hiw-call-ico { width: 42px; height: 42px; border-radius: 12px; background: var(--amber-soft); color: var(--amber); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bp-home .hiw-call-ico svg { width: 20px; height: 20px; }
.bp-home .hiw-call-label { font-size: .8rem; font-weight: 600; color: var(--text-muted); margin-bottom: .15rem; }
.bp-home .hiw-call-name { font-size: 1rem; font-weight: 800; color: var(--ink); }
.bp-home .hiw-call-chip {
  display: inline-flex; align-items: center; gap: .5rem; background: var(--amber-soft);
  border: 1px solid rgba(232,146,10,.25); border-radius: var(--r-pill); padding: .45rem 1rem;
  font-size: .8125rem; font-weight: 700; color: var(--amber-dark);
}
.bp-home .hiw-call-chip svg { width: 14px; height: 14px; flex-shrink: 0; }
.bp-home .hiw-call-divider { height: 1px; background: var(--line); margin: 1.125rem 0; }
.bp-home .hiw-call-meta { font-size: .8rem; color: var(--text-muted); display: flex; align-items: center; gap: .4rem; }
.bp-home .hiw-call-meta svg { width: 13px; height: 13px; opacity: .6; }
.bp-home .hiw-form-rows { display: flex; flex-direction: column; gap: .625rem; margin: 1.25rem 0; }
.bp-home .hiw-form-field { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .6rem .8rem; border-radius: var(--r-sm); background: var(--surface-2); }
.bp-home .hiw-form-lbl { font-size: .75rem; font-weight: 600; color: var(--text-muted); }
.bp-home .hiw-form-val { font-size: .8125rem; font-weight: 700; color: var(--ink); text-align: end; }
.bp-home .hiw-form-thumbs { display: flex; gap: .3rem; }
.bp-home .hiw-form-thumb { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg, var(--amber-soft), rgba(232,146,10,.28)); border: 1px solid rgba(232,146,10,.25); }
.bp-home .hiw-form-send { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: .7rem; border-radius: var(--r-sm); background: var(--amber-soft); color: var(--amber-dark); font-size: .8125rem; font-weight: 700; }
.bp-home .hiw-form-send svg { width: 15px; height: 15px; }

.bp-home .hiw-site-win { width: 100%; max-width: 300px; min-height: 392px; box-sizing: border-box; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-md); }
.bp-home .hiw-win-bar { display: flex; align-items: center; gap: 5px; background: var(--cream-2); padding: 9px 12px; border-bottom: 1px solid var(--line); }
.bp-home .hiw-win-dot { width: 9px; height: 9px; border-radius: 50%; }
.bp-home .hiw-win-url { margin-inline-start: 8px; font-size: 10px; color: var(--text-muted); background: #fff; border-radius: var(--r-pill); padding: 3px 10px; }
.bp-home .hiw-win-body { padding: 1.125rem; }
.bp-home .hiw-win-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--amber); color: #fff; font-size: .9rem; font-weight: 900; display: flex; align-items: center; justify-content: center; margin-bottom: .625rem; }
.bp-home .hiw-win-shop { font-size: .9375rem; font-weight: 800; color: var(--ink); margin-bottom: .15rem; }
.bp-home .hiw-win-meta { font-size: .775rem; color: var(--text-muted); margin-bottom: .875rem; }
.bp-home .hiw-win-svc { display: flex; justify-content: space-between; align-items: center; padding: .5rem .625rem; border-radius: var(--r-sm); background: var(--surface-2); margin-bottom: .4rem; font-size: .8125rem; font-weight: 600; color: var(--ink); }
.bp-home .hiw-win-svc span { color: var(--text-muted); font-weight: 400; }
.bp-home .hiw-win-btn { width: 100%; margin-top: .875rem; padding: .65rem; border-radius: var(--r-pill); background: var(--amber); color: #fff; font-size: .875rem; font-weight: 700; text-align: center; }
.bp-home .hiw-win-dates { display: flex; gap: .35rem; margin: .625rem 0 0; }
.bp-home .hiw-win-date { flex: 1; text-align: center; font-size: .65rem; font-weight: 600; color: var(--text-muted); background: var(--surface-2); border-radius: var(--r-sm); padding: .3rem .25rem; line-height: 1; }
.bp-home .hiw-win-date div { font-size: .8rem; font-weight: 800; color: var(--ink); margin-top: .2rem; }
.bp-home .hiw-win-date--sel { background: var(--amber-soft); color: var(--amber-dark); }
.bp-home .hiw-win-date--sel div { color: var(--amber-dark); }

.bp-home .hiw-notif-header { display: flex; align-items: center; gap: .625rem; margin-bottom: 1.125rem; }
.bp-home .hiw-notif-ico { width: 34px; height: 34px; border-radius: 10px; background: var(--amber); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bp-home .hiw-notif-ico svg { width: 17px; height: 17px; }
.bp-home .hiw-notif-app { font-size: .875rem; font-weight: 800; color: var(--ink); }
.bp-home .hiw-notif-count { margin-inline-start: auto; background: var(--amber); color: #fff; font-size: .7rem; font-weight: 800; border-radius: var(--r-pill); padding: .15rem .55rem; }
.bp-home .hiw-notif-item { display: flex; flex-direction: column; gap: .2rem; padding: .7rem .875rem; border-radius: var(--r-sm); background: var(--surface-2); margin-bottom: .4rem; }
.bp-home .hiw-notif-item.new { background: rgba(232,146,10,.07); border: 1px solid rgba(232,146,10,.18); }
.bp-home .hiw-notif-title { font-size: .8125rem; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: .4rem; }
.bp-home .hiw-notif-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--amber); flex-shrink: 0; }
.bp-home .hiw-notif-sub { font-size: .775rem; color: var(--text-muted); }
.bp-home .hiw-notif-time { font-size: .7rem; color: var(--text-muted); opacity: .7; margin-top: .1rem; }
.bp-home .hiw-notif-pulse { animation: hiwPulse 2.2s ease-in-out infinite; }
@keyframes hiwPulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(232,146,10,.0); } 50%{ box-shadow: 0 0 0 5px rgba(232,146,10,.15); } }
@media (prefers-reduced-motion: reduce) { .bp-home .hiw-notif-pulse { animation: none; } }
.bp-home .hiw-notif-item--sent { background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.15); }
.bp-home .hiw-notif-dot--green { background: #22C55E; }

@media (max-width: 820px) {
  .bp-home .hiw-layout { grid-template-columns: 1fr; }
  .bp-home .hiw-right { display: none; }
  .bp-home .hiw-track { display: none; }
  .bp-home .hiw-steps { background: var(--surface); border-radius: var(--r-card); border: 1px solid var(--line); overflow: hidden; padding: 0; }
  .bp-home .hiw-row { cursor: pointer; padding: 1rem .875rem 1rem .625rem; border-bottom: 1px solid var(--line); }
  .bp-home .hiw-p { max-height: 0; opacity: 0; transition: max-height .35s var(--ease), opacity .25s; }
  .bp-home .hiw-row.active .hiw-p { max-height: 200px; opacity: 1; }
  .bp-home .hiw-mobile-scene { overflow: hidden; max-height: 0; transition: max-height .38s var(--ease); background: var(--surface-2); border-bottom: 1px solid var(--line); }
  .bp-home .hiw-row.active + .hiw-mobile-scene { max-height: 380px; }
  .bp-home .hiw-mobile-scene .hiw-scene { position: relative; inset: auto; opacity: 1; pointer-events: auto; height: auto; padding: 1.25rem 1rem; display: flex; align-items: center; justify-content: center; }
  .bp-home .hiw-card { padding: 1rem; width: 100%; max-width: 300px; }
  .bp-home .hiw-site-win { max-width: 280px; }
}

.bp-home .hiw-closer {
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
  margin-top: 2.5rem; padding: 1.375rem 1.75rem; background: var(--surface);
  border: 1px solid var(--line); border-inline-start: 3px solid var(--amber);
  border-radius: 0 var(--r-soft) var(--r-soft) 0; box-shadow: var(--shadow-xs);
}
.bp-home .hiw-closer-text { font-size: 1rem; font-weight: 700; color: var(--dark); }
@media (max-width: 600px) { .bp-home .hiw-closer { flex-direction: column; align-items: flex-start; gap: 1rem; } }

@media (max-width: 768px) {
  .bp-home .section { padding: 2.75rem 1.25rem; }
  .bp-home .section-head { margin-bottom: 2rem; }
  .bp-home .faq { padding: 3.5rem 1.25rem; }
  .bp-home .section.pain, .bp-home .section.hiw, .bp-home .section.build, .bp-home .section.addons { min-height: 0 !important; }
  .bp-home .section.faq { min-height: 0 !important; }
  .bp-home .final-cta { min-height: 0 !important; }
  .bp-home .hero { min-height: 0; padding: 2.25rem 1.25rem 2.75rem; }
  .bp-home .hero-visual { margin-top: 1.75rem; }
  .bp-home .phone { width: clamp(272px, 78vw, 340px); border-radius: 42px; }
  .bp-home .phone-screen { border-radius: 32px; }
  .bp-home .hero h1.display { font-size: clamp(2rem, 8.5vw, 2.4rem); }
  .bp-home .section { scroll-margin-top: 72px; }
}

.bp-home .hero, .bp-home .section { scroll-snap-align: start; scroll-snap-stop: normal; }
.bp-home .section.faq { scroll-snap-align: none; }
.bp-home .final-cta { scroll-snap-align: none; }
@media (prefers-reduced-motion: reduce) { .bp-home { scroll-snap-type: none; } }

/* ── Connect modal ── */
.bp-home .bap-opt-btn { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border: 1.5px solid var(--cream-3); border-radius: 14px; background: white; cursor: pointer; text-align: start; font-family: inherit; width: 100%; transition: border-color .15s, box-shadow .15s; }
.bp-home .bap-opt-btn:hover { border-color: var(--amber); box-shadow: 0 4px 16px rgba(232,146,10,.12); }
.bp-home .bap-input { height: 44px; padding: 0 14px; border-radius: 11px; border: 1.5px solid var(--cream-3); background: white; font-size: 14px; color: var(--dark); outline: none; font-family: inherit; width: 100%; box-sizing: border-box; transition: border-color .15s; }
.bp-home .bap-input:focus { border-color: var(--amber); }
`;

export default function MarketingHomePage() {
  return (
    <div className="bp-home">
      <style dangerouslySetInnerHTML={{ __html: pageCss }} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Script
        defer
        data-domain="bapita.com"
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
      <Script id="plausible-shim" strategy="afterInteractive">
        {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
      </Script>

      <div id="scroll-progress" aria-hidden="true" />

      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="hero" id="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrow" data-i18n="hero.eyebrow">
              For appointment based businesses
            </div>
            <h1 className="display">
              <span data-i18n="hero.h1a">Your business online.</span>
              <br />
              <span className="accent" data-i18n="hero.h1b">
                Built for you.
              </span>
            </h1>
            <p className="hero-sub" data-i18n="hero.sub">
              A booking website your clients love, a free owner dashboard, and automations. We build
              it, connect it, and keep it running. You just show up.
            </p>
            <div className="hero-ctas">
              <a href="#" className="btn-primary lg" data-cta="hero_primary" data-i18n="cta.book">
                Build my site
              </a>
            </div>
            <p className="hero-trust">
              <CheckIcon />
              <span data-i18n="hero.trust">Live in 48 hours. No tech skills, no commitment.</span>
            </p>
          </div>
          <div className="hero-visual">
            <div className="phone-stage">
              <div className="phone-floor" aria-hidden="true" />
              <div className="phone" id="heroBooking" role="img" aria-label="Booking page preview">
                <div className="phone-screen">
                  <div className="pp-status">
                    <span>9:41</span>
                    <span className="pp-status-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                  <div className="pp-top">
                    <div className="pp-avatar" aria-hidden="true">A</div>
                    <div>
                      <div className="pp-shop" data-i18n="mock.shop">
                        Studio Avi
                      </div>
                      <div className="pp-shop-meta">
                        <span data-i18n="mock.barber">Barbershop</span> · Herzliya
                      </div>
                    </div>
                  </div>
                  <div className="pp-body">
                    <div className="pp-h" data-i18n="mock.service">
                      Service
                    </div>
                    <div className="pp-svc">
                      <div className="pp-svc-main">
                        <div className="pp-svc-name" data-i18n="mock.cut">
                          Haircut
                        </div>
                        <div className="pp-svc-dur">
                          45 <span data-i18n="mock.min">min</span>
                        </div>
                      </div>
                      <span className="pp-svc-dot">
                        <CheckIcon />
                      </span>
                    </div>
                    <div className="pp-svc">
                      <div className="pp-svc-main">
                        <div className="pp-svc-name" data-i18n="mock.cutbeard">
                          Cut and beard
                        </div>
                        <div className="pp-svc-dur">
                          60 <span data-i18n="mock.min">min</span>
                        </div>
                      </div>
                      <span className="pp-svc-dot">
                        <CheckIcon />
                      </span>
                    </div>
                    <div className="pp-h" data-i18n="mock.pickday">
                      Pick a day
                    </div>
                    <div className="pp-dates">
                      <div className="pp-date">
                        <div className="pp-date-d" data-i18n="day.mon">
                          Mon
                        </div>
                        <div className="pp-date-n">9</div>
                      </div>
                      <div className="pp-date">
                        <div className="pp-date-d" data-i18n="day.tue">
                          Tue
                        </div>
                        <div className="pp-date-n">10</div>
                      </div>
                      <div className="pp-date">
                        <div className="pp-date-d" data-i18n="day.wed">
                          Wed
                        </div>
                        <div className="pp-date-n">11</div>
                      </div>
                      <div className="pp-date">
                        <div className="pp-date-d" data-i18n="day.thu">
                          Thu
                        </div>
                        <div className="pp-date-n">12</div>
                      </div>
                    </div>
                    <div className="pp-times">
                      <div className="pp-time off">09:30</div>
                      <div className="pp-time">10:15</div>
                      <div className="pp-time">11:00</div>
                      <div className="pp-time">12:30</div>
                      <div className="pp-time off">14:00</div>
                      <div className="pp-time">15:45</div>
                    </div>
                    <div className="pp-book" data-i18n="mock.book">
                      Book now
                    </div>
                  </div>
                  <div className="pp-success">
                    <div className="pp-check">
                      <CheckIcon className="!w-7 !h-7" />
                    </div>
                    <div className="pp-svc-name" data-i18n="mock.booked">
                      Booked!
                    </div>
                    <div className="pp-svc-dur" data-i18n="mock.confirm">
                      A confirmation is on its way.
                    </div>
                  </div>
                </div>
              </div>
              <div className="pp-chip" aria-hidden="true">
                <span className="pp-chip-ico">
                  <CheckIcon />
                </span>
                <span className="pp-chip-txt">
                  <span data-i18n="mock.chip">Click to book</span>
                  <small data-i18n="mock.chiptime">Tomorrow · 11:00</small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROOF BAR ────────────────────────────────────── */}
      <div className="proof-bar" aria-label="Key facts">
        <div className="proof-bar-inner">
          <div className="proof-item fade-up" style={{ transitionDelay: "0ms" }}>
            <div className="proof-num">48h</div>
            <div className="proof-lbl" data-i18n="proof.1">
              Live from your first call
            </div>
          </div>
          <div className="proof-item fade-up" style={{ transitionDelay: "80ms" }}>
            <div className="proof-num">24/7</div>
            <div className="proof-lbl" data-i18n="proof.2">
              Clients book while you sleep
            </div>
          </div>
          <div className="proof-item fade-up" style={{ transitionDelay: "160ms" }}>
            <div className="proof-num" data-i18n="proof.3num">
              1 call
            </div>
            <div className="proof-lbl" data-i18n="proof.3">
              All we need from you
            </div>
          </div>
          <div className="proof-item fade-up" style={{ transitionDelay: "240ms" }}>
            <div className="proof-num" data-i18n="proof.4num">
              0 tech
            </div>
            <div className="proof-lbl" data-i18n="proof.4">
              No knowledge required
            </div>
          </div>
        </div>
      </div>

      <PainSection />
      <HowItWorksSection />
      <BuildSection />
      <AddonsSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />

      {/* ─── FINAL CTA ────────────────────────────────────── */}
      <section className="final-cta">
        <div className="final-cta-inner fade-up">
          <h2 data-i18n="final.title">Ready to go live?</h2>
          <p data-i18n="final.p">
            Send your details and we start building. Prefer to talk? We are around. No pressure, no
            commitment.
          </p>
          <a href="#" className="btn-primary lg" data-cta="final_cta" data-i18n="cta.book">
            Build my site
          </a>
          <div className="final-trust-chips">
            <span data-i18n="chip.1">✓ No commitment</span>
            <span data-i18n="chip.2">✓ 48h turnaround</span>
          </div>
          <p className="final-cta-trust" data-i18n="final.trust">
            Fill the form, or talk to us first. Your call.
          </p>
        </div>
      </section>

      <ConnectModal />
      <InteractivityScript />
    </div>
  );
}

function PainSection() {
  const rows = [
    {
      h: "You are invisible online",
      hKey: "pain.0.h",
      s: "No profile, no search presence. Someone looked for what you do and found three competitors.",
      sKey: "pain.0.s",
    },
    {
      h: "Missed leads every night",
      hKey: "pain.1.h",
      s: "They messaged at 11PM. By morning they had booked someone else. The first reply wins.",
      sKey: "pain.1.s",
    },
    {
      h: "No shows eating into your week",
      hKey: "pain.2.h",
      s: "No reminder went out. That slot is gone, and someone else wanted it.",
      sKey: "pain.2.s",
    },
    {
      h: "No visibility into your own schedule",
      hKey: "pain.3.h",
      s: "You reconstruct your week from WhatsApp screenshots every Sunday morning.",
      sKey: "pain.3.s",
    },
  ];
  return (
    <section className="section pain" id="problem">
      <div className="section-inner">
        <div className="section-head fade-up">
          <p className="section-label" data-i18n="pain.label">
            Sound familiar?
          </p>
          <h2 className="section-title" data-i18n="pain.title">
            The real cost of running things manually
          </h2>
          <p className="section-sub" data-i18n="pain.sub">
            These aren&apos;t one off annoyances. They repeat every week, quietly costing you
            clients, hours, and revenue.
          </p>
        </div>
        <div className="pain-layout fade-up" style={{ transitionDelay: "120ms" }}>
          <div className="pain-left">
            {rows.map((r, i) => (
              <div
                key={r.h}
                className={`pain-row${i === 0 ? " active" : ""}`}
                data-index={i}
                role="button"
                tabIndex={0}
                aria-pressed={i === 0}
              >
                <span className="pain-dot-ind" />
                <div>
                  <div className="pain-row-headline" data-i18n={r.hKey}>
                    {r.h}
                  </div>
                  <div className="pain-row-sub" data-i18n={r.sKey}>
                    {r.s}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="pain-right">
            <div className="pain-scene active" data-index={0} aria-hidden="false">
              <div className="psc-maps-shell">
                <div className="psc-map-area">
                  <svg className="psc-map-svg" viewBox="0 0 300 140" aria-hidden="true">
                    <rect width="300" height="140" fill="#E8E0D4" />
                    <rect x="10" y="10" width="60" height="40" rx="3" fill="#BEB09A" />
                    <rect x="82" y="10" width="80" height="40" rx="3" fill="#BEB09A" />
                    <rect x="174" y="10" width="55" height="40" rx="3" fill="#BEB09A" />
                    <rect x="240" y="10" width="50" height="40" rx="3" fill="#BEB09A" />
                    <rect x="10" y="66" width="45" height="50" rx="3" fill="#BEB09A" />
                    <rect x="67" y="66" width="70" height="50" rx="3" fill="#BEB09A" />
                    <rect x="149" y="66" width="55" height="50" rx="3" fill="#BEB09A" />
                    <rect x="216" y="66" width="74" height="50" rx="3" fill="#BEB09A" />
                    <rect x="0" y="56" width="300" height="8" fill="#F5EFE3" />
                    <rect x="0" y="123" width="300" height="8" fill="#F5EFE3" />
                    <rect x="72" y="0" width="8" height="140" fill="#F5EFE3" />
                    <rect x="164" y="0" width="8" height="140" fill="#F5EFE3" />
                    <rect x="232" y="0" width="8" height="140" fill="#F5EFE3" />
                    <circle cx="106" cy="38" r="9" fill="#E8920A" />
                    <text x="106" y="42" textAnchor="middle" fontSize="9" fontWeight="800" fill="white">1</text>
                    <circle cx="180" cy="38" r="9" fill="#E8920A" />
                    <text x="180" y="42" textAnchor="middle" fontSize="9" fontWeight="800" fill="white">2</text>
                    <circle cx="252" cy="38" r="9" fill="#E8920A" />
                    <text x="252" y="42" textAnchor="middle" fontSize="9" fontWeight="800" fill="white">3</text>
                    <circle cx="92" cy="92" r="9" fill="none" stroke="#E8920A" strokeWidth="2" strokeDasharray="3 2" />
                    <text x="92" y="96" textAnchor="middle" fontSize="8" fontWeight="700" fill="#E8920A">?</text>
                  </svg>
                  <div className="psc-map-search">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span className="psc-search-query" data-i18n="pain.s0.query">
                      barber near me
                    </span>
                  </div>
                </div>
                <div className="psc-maps-list">
                  <div className="psc-result psc-result--map">
                    <div className="psc-map-pin-badge">1</div>
                    <div className="psc-result-lines">
                      <div className="psc-result-name">Barbershop HaDar</div>
                      <div className="psc-result-meta">
                        ★★★★★ <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>4.9 · Open now</span>
                      </div>
                    </div>
                  </div>
                  <div className="psc-result psc-result--map">
                    <div className="psc-map-pin-badge">2</div>
                    <div className="psc-result-lines">
                      <div className="psc-result-name">Cut King</div>
                      <div className="psc-result-meta">
                        ★★★★☆ <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>4.7 · 0.4 km</span>
                      </div>
                    </div>
                  </div>
                  <div className="psc-slot-empty" style={{ marginTop: 0 }}>
                    <span className="psc-slot-label" data-i18n="pain.s0.empty">
                      You&apos;re not here
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pain-scene" data-index={1} aria-hidden="true">
              <div className="psc-card">
                <div className="psc-chat-top">
                  <div className="psc-wa-avatar amber" style={{ width: 30, height: 30, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="psc-wa-name">Maya R.</div>
                    <div className="psc-wa-preview">last seen today at 08:02</div>
                  </div>
                  <svg className="psc-moon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span className="psc-chat-time">23:14</span>
                </div>
                <div className="psc-bubble-wrap">
                  <div className="psc-bubble incoming">Hi, do you have a slot tomorrow morning?</div>
                  <div className="psc-bubble incoming">Any time before noon works 🙏</div>
                </div>
                <div className="psc-wa-time" style={{ padding: ".35rem .1rem 0", fontSize: ".7rem" }}>Monday 08:17</div>
                <div className="psc-bubble-wrap" style={{ marginTop: ".4rem" }}>
                  <div className="psc-bubble incoming">It&apos;s ok, already booked somewhere else</div>
                </div>
                <div className="psc-unanswered">
                  <span className="psc-badge" aria-hidden="true" />
                  <span>No reply sent · client lost</span>
                </div>
              </div>
            </div>

            <div className="pain-scene" data-index={2} aria-hidden="true">
              <div className="psc-card">
                <div
                  className="psc-wa-header"
                  style={{ marginBottom: ".75rem" }}
                  data-i18n="pain.s2.day"
                >
                  Tuesday
                </div>
                <div className="psc-cal-hours">
                  <div className="psc-cal-row">
                    <span className="psc-cal-hour">09:00</span>
                    <div className="psc-appt" style={{ borderInlineStart: "3px solid #22C55E", background: "rgba(34,197,94,.07)" }}>
                      <span className="psc-appt-name" style={{ textDecoration: "none", opacity: 1, color: "var(--dark)" }}>Oren B.</span>
                      <span
                        className="psc-appt-tag"
                        style={{ background: "rgba(34,197,94,.12)", color: "#16A34A" }}
                        data-i18n="pain.s2.confirmed"
                      >
                        confirmed
                      </span>
                    </div>
                  </div>
                  <div className="psc-cal-row">
                    <span className="psc-cal-hour">10:00</span>
                    <div className="psc-appt">
                      <span className="psc-appt-name">David K.</span>
                      <span className="psc-appt-tag">no reminder sent</span>
                    </div>
                  </div>
                  <div className="psc-cal-row">
                    <span className="psc-cal-hour">10:45</span>
                    <div className="psc-cal-empty">
                      <span className="psc-cal-empty-label">slot lost</span>
                    </div>
                  </div>
                  <div className="psc-cal-row">
                    <span className="psc-cal-hour">12:00</span>
                    <div className="psc-appt" style={{ borderInlineStart: "3px solid var(--amber)", background: "var(--amber-soft)" }}>
                      <span className="psc-appt-name" style={{ textDecoration: "none", opacity: 1, color: "var(--dark)" }}>Noa L.</span>
                      <span className="psc-appt-tag">no reminder sent</span>
                    </div>
                  </div>
                </div>
                <div className="psc-unanswered">
                  <span className="psc-badge" aria-hidden="true" />
                  <span>2 no shows · 2 slots gone</span>
                </div>
              </div>
            </div>

            <div className="pain-scene" data-index={3} aria-hidden="true">
              <div className="psc-card">
                <div className="psc-wa-header" data-i18n="pain.s3.header">
                  WhatsApp
                </div>
                <div className="psc-wa-list">
                  <div className="psc-wa-row">
                    <div className="psc-wa-avatar amber" />
                    <div className="psc-wa-body">
                      <div className="psc-wa-top">
                        <span className="psc-wa-name">Yossi K.</span>
                        <span className="psc-wa-time unread">23:14</span>
                      </div>
                      <div className="psc-wa-preview">are you open Sunday?</div>
                    </div>
                    <div className="psc-wa-badge">2</div>
                  </div>
                  <div className="psc-wa-row">
                    <div className="psc-wa-avatar muted" />
                    <div className="psc-wa-body">
                      <div className="psc-wa-top">
                        <span className="psc-wa-name">Dana M.</span>
                        <span className="psc-wa-time unread">22:51</span>
                      </div>
                      <div className="psc-wa-preview">can I move to 11?</div>
                    </div>
                    <div className="psc-wa-badge">1</div>
                  </div>
                  <div className="psc-wa-row">
                    <div className="psc-wa-avatar amber" />
                    <div className="psc-wa-body">
                      <div className="psc-wa-top">
                        <span className="psc-wa-name">Avi S.</span>
                        <span className="psc-wa-time">Mon</span>
                      </div>
                      <div className="psc-wa-preview">ok confirmed for 14:00</div>
                    </div>
                  </div>
                  <div className="psc-wa-row">
                    <div className="psc-wa-avatar muted" />
                    <div className="psc-wa-body">
                      <div className="psc-wa-top">
                        <span className="psc-wa-name">Noa B.</span>
                        <span className="psc-wa-time unread">Sun</span>
                      </div>
                      <div className="psc-wa-preview">wait which day did we say?</div>
                    </div>
                    <div className="psc-wa-badge">3</div>
                  </div>
                  <div className="psc-wa-row">
                    <div className="psc-wa-avatar muted" />
                    <div className="psc-wa-body">
                      <div className="psc-wa-top">
                        <span className="psc-wa-name">Roni T.</span>
                        <span className="psc-wa-time">Sat</span>
                      </div>
                      <div className="psc-wa-preview">you never replied 😤</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="section hiw" id="how-it-works">
      <div className="section-inner">
        <div className="section-head fade-up">
          <p className="section-label" data-i18n="how.label">
            The process
          </p>
          <h2 className="section-title" data-i18n="how.title">
            Three steps. Then you are live.
          </h2>
          <p className="section-sub" data-i18n="how.sub">
            No tech skills needed, no long onboarding. Just one conversation, and we take care of
            the rest.
          </p>
        </div>
        <div className="hiw-layout fade-up" style={{ transitionDelay: "120ms" }}>
          <div className="hiw-steps">
            <div className="hiw-track" aria-hidden="true">
              <div className="hiw-track-fill" id="hiwTrackFill" />
            </div>

            <div className="hiw-row active" data-hiw={0} role="button" tabIndex={0} aria-expanded="true">
              <div className="hiw-num" aria-hidden="true">1</div>
              <div className="hiw-text">
                <div className="hiw-h" data-i18n="how.1.h">
                  We talk
                </div>
                <div className="hiw-p" data-i18n="how.1.p">
                  One call, 30 minutes. You tell us about your business: your services, how you
                  handle bookings now, what you want to fix. We take it from there.
                </div>
              </div>
              <div className="hiw-chevron" aria-hidden="true" />
            </div>

            <div className="hiw-row" data-hiw={1} role="button" tabIndex={0} aria-expanded="false">
              <div className="hiw-num" aria-hidden="true">2</div>
              <div className="hiw-text">
                <div className="hiw-h" data-i18n="how.2.h">
                  We build it
                </div>
                <div className="hiw-p" data-i18n="how.2.p">
                  Your booking website, owner dashboard, and confirmations, built by us, in your
                  name. No homework on your end. No back and forth.
                </div>
              </div>
              <div className="hiw-chevron" aria-hidden="true" />
            </div>

            <div className="hiw-row" data-hiw={2} role="button" tabIndex={0} aria-expanded="false">
              <div className="hiw-num" aria-hidden="true">3</div>
              <div className="hiw-text">
                <div className="hiw-h" data-i18n="how.3.h">
                  You go live
                </div>
                <div className="hiw-p" data-i18n="how.3.p">
                  In 48 hours your system is live. Clients can find you, book online, and get
                  reminders without you doing a thing. We stay on hand for any updates.
                </div>
              </div>
              <div className="hiw-chevron" aria-hidden="true" />
            </div>
          </div>

          <div className="hiw-right" aria-hidden="true">
            <div className="hiw-scene active" data-hiw={0}>
              <div className="hiw-card hiw-form">
                <div className="hiw-call-top">
                  <div className="hiw-call-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="hiw-call-label">Your details</div>
                    <div className="hiw-call-name" data-i18n="mock.shop">Studio Avi</div>
                  </div>
                </div>
                <div className="hiw-form-rows">
                  <div className="hiw-form-field">
                    <span className="hiw-form-lbl">Services</span>
                    <span className="hiw-form-val" data-i18n="mock.cutbeard">Cut and beard</span>
                  </div>
                  <div className="hiw-form-field">
                    <span className="hiw-form-lbl">Hours</span>
                    <span className="hiw-form-val">9:00 to 19:00</span>
                  </div>
                  <div className="hiw-form-field">
                    <span className="hiw-form-lbl">Photos</span>
                    <span className="hiw-form-thumbs" aria-hidden="true">
                      <span className="hiw-form-thumb" />
                      <span className="hiw-form-thumb" />
                      <span className="hiw-form-thumb" />
                    </span>
                  </div>
                </div>
                <div className="hiw-form-send">
                  <CheckIcon />
                  <span>Details sent</span>
                </div>
              </div>
            </div>

            <div className="hiw-scene" data-hiw={1}>
              <div className="hiw-site-win">
                <div className="hiw-win-bar">
                  <span className="hiw-win-dot" style={{ background: "#ED6A5E" }} />
                  <span className="hiw-win-dot" style={{ background: "#F4BF50" }} />
                  <span className="hiw-win-dot" style={{ background: "#61C554" }} />
                  <span className="hiw-win-url">studioavi.bapita.com</span>
                </div>
                <div className="hiw-win-body">
                  <div className="hiw-win-avatar">A</div>
                  <div className="hiw-win-shop" data-i18n="mock.shop">
                    Studio Avi
                  </div>
                  <div className="hiw-win-meta">
                    <span data-i18n="mock.barber">Barbershop</span> · Herzliya
                  </div>
                  <div className="hiw-win-svc">
                    <span data-i18n="mock.cut">Haircut</span>
                    <span>
                      45 <span data-i18n="mock.min">min</span>
                    </span>
                  </div>
                  <div className="hiw-win-svc">
                    <span data-i18n="mock.cutbeard">Cut and beard</span>
                    <span>
                      60 <span data-i18n="mock.min">min</span>
                    </span>
                  </div>
                  <div className="hiw-win-dates">
                    <div className="hiw-win-date"><span data-i18n="day.mon">Mon</span><div>9</div></div>
                    <div className="hiw-win-date hiw-win-date--sel"><span data-i18n="day.tue">Tue</span><div>10</div></div>
                    <div className="hiw-win-date"><span data-i18n="day.wed">Wed</span><div>11</div></div>
                    <div className="hiw-win-date"><span data-i18n="day.thu">Thu</span><div>12</div></div>
                  </div>
                  <div className="hiw-win-btn" data-i18n="mock.book">
                    Book now
                  </div>
                </div>
              </div>
            </div>

            <div className="hiw-scene" data-hiw={2}>
              <div className="hiw-card">
                <div className="hiw-notif-header">
                  <div className="hiw-notif-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div className="hiw-notif-app">Bapita</div>
                  <div className="hiw-notif-count">2</div>
                </div>
                <div className="hiw-notif-item new hiw-notif-pulse">
                  <div className="hiw-notif-title"><span className="hiw-notif-dot" /><span>New booking</span></div>
                  <div className="hiw-notif-sub">Yossi K. · Haircut · Today 14:00</div>
                  <div className="hiw-notif-time">2 min ago</div>
                </div>
                <div className="hiw-notif-item new">
                  <div className="hiw-notif-title"><span className="hiw-notif-dot" /><span>New booking</span></div>
                  <div className="hiw-notif-sub">Dana R. · Cut and beard · Today 16:30</div>
                  <div className="hiw-notif-time">14 min ago</div>
                </div>
                <div className="hiw-notif-item hiw-notif-item--sent">
                  <div className="hiw-notif-title"><span className="hiw-notif-dot hiw-notif-dot--green" /><span>Reminder sent</span></div>
                  <div className="hiw-notif-sub">Avi Cohen · Tomorrow 11:00</div>
                  <div className="hiw-notif-time">1 hr ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hiw-closer fade-up">
          <p className="hiw-closer-text" data-i18n="how.closer">
            One call. 48 hours. Done.
          </p>
          <a href="#" className="btn-primary" data-cta="hiw_cta" data-i18n="cta.talk">
            Let&apos;s talk
          </a>
        </div>
      </div>
    </section>
  );
}

function BuildSection() {
  return (
    <section className="section build" id="services">
      <div className="section-inner">
        <div className="section-head fade-up" style={{ textAlign: "start" }}>
          <p className="section-label" data-i18n="build.label">
            What we build for you
          </p>
          <h2 className="section-title" data-i18n="build.title">
            Three layers. One system.
          </h2>
          <p className="section-sub" data-i18n="build.sub">
            We build and maintain your entire online presence. You just show up and do your job.
          </p>
        </div>

        <div className="bento">
          <div className="bento-tile main fade-up" style={{ transitionDelay: "0ms" }}>
            <div className="bento-tag paid" data-i18n="build.paid">
              The product
            </div>
            <div className="bento-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
              </svg>
            </div>
            <div className="bento-h" data-i18n="build.1.h">
              Booking Website
            </div>
            <p className="bento-p" data-i18n="build.1.p">
              A clean, professional page where clients see your services, your availability, and
              book instantly, any hour of the day.
            </p>
            <div className="bento-browser" aria-hidden="true">
              <div className="bento-browser-bar">
                <div className="bento-browser-dot" style={{ background: "#ff5f57" }} />
                <div className="bento-browser-dot" style={{ background: "#febc2e" }} />
                <div className="bento-browser-dot" style={{ background: "#28c840" }} />
                <div className="bento-browser-url">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  bapita.com/studio-avi
                </div>
              </div>
              <div className="bento-browser-inner">
                <div className="bento-phone">
                  <div className="bento-phone-screen">
                    <div className="bento-pp-avatar">A</div>
                    <div className="bento-pp-name" data-i18n="mock.shop">
                      Studio Avi
                    </div>
                    <div className="bento-pp-meta">
                      <span data-i18n="mock.barber">Barbershop</span> · Herzliya
                    </div>
                    <div className="bento-pp-row">
                      <span data-i18n="mock.cut">Haircut</span>
                      <span>
                        45 <span data-i18n="mock.min">min</span>
                      </span>
                    </div>
                    <div className="bento-pp-row">
                      <span data-i18n="mock.cutbeard">Cut and beard</span>
                      <span>
                        60 <span data-i18n="mock.min">min</span>
                      </span>
                    </div>
                    <div className="bento-pp-cal">
                      <div className="bento-pp-cal-label" data-i18n="mock.pickday">
                        Pick a day
                      </div>
                      <div className="bento-pp-cal-row">
                        <span className="bento-pp-cal-day">M</span>
                        <span className="bento-pp-cal-day">T</span>
                        <span className="bento-pp-cal-day">W</span>
                        <span className="bento-pp-cal-day">T</span>
                        <span className="bento-pp-cal-day">F</span>
                      </div>
                      <div className="bento-pp-cal-row">
                        <span className="bento-pp-cal-day">2</span>
                        <span className="bento-pp-cal-day">3</span>
                        <span className="bento-pp-cal-day sel">4</span>
                        <span className="bento-pp-cal-day">5</span>
                        <span className="bento-pp-cal-day">6</span>
                      </div>
                      <div className="bento-pp-cal-row">
                        <span className="bento-pp-cal-day sel">9</span>
                        <span className="bento-pp-cal-day">10</span>
                        <span className="bento-pp-cal-day">11</span>
                        <span className="bento-pp-cal-day sel">12</span>
                        <span className="bento-pp-cal-day">13</span>
                      </div>
                    </div>
                    <div className="bento-pp-btn" data-i18n="mock.book">
                      Book now
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-tile secondary fade-up" style={{ transitionDelay: "100ms" }}>
            <div className="bento-tag free" data-i18n="build.free">
              Included free
            </div>
            <div className="bento-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 9v12" />
              </svg>
            </div>
            <div className="bento-h" data-i18n="build.2.h">
              Owner Dashboard
            </div>
            <p className="bento-p" data-i18n="build.2.p">
              Log in and see your full week at a glance: who is coming, what service, what time. No
              chasing messages.
            </p>
            <div className="bento-dash-mini" aria-hidden="true">
              <div className="bento-dash-stats" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <div className="bento-dash-stat">
                  <div className="bento-dash-stat-n">8</div>
                  <div className="bento-dash-stat-l" data-i18n="mock.dash.appts">
                    this week
                  </div>
                </div>
                <div className="bento-dash-stat" style={{ borderRight: "1px solid var(--line)" }}>
                  <div className="bento-dash-stat-n">₪2,400</div>
                  <div className="bento-dash-stat-l" data-i18n="mock.dash.rev">
                    revenue
                  </div>
                </div>
                <div className="bento-dash-stat">
                  <div className="bento-dash-stat-n">0</div>
                  <div className="bento-dash-stat-l" data-i18n="mock.dash.noshows">
                    no shows
                  </div>
                </div>
              </div>
              <div className="bento-dash-appts">
                <div className="bento-dash-row">
                  <span className="bento-dash-dot" style={{ background: "var(--amber)" }} />
                  <span className="bento-dash-name">Avi Cohen</span>
                  <span className="bento-dash-time">10:00</span>
                </div>
                <div className="bento-dash-row">
                  <span className="bento-dash-dot" style={{ background: "#22C55E" }} />
                  <span className="bento-dash-name">Noa Levi</span>
                  <span className="bento-dash-time">11:30</span>
                </div>
                <div className="bento-dash-row">
                  <span className="bento-dash-dot" style={{ background: "#94A3B8" }} />
                  <span className="bento-dash-name">Eli Dahan</span>
                  <span className="bento-dash-time">14:15</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-tile tertiary fade-up" style={{ transitionDelay: "200ms" }}>
            <div className="bento-tag grow" data-i18n="build.grow">
              Grow when ready
            </div>
            <div className="bento-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div className="bento-h" data-i18n="build.3.h">
              Add ons
            </div>
            <p className="bento-p" data-i18n="build.3.p">
              Reminders, payments, social, reviews, ads. Layer in what you need, when you need it.
              Everything runs itself.
            </p>
            <div className="bento-addon-stack" aria-hidden="true">
              <div className="bento-addon-row">
                <div className="bento-addon-ico" style={{ background: "rgba(37,211,102,.12)", color: "#16A34A" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bento-addon-label">WhatsApp</div>
                  <div className="bento-addon-sub" data-i18n="mock.addon.wa">
                    Appointment reminders
                  </div>
                </div>
                <div className="bento-addon-toggle on" />
              </div>
              <div className="bento-addon-row">
                <div className="bento-addon-ico" style={{ background: "rgba(232,146,10,.12)", color: "var(--amber-dark)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bento-addon-label">Payments</div>
                  <div className="bento-addon-sub" data-i18n="mock.addon.pay">
                    Collect deposits online
                  </div>
                </div>
                <div className="bento-addon-toggle on" />
              </div>
              <div className="bento-addon-row">
                <div className="bento-addon-ico" style={{ background: "rgba(212,98,42,.1)", color: "var(--terra)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bento-addon-label">Paid Ads</div>
                  <div className="bento-addon-sub" data-i18n="mock.addon.ads">
                    New clients from Meta campaigns
                  </div>
                </div>
                <div className="bento-addon-toggle off" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AddonsSection() {
  return (
    <section className="section addons" id="automations">
      <div className="section-inner">
        <div className="section-head fade-up">
          <p className="section-label" data-i18n="addons.label">
            Add ons
          </p>
          <h2 className="section-title" data-i18n="addons.title">
            Layer in what you need.
          </h2>
          <p className="section-sub" data-i18n="addons.sub">
            Everything below plugs straight into your system. Pick what fits, turn it on, we
            handle the rest.
          </p>
        </div>

        <div className="addon-group fade-up" style={{ transitionDelay: "100ms" }}>
          <p className="addon-group-label" data-i18n="addons.group.monthly">
            Runs every month
          </p>
          <div className="addon-list">
            <div className="addon-item" id="addonReminders">
              <button className="addon-row" aria-expanded="false">
                <span className="addon-ico" style={{ background: "rgba(37,211,102,.12)", color: "#1a9c4e" }}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.878-1.427A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.078-1.117l-.292-.173-3.026.885.852-3.094-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                  </svg>
                </span>
                <span className="addon-row-text">
                  <span className="addon-row-name" data-i18n="addons.rem.t">
                    Appointment Reminders
                  </span>
                  <span className="addon-row-tagline" data-i18n="addons.rem.tag">
                    Automated reminders via WhatsApp, SMS, or Email to reduce no shows
                  </span>
                </span>
                <span className="addon-badge monthly" data-i18n="addons.monthly">
                  Monthly
                </span>
                <span className="addon-chevron" aria-hidden="true" />
              </button>
              <div className="addon-panel">
                <div className="addon-panel-inner">
                  <div>
                    <p
                      style={{
                        fontSize: ".875rem",
                        lineHeight: 1.55,
                        color: "var(--text-muted)",
                        background: "rgba(34,197,94,.08)",
                        borderInlineStart: "3px solid rgba(34,197,94,.35)",
                        padding: ".5rem .875rem",
                        borderRadius: "0 8px 8px 0",
                        marginBottom: "1rem",
                      }}
                      data-i18n="addons.rem.note"
                    >
                      Email booking confirmations are included free in every plan. This add on
                      sends reminders on top via WhatsApp, SMS, or email.
                    </p>
                    <div className="addon-channel-tabs" role="tablist">
                      <button className="addon-channel-tab active" data-channel="wa" role="tab" aria-selected="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                          <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.878-1.427A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.078-1.117l-.292-.173-3.026.885.852-3.094-.19-.3A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                        </svg>
                        <span data-i18n="addons.ch.wa">WhatsApp</span>
                      </button>
                      <button className="addon-channel-tab" data-channel="sms" role="tab" aria-selected="false">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        <span data-i18n="addons.ch.sms">SMS</span>
                      </button>
                      <button className="addon-channel-tab" data-channel="email" role="tab" aria-selected="false">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <span data-i18n="addons.ch.email">Email</span>
                      </button>
                    </div>
                    <p
                      className="addon-channel-desc active"
                      data-channel="wa"
                      data-i18n="addons.wa.body"
                    >
                      Clients get a WhatsApp confirmation the moment they book, and a reminder
                      before they show up. <strong>No-shows drop. You do nothing.</strong> Works
                      around the clock, including at 11PM when you are asleep.
                    </p>
                    <p className="addon-channel-desc" data-channel="sms" data-i18n="addons.sms.body">
                      For clients who do not use WhatsApp, SMS keeps them covered.{" "}
                      <strong>Booking confirmed, reminder sent, slot protected.</strong> Same
                      automation, different channel. Nothing falls through the gaps.
                    </p>
                    <p
                      className="addon-channel-desc"
                      data-channel="email"
                      data-i18n="addons.email.body"
                    >
                      A reminder email sent before each appointment so clients don&apos;t forget.{" "}
                      <strong>No-shows drop. You do nothing.</strong> Booking confirmation emails
                      are already included free in your plan.
                    </p>
                  </div>
                  <div className="addon-visual">
                    <div className="addon-channel-visual active" data-channel="wa">
                      <div className="av-sms">
                        <div className="av-sms-time">Today 09:42</div>
                        <div className="av-sms-bubble out">
                          Your appointment with Avi is confirmed for Wed 14:00 ✓
                        </div>
                        <div className="av-sms-bubble in">Thanks! 👍</div>
                        <div className="av-sms-bubble out">
                          Reminder: you&apos;re booked tomorrow at 14:00. See you then!
                        </div>
                      </div>
                    </div>
                    <div className="addon-channel-visual" data-channel="sms">
                      <div className="av-sms">
                        <div className="av-sms-time">Today 09:42</div>
                        <div className="av-sms-bubble out">
                          Confirmed! Haircut with Avi, Wed 14:00. Reply CANCEL to cancel.
                        </div>
                        <div className="av-sms-bubble in">Perfect, thanks</div>
                        <div className="av-sms-bubble out">
                          Reminder: your appointment is tomorrow at 14:00 ✓
                        </div>
                      </div>
                    </div>
                    <div className="addon-channel-visual" data-channel="email">
                      <div className="av-email">
                        <div className="av-email-from">
                          <span className="av-email-dot" />
                          <span className="av-email-sender">Studio Avi</span>
                        </div>
                        <div className="av-email-subject">Your booking is confirmed ✓</div>
                        <div className="av-email-line" style={{ width: "85%" }} />
                        <div className="av-email-line" style={{ width: "65%" }} />
                        <div className="av-email-line" style={{ width: "50%" }} />
                        <div className="av-email-btn">Add to calendar</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="addon-item">
              <button className="addon-row" aria-expanded="false">
                <span className="addon-ico" style={{ background: "rgba(232,146,10,.12)", color: "#b86800" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </span>
                <span className="addon-row-text">
                  <span className="addon-row-name" data-i18n="addons.pay.t">
                    Online Payments
                  </span>
                  <span className="addon-row-tagline" data-i18n="addons.pay.tag">
                    Collect deposits or full payment at the time of booking
                  </span>
                </span>
                <span className="addon-badge monthly" data-i18n="addons.monthly">
                  Monthly
                </span>
                <span className="addon-chevron" aria-hidden="true" />
              </button>
              <div className="addon-panel">
                <div className="addon-panel-inner">
                  <p className="addon-panel-desc" data-i18n="addons.pay.body">
                    Clients pay when they book, deposit or full amount, your choice.{" "}
                    <strong>No-shows drop overnight</strong> because money on the table means
                    people show up. Payment lands in your account before they walk through the
                    door.
                  </p>
                  <div className="addon-visual">
                    <div className="av-pay">
                      <div className="av-pay-row"><span className="av-pay-label">Haircut + Beard</span><span className="av-pay-val">₪120</span></div>
                      <div className="av-pay-row"><span className="av-pay-label">Deposit required</span><span className="av-pay-val" style={{ color: "var(--amber-dark)" }}>₪40</span></div>
                      <div className="av-pay-bar"><div className="av-pay-bar-fill" /></div>
                      <div className="av-pay-btn">Pay deposit to confirm</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="addon-item">
              <button className="addon-row" aria-expanded="false">
                <span className="addon-ico" style={{ background: "rgba(251,191,36,.12)", color: "#d97706" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
                <span className="addon-row-text">
                  <span className="addon-row-name" data-i18n="addons.reviews.t">
                    Google Reviews
                  </span>
                  <span className="addon-row-tagline" data-i18n="addons.reviews.tag">
                    Automatic review requests sent to happy clients at the right moment
                  </span>
                </span>
                <span className="addon-badge monthly" data-i18n="addons.monthly">
                  Monthly
                </span>
                <span className="addon-chevron" aria-hidden="true" />
              </button>
              <div className="addon-panel">
                <div className="addon-panel-inner">
                  <p className="addon-panel-desc" data-i18n="addons.reviews.body">
                    After every visit, we ask happy clients for a Google review at exactly the
                    right moment. <strong>Your rating climbs, you do nothing.</strong> More reviews
                    means more people finding you when they search.
                  </p>
                  <div className="addon-visual">
                    <div className="av-reviews">
                      <div className="av-reviews-score">4.9</div>
                      <div className="av-reviews-stars">
                        <StarIcon className="av-reviews-star" />
                        <StarIcon className="av-reviews-star" />
                        <StarIcon className="av-reviews-star" />
                        <StarIcon className="av-reviews-star" />
                      </div>
                      <div className="av-reviews-count">127 reviews on Google</div>
                      <div className="av-reviews-bar-row"><span className="av-reviews-bar-label">5★</span><div className="av-reviews-track"><div className="av-reviews-fill" style={{ width: "88%" }} /></div></div>
                      <div className="av-reviews-bar-row"><span className="av-reviews-bar-label">4★</span><div className="av-reviews-track"><div className="av-reviews-fill" style={{ width: "9%" }} /></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="addon-item">
              <button className="addon-row" aria-expanded="false">
                <span className="addon-ico" style={{ background: "rgba(212,98,42,.1)", color: "#d4622a" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </span>
                <span className="addon-row-text">
                  <span className="addon-row-name" data-i18n="addons.ads.t">
                    Paid Ads
                  </span>
                  <span className="addon-row-tagline" data-i18n="addons.ads.tag">
                    Meta campaigns that bring new clients straight into your booking flow
                  </span>
                </span>
                <span className="addon-badge monthly" data-i18n="addons.monthly">
                  Monthly
                </span>
                <span className="addon-chevron" aria-hidden="true" />
              </button>
              <div className="addon-panel">
                <div className="addon-panel-inner">
                  <p className="addon-panel-desc" data-i18n="addons.ads.body">
                    Click to WhatsApp campaigns on Meta that bring new clients straight into your
                    booking flow. <strong>We write, launch, and manage everything</strong>:
                    budget, creative, and targeting. You just check your calendar and see it
                    filling up.
                  </p>
                  <div className="addon-visual">
                    <div className="av-ads">
                      <div className="av-ads-header">This week</div>
                      <div className="av-ads-stat-row">
                        <div className="av-ads-stat"><div className="av-ads-stat-val">847</div><div className="av-ads-stat-label">Reached</div></div>
                        <div className="av-ads-stat"><div className="av-ads-stat-val">63</div><div className="av-ads-stat-label">Clicks</div></div>
                        <div className="av-ads-stat"><div className="av-ads-stat-val" style={{ color: "var(--amber-dark)" }}>12</div><div className="av-ads-stat-label">Booked</div></div>
                      </div>
                      <div className="av-ads-bar-row">
                        <div className="av-ads-track"><div className="av-ads-fill" /></div>
                        <span className="av-ads-bar-label">19% conversion</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="addon-group fade-up" style={{ transitionDelay: "180ms" }}>
          <p className="addon-group-label" data-i18n="addons.group.onetime">
            Done once, works forever
          </p>
          <div className="addon-list">
            <div className="addon-item">
              <button className="addon-row" aria-expanded="false">
                <span className="addon-ico" style={{ background: "rgba(66,133,244,.1)", color: "#4285f4" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
                <span className="addon-row-text">
                  <span className="addon-row-name" data-i18n="addons.gmb.t">
                    Google Business Setup
                  </span>
                  <span className="addon-row-tagline" data-i18n="addons.gmb.tag">
                    Full profile setup so you appear when someone nearby searches for what you do
                  </span>
                </span>
                <span className="addon-badge one-time" data-i18n="addons.onetime">
                  One time
                </span>
                <span className="addon-chevron" aria-hidden="true" />
              </button>
              <div className="addon-panel">
                <div className="addon-panel-inner">
                  <p className="addon-panel-desc" data-i18n="addons.gmb.body">
                    We claim and fully set up your Google Business Profile so you appear in Google
                    Maps and local search when someone nearby searches for what you do.{" "}
                    <strong>Done once, works forever.</strong> Verified profile, photos, hours, and
                    description.
                  </p>
                  <div className="addon-visual">
                    <div className="av-gmb">
                      <div className="av-gmb-header">
                        <div className="av-gmb-logo">G</div>
                        <div>
                          <div className="av-gmb-name">Avi&apos;s Barbershop</div>
                          <div className="av-gmb-stars">
                            <StarIcon className="av-gmb-star" />
                            <StarIcon className="av-gmb-star" />
                            <StarIcon className="av-gmb-star" />
                            <StarIcon className="av-gmb-star" />
                          </div>
                        </div>
                      </div>
                      <div className="av-gmb-tag">127 reviews · Barbershop · Open now</div>
                      <div className="av-gmb-pill">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="7" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        Appears in &quot;barber near me&quot;
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="tstrip">
      <div className="tstrip-head fade-up">
        <p className="section-label" data-i18n="test.label">
          What owners say
        </p>
        <h2 className="section-title" data-i18n="test.title">
          Real businesses. Real results.
        </h2>
      </div>
      <figure className="tfeature fade-up">
        <div className="tfeature-body">
          <div className="tfeature-stars">★★★★★</div>
          <blockquote className="tfeature-quote" data-i18n="test.shimi.q">
            {shimi.quote}
          </blockquote>
          <figcaption className="tfeature-person">
            <img
              className="tfeature-photo"
              src="/img/shimi.png"
              alt="Shimi Azut, Shimi Azut Hair Studio"
              width={64}
              height={64}
              loading="lazy"
            />
            <span className="tfeature-id">
              <span className="tfeature-name" data-i18n="test.shimi.n">
                {shimi.name}
              </span>
              <span className="tfeature-meta" data-i18n="test.shimi.m">
                {shimi.meta}
              </span>
            </span>
          </figcaption>
          <div className="tfeature-google">
            <svg className="tfeature-glogo" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="tfeature-grade">4.8</span>
            <span className="tfeature-gstars" aria-hidden="true">★★★★★</span>
            <span className="tfeature-greviews" data-i18n="test.shimi.rev">
              474 Google reviews
            </span>
          </div>
        </div>
        <div className="tfeature-visual">
          <div className="tfeature-gpt">
            <img
              src="/img/shimi-chatgpt.png"
              alt="ChatGPT recommending Shimi Azut Hair Studio as a top hair salon in Herzliya"
              width={795}
              height={542}
              loading="lazy"
            />
          </div>
          <p className="tfeature-gpt-cap" data-i18n="test.shimi.gpt">
            When people ask ChatGPT for the best hair salon in Herzliya, Shimi comes up first.
          </p>
        </div>
      </figure>
    </section>
  );
}

function PricingSection() {
  const features = [
    { key: "pricing.f1", text: "Booking website in your name" },
    { key: "pricing.f2", text: "Hosting and updates" },
    { key: "pricing.f3", text: "3 mini edits every month" },
    { key: "pricing.f4", text: "Free owner dashboard" },
    { key: "pricing.f5", text: "Every booking to your phone and email" },
  ];
  return (
    <section className="section pricing" id="pricing">
      <div className="section-inner">
        <div className="tstrip-head fade-up">
          <p className="section-label" data-i18n="pricing.label">
            Pricing
          </p>
          <h2 className="section-title" data-i18n="pricing.title">
            One price. Everything included.
          </h2>
        </div>
        <div className="pricing-card fade-up">
          <div className="pricing-glow" aria-hidden="true" />
          <p className="pricing-plan" data-i18n="pricing.plan">
            Booking Website
          </p>
          <p className="pricing-price">
            <span className="pricing-setup" data-i18n="pricing.setup">
              ₪1,500 setup
            </span>
            <span className="pricing-month" data-i18n="pricing.month">
              then ₪200 / month
            </span>
          </p>
          <ul className="pricing-features">
            {features.map((f, i) => (
              <li key={f.key} style={{ animationDelay: `${120 + i * 80}ms` }}>
                <span className="pricing-check" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span data-i18n={f.key}>{f.text}</span>
              </li>
            ))}
          </ul>
          <a href="#" className="btn-primary lg pricing-cta" data-cta="pricing_cta" data-i18n="cta.book">
            Build my site
          </a>
        </div>
        <p className="pricing-note fade-up">
          <a href="#" data-cta="addons_inquiry" data-connect-kind="addons" data-i18n="pricing.note">
            Want add ons only, without a website? Tell us what you need.
          </a>
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="section faq" id="faq">
      <div className="section-inner">
        <div className="faq-layout fade-up">
          <div className="faq-sticky">
            <p className="section-label" data-i18n="faq.label">
              Questions
            </p>
            <h2 className="section-title" data-i18n="faq.title">
              Straight answers.
            </h2>
            <p className="section-sub" data-i18n="faq.sub">
              Everything you need to know before the call.
            </p>
          </div>
          <div className="faq-list">
            {faqs.map((f) => (
              <div className="faq-item" key={f.q}>
                <button className="faq-btn" aria-expanded="false">
                  <span data-i18n={f.qKey}>{f.q}</span>
                  <span className="faq-chevron" aria-hidden="true" />
                </button>
                <div className="faq-answer" role="region">
                  <div className="faq-answer-body" data-i18n={f.aKey}>
                    {f.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ConnectModal() {
  return (
    <div
      id="bap-modal"
      role="dialog"
      aria-modal="true"
      style={{ display: "none", position: "fixed", inset: 0, zIndex: 10000, alignItems: "center", justifyContent: "center" }}
    >
      <div
        id="bap-backdrop"
        style={{ position: "absolute", inset: 0, background: "rgba(16,12,8,.72)", backdropFilter: "blur(4px)" }}
      />
      <div
        id="bap-box"
        style={{
          position: "relative",
          zIndex: 1,
          width: "calc(100% - 32px)",
          maxWidth: 420,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--cream)",
          borderRadius: 20,
          boxShadow: "var(--shadow-float)",
          padding: "32px 28px",
        }}
      >
        <button
          id="bap-close"
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            cursor: "pointer",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            color: "var(--text-muted)",
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {/* Screen 1: Choice */}
        <div id="bap-screen-choice">
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)", letterSpacing: "-.02em", margin: "0 0 6px", paddingRight: 32 }}>
            How would you like to connect?
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px" }}>
            Pick whichever works for you.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button id="bap-calendly-btn" className="bap-opt-btn">
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(232,146,10,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div style={{ textAlign: "start" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--dark)", margin: "0 0 2px" }}>Book a call</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Pick a time, we&apos;ll talk. 30 min</p>
              </div>
            </button>
            <button id="bap-form-btn" className="bap-opt-btn">
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(232,146,10,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 7L2 7" />
                </svg>
              </div>
              <div style={{ textAlign: "start" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--dark)", margin: "0 0 2px" }}>Send your details</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>We&apos;ll reach out to you</p>
              </div>
            </button>
          </div>
        </div>

        {/* Screen 2: Form */}
        <div id="bap-screen-form" style={{ display: "none" }}>
          <button
            id="bap-back-btn"
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", padding: 0, marginBottom: 20, fontFamily: "inherit" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back</span>
          </button>
          <p style={{ fontSize: 17, fontWeight: 800, color: "var(--dark)", margin: "0 0 20px", letterSpacing: "-.02em" }}>
            Leave your details
          </p>
          <form id="bap-form" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input id="bap-f-kind" type="hidden" value="website" />
            <input id="bap-f-name" className="bap-input" type="text" required placeholder="Your name" />
            <input id="bap-f-biz" className="bap-input" type="text" placeholder="Business name (optional)" />
            <input id="bap-f-phone" className="bap-input" type="tel" placeholder="Phone" />
            <input id="bap-f-email" className="bap-input" type="email" required placeholder="Email" />
            <textarea id="bap-f-msg" className="bap-input" rows={3} placeholder="Anything we should know? (optional)" style={{ resize: "vertical", fontFamily: "inherit" }} />
            <p id="bap-form-err" style={{ display: "none", fontSize: 12, color: "#EF4444", margin: 0 }} />
            <button
              id="bap-submit"
              type="submit"
              style={{ height: 46, borderRadius: 12, border: "none", background: "var(--wash-amber)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4, boxShadow: "0 4px 14px rgba(232,146,10,.28)" }}
            >
              Send
            </button>
          </form>
          <button
            id="bap-talk-link"
            type="button"
            style={{ display: "block", width: "100%", marginTop: 14, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", fontFamily: "inherit" }}
            data-i18n="modal.talk"
          >
            Prefer to talk? Book a call
          </button>
        </div>

        {/* Screen 3: Success */}
        <div id="bap-screen-success" style={{ display: "none", textAlign: "center", padding: "16px 0" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(232,146,10,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, color: "var(--dark)", margin: "0 0 8px" }}>Sent!</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 24px" }}>
            We&apos;ll be in touch soon.
          </p>
          <button
            id="bap-done"
            style={{ height: 40, padding: "0 24px", borderRadius: 10, border: "1.5px solid var(--cream-3)", background: "white", fontSize: 13, fontWeight: 600, color: "var(--dark)", cursor: "pointer", fontFamily: "inherit" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
