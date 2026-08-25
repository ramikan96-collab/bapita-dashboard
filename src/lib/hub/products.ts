export type ProductId = "book" | "social" | "bots" | "reach";

export type ProductStatus = "live" | "beta" | "soon";

export interface Product {
  id: ProductId;
  name: string;
  tagline: string;
  description: string;
  status: ProductStatus;
  statusLabel: string;
  href: string;
  pricingNote: string;
  pricingCta: string;
  features: string[];
  /**
   * Two products carry the offer; two extend one of them. Bots is what Book
   * looks like inside a chat, Reach is what Social looks like outside the feed —
   * so they read as add-ons, not as two more equal choices to weigh up.
   */
  tier: "main" | "add-on";
  /** Set on add-ons: the product this one extends. */
  parent?: ProductId;
}

export interface BusinessType {
  id: string;
  label: string;
  example: string;
  products: ProductId[];
}

// The menu — 4 falafels, in the order they're meant to be read: each main
// product is followed by the add-on that extends it. Book → Bots (the same
// calendar, answered in a chat), Social → Reach (the same presence, outside
// the feed).
export const PRODUCTS: Product[] = [
  {
    id: "book",
    name: "Book",
    tagline: "Your own booking site. Clients book 24/7.",
    description:
      "Your own branded booking site, owner dashboard, and automations. Clients book around the clock; you see everything in one place — no more back-and-forth on WhatsApp.",
    status: "live",
    statusLabel: "Live",
    href: "https://book.bapita.com",
    pricingNote: "Live now",
    pricingCta: "See Book",
    tier: "main",
    features: [
      "Booking website with your brand",
      "Owner dashboard & calendar",
      "Email & WhatsApp reminders",
      "Online payments",
    ],
  },
  {
    id: "bots",
    name: "Bots",
    tagline: "Answer and book on WhatsApp, 24/7.",
    description:
      "An AI assistant on WhatsApp and Telegram that answers FAQs, qualifies leads, and books appointments straight into Book. Stop losing clients to whoever replies first.",
    status: "soon",
    statusLabel: "Rolling out",
    href: "#connect",
    pricingNote: "Rolling out",
    pricingCta: "Book a free call",
    tier: "add-on",
    parent: "book",
    features: [
      "WhatsApp & Telegram assistant",
      "Answers your FAQs 24/7",
      "Qualifies leads automatically",
      "Books straight into Book",
    ],
  },
  {
    id: "social",
    name: "Social",
    tagline: "Show up and grow — without the daily grind.",
    description:
      "Social media, handled. Write and schedule a month of posts in one sitting, publish to every channel from one place, and keep DMs, comments and reviews in a single inbox — with the sentiment already read for you.",
    status: "soon",
    statusLabel: "Coming next",
    href: "#connect",
    pricingNote: "Coming next",
    pricingCta: "Book a free call",
    tier: "main",
    features: [
      "Create and schedule a month of posts at once",
      "One platform, every channel — Instagram, Facebook, TikTok",
      "Unified inbox for DMs and comments",
      "Sentiment analysis on reviews and comments",
      "AI caption generator",
    ],
  },
  {
    id: "reach",
    name: "Reach",
    tagline: "Get found and promoted locally.",
    description:
      "Show up where nearby clients are looking — Google and Maps — boost your best post, and run a simple local promo. Local growth, done for you.",
    status: "soon",
    statusLabel: "Rolling out",
    href: "#connect",
    pricingNote: "Rolling out",
    pricingCta: "Book a free call",
    tier: "add-on",
    parent: "social",
    features: [
      "Google Business Profile setup",
      "Show up on Google Maps",
      "Boost your best posts",
      "Simple local promotions",
    ],
  },
];

// Local, appointment-based service businesses only (Israel-first ICP).
export const BUSINESS_TYPES: BusinessType[] = [
  { id: "barber", label: "Barber / Salon", example: "Barbershop, hair salon, nail tech", products: ["book", "social", "reach"] },
  { id: "clinic", label: "Clinic / Practice", example: "Physio, dentist, wellness", products: ["book", "bots", "social"] },
  { id: "studio", label: "Studio", example: "Tattoo, massage, beauty", products: ["book", "social", "reach"] },
  { id: "coach", label: "Coach / Freelancer", example: "Personal trainer, consultant", products: ["book", "social", "bots"] },
  { id: "local", label: "Any local business", example: "Pick what you need", products: ["book", "social", "bots", "reach"] },
];

export const SERVED_CATEGORIES = [
  "Barbershops",
  "Hair salons",
  "Nail techs",
  "Beauty clinics",
  "Physios",
  "Dog groomers",
  "Massage studios",
  "Tattoo studios",
  "Coaches",
  "Personal trainers",
];
