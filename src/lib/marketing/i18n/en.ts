/**
 * Every word on bapita.com, in English.
 *
 * This file is the ONLY place marketing copy lives. The section components hold
 * structure — which icons, which accents, which falafel sits where, what the
 * scroll does — and take their words from here. That split is what makes a
 * translation a safe change: a translator edits `he.ts` and cannot reach the
 * scroll choreography, the pricing arithmetic, or the layout.
 *
 * Rules for editing:
 *  - `he.ts` must keep exactly this shape. It is typed as `Dict`, so a missing
 *    or misspelled key fails the build rather than shipping an English string
 *    into a Hebrew page.
 *  - Keys are stable ids, never English words. Renaming a key is a code change;
 *    changing a value is a copy change.
 *  - A sentence with a bolded fragment is split into `before` / `key` / `after`
 *    rather than carrying markup, because word order moves in translation and
 *    an embedded <strong> would not move with it.
 *  - Prices, and the shekel sign, are shared by both languages and live in the
 *    components. They are not translated.
 */
export const en = {
  meta: {
    /** What this language is called, in itself. Used on the language toggle. */
    name: "EN",
    title: "Bapita | Your business online. Built for you.",
    description:
      "Bapita builds your booking website, owner dashboard and automations, then keeps them running. For salons, short term rentals, clinics and restaurants in Israel. No tech needed.",
    ogDescription:
      "A booking website, owner dashboard, and automations, built for your business and kept running. No tech needed.",
    /** Screen-reader label on the language toggle. */
    switchTo: "עברית",
    switchLabel: "Switch to Hebrew",
  },

  nav: {
    home: "Bapita home",
    menu: "Toggle menu",
    login: "Log in",
    cta: "Book a free call",
    ctaShort: "Book a call",
    links: {
      problem: "Problem",
      how: "How it works",
      product: "What we build",
      addons: "Add ons",
      pricing: "Pricing",
    },
  },

  hero: {
    eyebrow: "For businesses people book",
    lead: "Your business online.",
    trail: "Built for you.",
    ledeBefore: "A booking website for your clients. A dashboard for you.",
    ledeKey: "We build both and keep them running.",
    ledeAfter: "You just show up.",
    cta: "Build My Website",
    secondary: "No tech skills, no commitment",
    payoff: "One system. One bill. One person to call.",
    chits: {
      site: "Booking website",
      dashboard: "Owner dashboard",
      reminders: "Auto reminders",
      google: "Found on Google",
    },
    balls: {
      salon: "Salons",
      clinic: "Clinics",
      rental: "Rentals",
      restaurant: "Restaurants",
    },
  },

  proofBar: {
    a: { stat: "24/7", label: "Clients book while you sleep" },
    b: { stat: "1 call", label: "All we need from you" },
    c: { stat: "0 tech", label: "No knowledge required" },
  },

  proof: {
    eyebrow: "Sound familiar?",
    lead: "The real cost of",
    trail: "running things manually",
    ledeBefore: "These repeat every week, and",
    ledeKey: "every one has a number on it",
    attribution: "Independent research · not our figures",
    /** Prefix on every citation. The source name follows it. */
    sourcePrefix: "Source",
    closerBold: "Built by us. Run by you.",
    closerLink: "Let's fix your problems",
    prev: "Previous cards",
    next: "Next cards",
    cards: {
      search: {
        problem: "Someone nearby is searching right now.",
        label: "of near me searchers visit within 24 hours",
        source: "Think with Google",
      },
      pick: {
        problem: "They pick whoever they can book now.",
        label: "more likely to pick a business booking online",
        source: "GetApp",
      },
      afterHours: {
        problem: "Half your bookings happen after closing.",
        label: "of bookings are made after hours",
        source: "Boulevard",
      },
      race: {
        problem: "Miss it at night, lose them by morning.",
        label: "of people who reach voicemail never call back",
        source: "OnCallClerk",
      },
      reminder: {
        problem: "No shows cost you a day every week.",
        label: "fewer no shows with automatic reminders",
        source: "Am. J. of Medicine",
      },
      review: {
        problem: "They read your reviews before your prices.",
        label: "read reviews before choosing a local business",
        source: "BrightLocal",
      },
    },
    scenes: {
      searchQuery: "book near me",
      resultA: { name: "The place two streets over", meta: "4.9 · Open now" },
      resultB: { name: "The one with 200 reviews", meta: "4.7 · 0.4 km" },
      notHere: "You are not here",
      sameStreet: "Same street, two businesses",
      booksOnline: "Books online",
      booked: "Booked",
      callDuringHours: "Call during opening hours",
      closedAt: "Closed at 19:00",
      lateAppointment: "Appointment",
      lateStay: "Two nights",
      lateTable: "Table for four",
      raceWinner: "Your booking page",
      raceWinnerDetail: "took it at 23:14",
      raceLoser: "A missed message",
      raceLoserDetail: "unanswered",
      raceWaiting: "still waiting",
      reminderBefore: "Hi Dana, you are booked for tomorrow at 16:00. Reply",
      reminderKey: "1",
      reminderAfter: "to confirm.",
      confirmed: "Confirmed. Slot held",
      askedAfter: "Asked after every visit",
      reviewers: { a: "Dana M.", b: "Yossi K.", c: "Noa L." },
    },
  },

  how: {
    band: { lead: "Work", trail: "smarter" },
    eyebrow: "The process",
    ledeBefore: "Three steps, and",
    ledeKey: "the building is ours",
    ledeAfter: "One conversation, then we take it from there.",
    steps: {
      call: {
        lead: "Start with",
        trail: "one call",
        body: "Thirty minutes. You tell us what you sell and how you take bookings now. We take it from there.",
        asideA: {
          title: "Thirty minutes",
          body: "No prep, and no account to create.",
        },
        asideB: {
          title: "No commission",
          body: "You keep every shekel a booking brings in.",
        },
      },
      build: {
        lead: "Your call to",
        trail: "a finished page",
        body: "Booking website, owner dashboard and confirmations. Built by us, in your name.",
        asideA: {
          title: "Your name, your colours",
          body: "Never a template someone else is using.",
        },
        asideB: {
          title: "Days, not months",
          body: "A date on the call, and we hold to it.",
        },
      },
      live: {
        lead: "Your page to",
        trail: "live, and running",
        body: "Clients find you, book online and get reminders. You do nothing, and we stay on hand.",
        asideA: {
          title: "Run it from your phone",
          body: "Every booking lands there, and by email.",
        },
        asideB: {
          title: "Changes are a message",
          body: "New price, new service, a closure. Done.",
        },
      },
    },
    closer: {
      title: "That's it. You're live, and we keep it running.",
      cta: "Build My Website",
    },
    callPanel: {
      routeA: { title: "A 30 min call", body: "We fill it in with you." },
      routeB: { title: "Or a form", body: "Whenever it suits you." },
      factsTitle: "All we need from you",
      factA: "Your services and prices",
      factB: "The hours you work",
      factC: "Photos, if you have them",
      footnote: "That's the whole of your homework.",
    },
    shots: {
      siteLabel: "yourshop.co.il",
      siteAlt:
        "A booking website we built: the business name, its rating, and a Book now button.",
      flowAlt:
        "The booking step of the same site: a service and date chosen, times to pick from.",
      dashboardLabel: "Your dashboard",
      dashboardAlt:
        "The owner dashboard: a month of bookings, with a calendar per member of staff.",
    },
    livePanel: {
      arriving: "New booking · 16:00 Thursday",
      landed: "In your calendar",
    },
  },

  build: {
    eyebrow: "What we build for you",
    lead: "Three layers.",
    trail: "One system.",
    lede:
      "We build and maintain your entire online presence. You just show up and do your job.",
    site: {
      tag: "The product",
      title: "Booking Website",
      body: "Clients see your services, your real openings, and book instantly, any hour of the day. Salon, rental, clinic or restaurant, it takes your shape.",
      tablist: "Kind of business",
    },
    dashboard: {
      tag: "Included free",
      title: "Owner Dashboard",
      body: "Your whole week in one place: who visited, where they came from, and how many turned into bookings. Prefer pen and paper? Every booking still reaches your phone.",
      thisWeek: "This week",
      revenue: "revenue",
      booked: "booked",
      noShows: "0 no shows this week",
      whoVisited: "Who visited",
      funnel: { visitors: "visitors", started: "started", booked: "booked" },
      sources: { a: "Instagram 46%", b: "Google 31%", c: "Direct 23%" },
    },
    addons: {
      tag: "Grow when ready",
      title: "Add ons",
      body: "Reminders, payments, reviews, SEO. Layer in what you need, when you need it. Everything runs itself, ₪200 a month each.",
      switchLabel: "Switch on when you are ready",
      switches: {
        whatsapp: {
          name: "WhatsApp reminders",
          on: "Sending before every booking",
          off: "Clients remember on their own",
        },
        payments: {
          name: "Online payments",
          on: "Deposit taken at booking",
          off: "You collect on the day",
        },
        seo: {
          name: "SEO",
          on: "Tuned every month to rank near you",
          off: "Found only by people who know you",
        },
      },
      /** `{count}` is replaced with the number switched on. */
      runningOne: "1 add on running",
      runningMany: "{count} add ons running",
      aMonth: "a month",
      none: "Just the booking website",
      noneBody:
        "Which is a complete business on its own. Add the rest when it pays for itself.",
      someBody: "Switched on by us. Nothing to install, nothing to learn.",
    },
  },

  audiences: {
    salons: {
      perNight: "/ night",
      label: "Salons & barbers",
      covers: "Barbershops, hair, nails, lashes, beauty",
      headline: "A chair that fills itself.",
      blurb:
        "Clients pick a service, see your real openings and book. No DM thread, no double booking, no calling anyone back at 22:00.",
      items: {
        a: { name: "Haircut", meta: "30 min", price: "₪80" },
        b: { name: "Beard trim", meta: "20 min", price: "₪50" },
        c: { name: "Cut + beard", meta: "45 min", price: "₪120" },
      },
      mock: {
        name: "Your Hair Salon",
        status: "Open · books 24/7",
        slotLabel: "Thursday",
        cta: "Book 16:00 · ₪80",
      },
      wins: {
        a: "Reminders that cut no shows",
        b: "Deposits on the big services",
        c: "Your own domain, your own brand",
      },
    },
    properties: {
      perNight: "/ night",
      label: "Short term rentals",
      covers: "Apartments, studios, guest suites, cabins",
      headline: "Your own booking site. Not someone else's listing.",
      blurb:
        "Nightly rates, a real availability calendar and a minimum stay, on a page you own, with guests who found you instead of a platform that charges you for them.",
      items: {
        a: { name: "Big Kasa", meta: "Sleeps 4 · 1 bed", price: "₪650" },
        b: { name: "Small Kasa", meta: "Sleeps 3 · 1 bed", price: "₪500" },
        c: { name: "Quiet Studio", meta: "Sleeps 2 · studio", price: "₪450" },
      },
      mock: {
        name: "Your Apartments",
        status: "3 units · 2 night minimum",
        slotLabel: "March · check in",
        cta: "Request 14 to 16 March · ₪1,300",
      },
      wins: {
        a: "Per unit availability that can't overlap",
        b: "Photo galleries per unit",
        c: "Requests by email, no commission",
      },
    },
    clinics: {
      perNight: "/ night",
      label: "Clinics & practices",
      covers: "Physio, dental, aesthetics, therapy, wellness",
      headline: "The front desk, after hours.",
      blurb:
        "Patients book the right appointment length for the right practitioner, and get the reminder that makes them turn up. You stop losing the evening to the phone.",
      items: {
        a: { name: "First consultation", meta: "45 min", price: "₪320" },
        b: { name: "Follow up", meta: "30 min", price: "₪240" },
        c: { name: "Treatment session", meta: "60 min", price: "₪400" },
      },
      mock: {
        name: "Your Clinic",
        status: "3 practitioners · books 24/7",
        slotLabel: "Tuesday",
        cta: "Book 13:00 · ₪240",
      },
      wins: {
        a: "A calendar per practitioner",
        b: "Different lengths per treatment",
        c: "Client history in one place",
      },
    },
    restaurants: {
      perNight: "/ night",
      label: "Restaurants",
      covers: "Dining rooms, bars, chef's tables, private events",
      headline: "Tables booked before you open.",
      blurb:
        "Sittings, party sizes and your real capacity, on your own page, with the guest's details in your hands rather than a reservations platform's.",
      items: {
        a: { name: "Dinner · 2 guests", meta: "90 min", price: "Free" },
        b: { name: "Dinner · 4 guests", meta: "2 hrs", price: "Free" },
        c: { name: "Chef's table", meta: "2.5 hrs", price: "₪280 pp" },
      },
      mock: {
        name: "Your Restaurant",
        status: "Two sittings · books 24/7",
        slotLabel: "Friday",
        cta: "Reserve 19:45 · 4 guests",
      },
      wins: {
        a: "Capacity you set, per sitting",
        b: "Guest details you keep",
        c: "Confirmation the moment they book",
      },
    },
  },

  addons: {
    eyebrow: "Add ons",
    lead: "Layer in",
    trail: "what you need.",
    lede:
      "Everything below clicks straight into your Bapita. Pick what fits, we switch it on and run it for you.",
    groupMonthly: "Runs every month",
    groupOnce: "Done once, works forever",
    cadenceMonthly: "Monthly",
    cadenceOnce: "One time",
    note: "Add on pricing depends on how much you send and how often.",
    noteLink: "You get real numbers on the call",
    band: { lead: "Go", trail: "further." },
    items: {
      reminders: {
        name: "Appointment Reminders",
        summary:
          "Automated reminders via WhatsApp, SMS, or Email to reduce no shows",
        body: "Clients get a confirmation the moment they book, and a reminder before they show up. No shows drop. You do nothing. Works around the clock, including at 11PM when you are asleep. On WhatsApp, by SMS for clients who don't use it, or by email. Booking confirmation emails are already included free in your plan; this add on sends reminders on top.",
      },
      payments: {
        name: "Online Payments",
        summary: "Collect deposits or full payment at the time of booking",
        body: "Clients pay when they book, deposit or full amount, your choice. No shows drop overnight because money on the table means people show up. Payment lands in your account before they walk through the door.",
      },
      reviews: {
        name: "Google Reviews",
        summary:
          "Automatic review requests sent to happy clients at the right moment",
        body: "After every visit, we ask happy clients for a Google review at exactly the right moment. Your rating climbs, you do nothing. More reviews means more people finding you when they search.",
      },
      seo: {
        name: "SEO Optimization",
        summary:
          "We tune your page every month so people nearby find you before they find anyone else",
        body: "",
      },
      gbp: {
        name: "Google Business Setup",
        summary:
          "Full profile setup so you appear when someone nearby searches for what you do",
        body: "",
      },
      calsync: {
        name: "Google Calendar Sync",
        summary:
          "Busy times block automatically, new bookings show up on your Google Calendar",
        body: "We connect your Google Calendar for you, a one time concierge setup, not another monthly bill. No more double bookings. Block time on Google and it blocks on Bapita, and vice versa.",
      },
    },
  },

  pricing: {
    eyebrow: "Pricing",
    lead: "Fill your pita.",
    trail: "Never pay a percentage.",
    ledeBefore: "The booking website is the pita.",
    ledeKey: "Every add on is ₪200",
    ledeAfter: "and no one takes a cut of a booking, ever.",
    chipsLabel: "Add ons · tap to drop one in",
    base: "Booking website",
    lineBase: "Booking website + dashboard",
    buildTotal: "To build, once",
    buildDetail: "Built, launched, in your name",
    monthlyTotal: "Every month",
    monthlyDetail: "Hosting, updates, 3 edits",
    /** `{count}` is the number of add-ons picked. */
    buildDetailWithAddons: "{base} + {count} setup",
    buildDetailWithAddonsPlural: "{base} + {count} setups",
    monthlyDetailWithAddons: "{base} + {count} add on",
    monthlyDetailWithAddonsPlural: "{base} + {count} add ons",
    perMonth: "/mo",
    once: "once",
    empty: "Tap an add on above to drop one in.",
    cta: "Build My Website",
    noteBefore: "Free call, no commitment. Bigger build?",
    noteLink: "We quote it",
    labels: {
      reminders: "Reminders",
      payments: "Payments",
      reviews: "Reviews",
      seo: "SEO",
      gbp: "Google profile",
      calsync: "Calendar sync",
    },
  },

  testimonials: {
    eyebrow: "What owners say",
    stars: "5 out of 5 stars",
    rating: "4.8",
    reviews: "474 Google reviews",
    chatgptCaption: "#1 result on ChatGPT for “best hair salon in Herzliya”",
    lead: "Real businesses.",
    trail: "Real results.",
    quote:
      "Bapita set everything up for me and it worked from day one. Now my clients book themselves and my chair stays full.",
    name: "Shimi Azut",
    meta: "Shimi Azut Hair Studio, Herzliya",
    chatgptAlt:
      "ChatGPT recommending Shimi Azut Hair Studio as a top hair salon in Herzliya",
  },

  faq: {
    lead: "Questions.",
    trail: "Straight answers.",
    items: {
      cost: {
        q: "How much does it cost?",
        a: "It depends on your business: your services, your size, what you actually need. We do not do one size pricing. Tell us about your setup and we will give you a straight number on the call. No pressure, no pitch.",
      },
      speed: {
        q: "How long until I am live?",
        a: "Fast, right after our call. If you have custom requests it can take a little longer, and we will tell you that upfront.",
      },
      whatsapp: {
        q: "I already run bookings on WhatsApp. Why change?",
        a: "You keep WhatsApp. We add a booking page so clients pick their own slot instead of messaging you for one. The back and forth stops. The bookings do not.",
      },
      willBook: {
        q: "Will my clients actually book online?",
        a: "They already book haircuts, tables, and doctors online. Yours will be the easy option: open at any hour, no waiting for you to reply at night.",
      },
      stays: {
        q: "I rent out a property, not appointments. Does this work?",
        a: "Yes. A property site works on nights instead of times: a nightly rate per unit, a real availability calendar, a minimum stay, and photo galleries per unit. Guests send a booking request and you confirm it. Kasa Herzeliya runs on it today with three units.",
      },
      effort: {
        q: "What do I actually need to do?",
        a: "One 30 minute call. Tell us your services, prices, and schedule. We build and run everything from there. No homework, no back and forth.",
      },
      tech: {
        q: "Do I need to know anything about tech?",
        a: "Zero. That is the whole point. We build it, we maintain it. New service, new price, something to change? You message us and it is done.",
      },
    },
  },

  connect: {
    eyebrow: "Let's talk",
    lead: "Ready to go live?",
    trail: "It starts with one call.",
    blurb:
      "Thirty minutes. Tell us what you sell, how you take bookings now and what you want to fix, and you leave with a straight number. No pressure, no commitment.",
    calendly: {
      title: "Book a time",
      body: "Pick a slot that works. 30 minutes, no prep needed.",
      cta: "Open my calendar",
    },
    form: {
      title: "Leave your details",
      body: "I'll reach out to you instead.",
      name: "Your name",
      nameLabel: "Your name",
      business: "Business (optional)",
      businessLabel: "Business name (optional)",
      phone: "Phone",
      phoneLabel: "Phone number",
      email: "Email",
      emailLabel: "Email address",
      submit: "Send my details",
      sending: "Sending…",
      sent: "Got it. I'll reach out within one business day.",
      /** `{email}` is replaced with the address. */
      error: "Something went wrong. Try again, or email {email}.",
    },
    emailPrefix: "Prefer email?",
  },

  footer: {
    blurb:
      "Done for you booking websites for appointment and stay businesses in Israel. Built, launched and kept running under your brand.",
    linksTitle: "Links",
    builtForTitle: "Built for",
    getStartedTitle: "Get started",
    faq: "FAQ",
    rights: "All rights reserved.",
    builtFor: {
      a: "Barbers",
      b: "Hair & nail salons",
      c: "Lash & brow studios",
      d: "Spa & massage",
      e: "Short term rentals",
      f: "Guest suites & cabins",
      g: "Physio & dental",
      h: "Aesthetics & therapy",
      i: "Pilates, yoga & trainers",
      j: "Restaurants & bars",
    },
    legal: {
      accessibility: "Accessibility",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
  },
};
