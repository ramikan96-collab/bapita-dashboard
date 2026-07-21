// @ts-nocheck
// Vanilla DOM interactivity ported verbatim from a raw
// <script dangerouslySetInnerHTML> string (see git history of
// src/app/(marketing)/page.tsx). It was never type-checked as TypeScript
// before (it lived as an opaque HTML string) and is intentionally left
// untyped here to keep this relocation a pure timing fix, not a rewrite.
// See the matching eslint.config.mjs override for this file.
"use client";

import { useEffect } from "react";

export default function InteractivityScript() {
  useEffect(() => {
    // ─── i18n dictionary (EN/HE) ──────────────────────────────
    // Restored from public/home.html's data-i18n system. Keys mirror the
    // original I18N dictionary; English values match this page's shipped
    // copy (which diverged slightly from home.html during the port), Hebrew
    // values are the original translations, reused/adapted where the English
    // wording changed. Elements tagged data-i18n whose key has no entry for
    // the active language are left untouched (matches the original's
    // fallback behavior), which is why a few decorative mockup strings and
    // channel-tab labels intentionally have no 'en' counterpart below.
    var I18N = {
      en: {
        'nav.problem': "Problem", 'nav.solution': "Solution", 'nav.addons': "Add-ons", 'nav.faq': "FAQ", 'nav.login': "Login",
        'cta.talk': "Let's talk", 'cta.book': "Book a free call",
        'hero.eyebrow': "For appointment based businesses", 'hero.h1a': "Your business, online.", 'hero.h1b': "Done for you.",
        'hero.sub': "A booking website, owner dashboard, and automations. Built for your business in 48 hours.",
        'hero.trust': "One 30-minute call. No commitment.",
        'mock.shop': "Studio Avi", 'mock.barber': "Barbershop", 'mock.service': "Service", 'mock.cut': "Haircut", 'mock.cutbeard': "Cut and beard",
        'mock.min': "min", 'mock.pickday': "Pick a day", 'mock.book': "Book now", 'mock.booked': "Booked!", 'mock.confirm': "A confirmation is on its way.",
        'mock.chip': "Click to book", 'mock.chiptime': "Tomorrow · 11:00",
        'mock.dash.appts': "this week", 'mock.dash.rev': "revenue", 'mock.dash.noshows': "no shows",
        'mock.addon.wa': "Appointment reminders", 'mock.addon.pay': "Collect deposits online", 'mock.addon.ads': "New clients from Meta campaigns",
        'day.mon': "Mon", 'day.tue': "Tue", 'day.wed': "Wed", 'day.thu': "Thu",
        'proof.1': "Live from your first call", 'proof.2': "Clients book while you sleep",
        'proof.3num': "1 call", 'proof.3': "All we need from you", 'proof.4num': "0 tech", 'proof.4': "No knowledge required",
        'pain.label': "Sound familiar?", 'pain.title': "The real cost of running things manually",
        'pain.sub': "These aren't one-off annoyances. They repeat every week, quietly costing you clients, hours, and revenue.",
        'pain.0.h': "You are invisible online", 'pain.0.s': "No profile, no search presence. Someone looked for what you do and found three competitors.",
        'pain.1.h': "Missed leads every night", 'pain.1.s': "They messaged at 11PM. By morning they had booked someone else. The first reply wins.",
        'pain.2.h': "No shows eating into your week", 'pain.2.s': "No reminder went out. That slot is gone, and someone else wanted it.",
        'pain.3.h': "No visibility into your own schedule", 'pain.3.s': "You reconstruct your week from WhatsApp screenshots every Sunday morning.",
        'pain.s0.query': "barber near me", 'pain.s0.empty': "You're not here",
        'pain.s2.day': "Tuesday", 'pain.s2.confirmed': "confirmed", 'pain.s3.header': "WhatsApp",
        'how.label': "The process", 'how.title': "Three steps. Then you are live.",
        'how.sub': "No tech skills needed, no long onboarding. Just one conversation, and we take care of the rest.",
        'how.1.h': "We talk", 'how.1.p': "One call, 30 minutes. You tell us about your business: your services, how you handle bookings now, what you want to fix. We take it from there.",
        'how.2.h': "We build it", 'how.2.p': "Your booking website, owner dashboard, and confirmations, built by us, in your name. No homework on your end. No back and forth.",
        'how.3.h': "You go live", 'how.3.p': "In 48 hours your system is live. Clients can find you, book online, and get reminders without you doing a thing. We stay on hand for any updates.",
        'how.closer': "One call. 48 hours. Done.",
        'build.label': "What we build for you", 'build.title': "Three layers. One system.",
        'build.sub': "We build and maintain your entire online presence. You just show up and do your job.",
        'build.paid': "The product", 'build.free': "Included free", 'build.grow': "Grow when ready",
        'build.1.h': "Booking Website", 'build.1.p': "A clean, professional page where clients see your services, your availability, and book instantly, any hour of the day.",
        'build.2.h': "Owner Dashboard", 'build.2.p': "Log in and see your full week at a glance: who is coming, what service, what time. No chasing messages.",
        'build.3.h': "Add-ons", 'build.3.p': "Reminders, payments, social, reviews, ads. Layer in what you need, when you need it. Everything runs itself.",
        'addons.label': "Add-ons", 'addons.title': "Layer in what you need.",
        'addons.sub': "Everything below plugs straight into your system. Pick what fits, turn it on, we handle the rest.",
        'addons.group.monthly': "Runs every month", 'addons.group.onetime': "Done once, works forever",
        'addons.monthly': "Monthly", 'addons.onetime': "One time",
        'addons.rem.t': "Appointment Reminders", 'addons.rem.tag': "Automated reminders via WhatsApp, SMS, or Email to reduce no-shows",
        'addons.rem.note': "Email booking confirmations are included free in every plan. This add-on sends reminders on top via WhatsApp, SMS, or email.",
        'addons.wa.body': "Clients get a WhatsApp confirmation the moment they book, and a reminder before they show up. <strong>No-shows drop. You do nothing.</strong> Works around the clock, including at 11PM when you are asleep.",
        'addons.sms.body': "For clients who do not use WhatsApp, SMS keeps them covered. <strong>Booking confirmed, reminder sent, slot protected.</strong> Same automation, different channel. Nothing falls through the gaps.",
        'addons.pay.t': "Online Payments", 'addons.pay.tag': "Collect deposits or full payment at the time of booking",
        'addons.pay.body': "Clients pay when they book, deposit or full amount, your choice. <strong>No-shows drop overnight</strong> because money on the table means people show up. Payment lands in your account before they walk through the door.",
        'addons.reviews.t': "Google Reviews", 'addons.reviews.tag': "Automatic review requests sent to happy clients at the right moment",
        'addons.reviews.body': "After every visit, we ask happy clients for a Google review at exactly the right moment. <strong>Your rating climbs, you do nothing.</strong> More reviews means more people finding you when they search.",
        'addons.ads.t': "Paid Ads", 'addons.ads.tag': "Meta campaigns that bring new clients straight into your booking flow",
        'addons.ads.body': "Click-to-WhatsApp campaigns on Meta that bring new clients straight into your booking flow. <strong>We write, launch, and manage everything</strong>: budget, creative, and targeting. You just check your calendar and see it filling up.",
        'addons.gmb.t': "Google Business Setup", 'addons.gmb.tag': "Full profile setup so you appear when someone nearby searches for what you do",
        'addons.gmb.body': "We claim and fully set up your Google Business Profile so you appear in Google Maps and local search when someone nearby searches for what you do. <strong>Done once, works forever.</strong> Verified profile, photos, hours, and description.",
        'test.label': "What owners say", 'test.title': "Real businesses. Real results.",
        'test.shimi.q': "I never had time for any of this, I'm cutting hair all day. Bapita set everything up for me and it worked from day one. Now my clients book themselves and my chair stays full.",
        'test.shimi.n': "Shimi Azut", 'test.shimi.m': "Shimi Azut Hair Studio, Herzliya",
        'test.shimi.rev': "474 Google reviews", 'test.shimi.gpt': "When people ask ChatGPT for the best hair salon in Herzliya, Shimi comes up first.",
        'faq.label': "Questions", 'faq.title': "Straight answers.", 'faq.sub': "Everything you need to know before the call.",
        'faq.1.q': "How much does it cost?", 'faq.1.a': "It depends on your business: your services, your size, what you actually need. We do not do one size pricing. Tell us about your setup and we will give you a straight number on the call. No pressure, no pitch.",
        'faq.2.q': "How long until I am live?", 'faq.2.a': "48 hours from our call. We work fast. If you have custom requests it can take a little longer, and we will tell you that upfront.",
        'faq.3.q': "I already run bookings on WhatsApp. Why change?", 'faq.3.a': "You keep WhatsApp. We add a booking page so clients pick their own slot instead of messaging you for one. The back and forth stops. The bookings do not.",
        'faq.4.q': "Will my clients actually book online?", 'faq.4.a': "They already book haircuts, tables, and doctors online. Yours will be the easy option: open at any hour, no waiting for you to reply at night.",
        'faq.5.q': "What do I actually need to do?", 'faq.5.a': "One 30 minute call. Tell us your services, prices, and schedule. We build and run everything from there. No homework, no back and forth.",
        'faq.6.q': "Do I need to know anything about tech?", 'faq.6.a': "Zero. That is the whole point. We build it, we maintain it. New service, new price, something to change? You message us and it is done.",
        'chip.1': "✓ No commitment", 'chip.2': "✓ 48h turnaround",
        'final.title': "Ready to get started?", 'final.trust': "No forms. No decks. Just a conversation.",
        'final.p': "One call, 30 minutes. We will learn your business, tell you exactly what we would build, and answer every question you have. No pitch. No commitment.",
        'footer.tagline': "Built for you. Runs without you.", 'footer.col.links': "Links", 'footer.col.for': "Built for", 'footer.col.contact': "Get started",
        'footer.for.barber': "Barber", 'footer.for.salon': "Hair Salon", 'footer.for.nail': "Nail Salon", 'footer.for.spa': "Spa & MedSpa", 'footer.for.massage': "Massage",
        'footer.for.lash': "Lash Studio", 'footer.for.pilates': "Pilates & Yoga", 'footer.for.trainer': "Personal Trainer", 'footer.for.physio': "Physiotherapy", 'footer.for.tattoo': "Tattoo Studio",
        'footer.copy': "© ${year} Bapita. All rights reserved."
      },
      he: {
        'nav.problem': "הבעיה", 'nav.solution': "הפתרון", 'nav.addons': "תוספות", 'nav.faq': "שאלות", 'nav.login': "כניסה",
        'cta.talk': "בוא נדבר", 'cta.book': "לשיחת ייעוץ חינם",
        'hero.eyebrow': "לעסקים שעובדים עם תורים", 'hero.h1a': "כל העסק שלך אונליין.", 'hero.h1b': "אנחנו דואגים להכל.",
        'hero.sub': "אתר הזמנות, לוח בקרה לבעל העסק, ואוטומציות. נבנה לעסק שלך תוך 48 שעות.",
        'hero.trust': "שיחה אחת של 30 דקות. בלי התחייבות.",
        'mock.shop': "הסטודיו של אבי", 'mock.barber': "מספרה", 'mock.service': "שירות", 'mock.cut': "תספורת", 'mock.cutbeard': "תספורת וזקן",
        'mock.min': "דק", 'mock.pickday': "בחר יום", 'mock.book': "לקביעת תור", 'mock.booked': "נקבע!", 'mock.confirm': "האישור בדרך אליך.",
        'mock.chip': "נקבע אצל אבי", 'mock.chiptime': "מחר · 11:00",
        'mock.dash.appts': "תורים היום", 'mock.dash.rev': "הכנסה צפויה", 'mock.dash.noshows': "אי הגעות",
        'mock.addon.wa': "תזכורות לפגישות", 'mock.addon.pay': "גביית מקדמות אונליין", 'mock.addon.ads': "לקוחות חדשים מקמפיינים",
        'day.mon': "ב׳", 'day.tue': "ג׳", 'day.wed': "ד׳", 'day.thu': "ה׳",
        'proof.1': "באוויר מהשיחה הראשונה", 'proof.2': "לקוחות קובעים בזמן שאתה ישן",
        'proof.3num': "שיחה 1", 'proof.3': "כל מה שצריך ממך", 'proof.4num': "0 טכני", 'proof.4': "לא צריך לדעת כלום",
        'pain.label': "נשמע מוכר?", 'pain.title': "המחיר האמיתי של לנהל הכל ידנית",
        'pain.sub': "אלה לא תקלות חד-פעמיות. הן חוזרות כל שבוע, ושוחקות בשקט לקוחות, שעות, והכנסות.",
        'pain.0.h': "אתה לא קיים אונליין", 'pain.0.s': "אין פרופיל, אין נוכחות בחיפוש. מישהו חיפש את מה שאתה עושה ומצא שלושה מתחרים.",
        'pain.1.h': "מפספס לקוחות כל לילה", 'pain.1.s': "הם כתבו ב 11 בלילה. עד הבוקר הם כבר קבעו אצל מישהו אחר. הראשון שעונה מנצח.",
        'pain.2.h': "ביטולים שאוכלים לך את השבוע", 'pain.2.s': "לא יצאה תזכורת. התור הזה אבד, ומישהו אחר רצה אותו.",
        'pain.3.h': "אין לך מושג מה קורה ביומן", 'pain.3.s': "אתה משחזר את השבוע מצילומי מסך של וואטסאפ כל יום ראשון בבוקר.",
        'pain.s0.query': "ברבר קרוב אלי", 'pain.s0.empty': "אתה לא כאן",
        'pain.s2.day': "שלישי", 'pain.s2.confirmed': "מאושר", 'pain.s3.header': "וואטסאפ",
        'how.label': "התהליך", 'how.title': "שלושה שלבים. ואתה באוויר.",
        'how.sub': "לא צריך לדעת טכנולוגיה, לא צריך תהליך קליטה ארוך. שיחה אחת, ואנחנו מטפלים בשאר.",
        'how.1.h': "מדברים", 'how.1.p': "שיחה אחת, 30 דקות. אתה מספר לנו על העסק: השירותים שלך, איך אתה מנהל תורים היום, מה אתה רוצה לסדר. משם אנחנו לוקחים.",
        'how.2.h': "בונים", 'how.2.p': "אתר ההזמנות, לוח הבקרה, והאישורים שלך, נבנים על ידינו, בשמך. בלי שיעורי בית מצדך. בלי הלוך ושוב.",
        'how.3.h': "עולה לאוויר", 'how.3.p': "תוך 48 שעות המערכת שלך באוויר. לקוחות מוצאים אותך, קובעים אונליין, ומקבלים תזכורות בלי שתעשה כלום. אנחנו זמינים לכל עדכון.",
        'how.closer': "שיחה אחת. 48 שעות. גמרנו.",
        'build.label': "מה אנחנו בונים לך", 'build.title': "שלוש שכבות. מערכת אחת.",
        'build.sub': "אנחנו בונים ומנהלים את הנוכחות המקוונת שלך. אתה רק מגיע ועושה את העבודה.",
        'build.paid': "המוצר", 'build.free': "כלול חינם", 'build.grow': "גדל כשמוכן",
        'build.1.h': "אתר הזמנות", 'build.1.p': "עמוד נקי ומקצועי שבו לקוחות רואים את השירותים שלך, את הזמינות שלך, וקובעים מיד, בכל שעה ביום.",
        'build.2.h': "לוח בקרה לבעל העסק", 'build.2.p': "נכנס ורואה את כל השבוע במבט אחד: מי מגיע, איזה שירות, באיזו שעה. בלי לרדוף אחרי הודעות.",
        'build.3.h': "תוספות", 'build.3.p': "תזכורות, תשלומים, סושיאל, ביקורות, פרסום. מוסיף מה שצריך, מתי שצריך. הכל עובד לבד.",
        'addons.label': "תוספות", 'addons.title': "הוסף מה שצריך.",
        'addons.sub': "כל אחד מהשירותים למטה מתחבר ישירות למערכת שלך. בחר מה מתאים, אנחנו מטפלים בשאר.",
        'addons.group.monthly': "רץ כל חודש", 'addons.group.onetime': "נעשה פעם אחת, עובד לתמיד",
        'addons.monthly': "חודשי", 'addons.onetime': "חד פעמי",
        'addons.rem.t': "תזכורות לפגישות", 'addons.rem.tag': "תזכורות אוטומטיות דרך וואטסאפ, SMS, או אימייל להפחתת ביטולים",
        'addons.rem.note': "אישורי הזמנה במייל כלולים בחינם בכל תוכנית. תוספת זו שולחת תזכורות בנוסף דרך וואטסאפ, SMS, או אימייל.",
        'addons.ch.wa': "וואטסאפ", 'addons.ch.sms': "SMS", 'addons.ch.email': "אימייל",
        'addons.wa.body': "לקוחות מקבלים אישור וואטסאפ ברגע שהם קובעים, ותזכורת לפני שהם מגיעים. <strong>ביטולים יורדים. אתה לא עושה כלום.</strong> עובד סביב השעון, גם ב-11 בלילה כשאתה ישן.",
        'addons.sms.body': "ללקוחות שלא משתמשים בוואטסאפ, SMS שומר עליהם מכוסים. <strong>הזמנה מאושרת, תזכורת נשלחה, תור מוגן.</strong> אותה אוטומציה, ערוץ אחר. שום דבר לא נופל בין הכסאות.",
        'addons.email.body': "תזכורת במייל לפני כל תור כדי שלקוחות לא ישכחו. <strong>ביטולים יורדים. אתה לא עושה כלום.</strong> אישורי הזמנה במייל כבר כלולים חינם בתוכנית שלך.",
        'addons.pay.t': "תשלומים אונליין", 'addons.pay.tag': "גביית מקדמה או תשלום מלא בזמן הקביעה",
        'addons.pay.body': "לקוחות משלמים כשהם קובעים, מקדמה או תשלום מלא, אתה בוחר. <strong>ביטולים יורדים בן לילה</strong> כי כסף על השולחן אומר שאנשים מגיעים. התשלום נכנס לחשבון שלך עוד לפני שהם נכנסים.",
        'addons.reviews.t': "ביקורות גוגל", 'addons.reviews.tag': "בקשות ביקורת אוטומטיות שנשלחות ללקוחות מרוצים ברגע הנכון",
        'addons.reviews.body': "אחרי כל ביקור, אנחנו מבקשים מלקוחות מרוצים ביקורת בגוגל בדיוק ברגע הנכון. <strong>הדירוג שלך עולה, אתה לא עושה כלום.</strong> יותר ביקורות זה יותר אנשים שמוצאים אותך בחיפוש.",
        'addons.ads.t': "פרסום ממומן", 'addons.ads.tag': "קמפיינים במטא שמביאים לקוחות חדשים ישר לתוך מערך ההזמנות שלך",
        'addons.ads.body': "קמפיינים של לחיצה לוואטסאפ במטא שמביאים לקוחות חדשים ישר לתוך מערך ההזמנות שלך. <strong>אנחנו כותבים, מעלים ומנהלים הכל</strong>: תקציב, קריאייטיב וטירגוט. אתה רק בודק את היומן ורואה אותו מתמלא.",
        'addons.gmb.t': "הקמת גוגל לעסק", 'addons.gmb.tag': "הקמת פרופיל מלא כך שתופיע כשמישהו קרוב מחפש את מה שאתה עושה",
        'addons.gmb.body': "אנחנו מאמתים ומגדירים את הפרופיל העסקי שלך בגוגל כדי שתופיע בגוגל מפות ובתוצאות המקומיות. <strong>נעשה פעם אחת, עובד לתמיד.</strong> פרופיל מאומת, תמונות, שעות ותיאור עסק.",
        'test.label': "מה בעלי עסקים אומרים", 'test.title': "עסקים אמיתיים. תוצאות אמיתיות.",
        'test.shimi.q': "אין לי זמן לכל זה, אני חותך שיער כל היום. בפיתה הקימו לי הכל וזה עבד מהיום הראשון. עכשיו הלקוחות קובעים לבד והכיסא תמיד מלא.",
        'test.shimi.n': "שימי אזוט", 'test.shimi.m': "מספרת שימי אזוט, הרצליה",
        'test.shimi.rev': "474 ביקורות בגוגל", 'test.shimi.gpt': "כששואלים את ChatGPT מה המספרה הטובה בהרצליה, שימי הראשון שעולה.",
        'faq.label': "שאלות", 'faq.title': "תשובות ישירות.", 'faq.sub': "כל מה שצריך לדעת לפני השיחה.",
        'faq.1.q': "כמה זה עולה?", 'faq.1.a': "תלוי בעסק שלך: השירותים, הגודל, מה שאתה באמת צריך. אנחנו לא עובדים במחיר אחיד. ספר לנו על המערך שלך וניתן לך מספר ישיר בשיחה. בלי לחץ, בלי מכירה.",
        'faq.2.q': "תוך כמה זמן אני באוויר?", 'faq.2.a': "48 שעות מהשיחה. אנחנו עובדים מהר. אם יש בקשות מיוחדות זה יכול לקחת קצת יותר, ונגיד לך את זה מראש.",
        'faq.3.q': "אני כבר מנהל תורים בוואטסאפ. למה לשנות?", 'faq.3.a': "אתה משאיר את הוואטסאפ. אנחנו מוסיפים עמוד הזמנות כדי שלקוחות יבחרו תור לבד במקום לכתוב לך. ההלוך ושוב נפסק. התורים לא.",
        'faq.4.q': "הלקוחות שלי באמת יקבעו אונליין?", 'faq.4.a': "הם כבר קובעים תספורות, שולחנות ורופאים אונליין. שלך תהיה האפשרות הקלה: פתוח בכל שעה, בלי לחכות שתענה בלילה.",
        'faq.5.q': "מה אני בעצם צריך לעשות?", 'faq.5.a': "שיחה אחת של 30 דקות. ספר לנו את השירותים, המחירים והלוז. אנחנו בונים ומריצים הכל משם. בלי שיעורי בית, בלי הלוך ושוב.",
        'faq.6.q': "אני צריך לדעת משהו טכני?", 'faq.6.a': "אפס. זאת כל הנקודה. אנחנו בונים, אנחנו מתחזקים. שירות חדש, מחיר חדש, משהו לשנות? אתה שולח הודעה וזה נעשה.",
        'chip.1': "✓ ללא התחייבות", 'chip.2': "✓ 48 שעות עד לאוויר",
        'final.title': "מוכן להתחיל?", 'final.trust': "בלי טפסים. בלי מצגות. רק שיחה.",
        'final.p': "שיחה אחת, 30 דקות. נכיר את העסק שלך, נגיד לך בדיוק מה היינו בונים, ונענה על כל שאלה. בלי מכירה. בלי התחייבות.",
        'footer.tagline': "נבנה בשבילך. עובד בלעדיך.", 'footer.col.links': "קישורים", 'footer.col.for': "נבנה עבור", 'footer.col.contact': "להתחלה",
        'footer.for.barber': "ברבר", 'footer.for.salon': "מספרה", 'footer.for.nail': "ציפורניים", 'footer.for.spa': "ספא ומדי-ספא", 'footer.for.massage': "עיסוי",
        'footer.for.lash': "ריסים", 'footer.for.pilates': "פילאטיס ויוגה", 'footer.for.trainer': "מאמן אישי", 'footer.for.physio': "פיזיותרפיה", 'footer.for.tattoo': "סטודיו לקעקועים",
        'footer.copy': "© ${year} Bapita. כל הזכויות שמורות."
      }
    };

    function applyLang(lang) {
      var dict = I18N[lang] || I18N.en;
      var currentYear = new Date().getFullYear();
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (key && dict[key] != null) el.innerHTML = dict[key].replace('${year}', currentYear);
      });
      document.querySelectorAll('.dir-arrow').forEach(function (a) {
        a.textContent = lang === 'he' ? '←' : '→';
      });
      document.querySelectorAll('.lang-toggle').forEach(function (tog) {
        tog.textContent = lang === 'he' ? 'EN' : 'עברית';
      });
      try { localStorage.setItem('bapita-lang', lang); } catch (e) {}
    }

    function initLang() {
      var lang = 'en';
      try { lang = localStorage.getItem('bapita-lang') || 'en'; } catch (e) {}
      applyLang(lang);
      document.querySelectorAll('.lang-toggle').forEach(function (tog) {
        tog.addEventListener('click', function () {
          var next = document.documentElement.lang === 'he' ? 'en' : 'he';
          applyLang(next);
          if (window.plausible) window.plausible('Lang Switched', { props: { to: next } });
        });
      });
    }

    function initMobileMenu() {
      var hamburger = document.getElementById('hamburger');
      var menu = document.getElementById('mobile-menu');
      if (!hamburger || !menu) return;
      hamburger.addEventListener('click', function () {
        var open = menu.style.display !== 'flex';
        menu.style.display = open ? 'flex' : 'none';
        hamburger.setAttribute('aria-expanded', String(open));
      });
      menu.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function () {
          menu.style.display = 'none';
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    function initPainSelector() {
      var rows = document.querySelectorAll('.pain-row');
      var scenes = document.querySelectorAll('.pain-scene');
      if (!rows.length) return;
      function setActive(idx) {
        rows.forEach(function (r, i) {
          r.classList.toggle('active', i === idx);
          r.setAttribute('aria-pressed', String(i === idx));
        });
        scenes.forEach(function (s, i) {
          var on = i === idx;
          s.classList.toggle('active', on);
          s.setAttribute('aria-hidden', String(!on));
        });
      }
      rows.forEach(function (row, i) {
        row.addEventListener('click', function () { setActive(i); });
        row.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i); }
        });
      });
      if (window.matchMedia('(hover: hover) and (min-width: 821px)').matches) {
        rows.forEach(function (row, i) { row.addEventListener('mouseenter', function () { setActive(i); }); });
      }
      setActive(0);
      if (!window.matchMedia('(hover: hover) and (min-width: 821px)').matches) {
        var autoIdx = 0;
        var timer = setInterval(function () {
          autoIdx = (autoIdx + 1) % rows.length;
          setActive(autoIdx);
        }, 4000);
        rows.forEach(function (row) {
          row.addEventListener('click', function () { clearInterval(timer); timer = null; });
        });
      }
    }

    function cloneScenesToMobile(rowSel, sceneSel, panelClass) {
      if (!window.matchMedia('(max-width: 820px)').matches) return;
      var rows = document.querySelectorAll(rowSel);
      var scenes = document.querySelectorAll(sceneSel);
      if (!rows.length || !scenes.length) return;
      rows.forEach(function (row, i) {
        var panel = document.createElement('div');
        panel.className = panelClass;
        var scene = scenes[i];
        if (scene) {
          var clone = scene.cloneNode(true);
          clone.classList.add('active');
          panel.appendChild(clone);
        }
        row.insertAdjacentElement('afterend', panel);
      });
    }

    function initHeroBooking() {
      var box = document.getElementById('heroBooking');
      if (!box) return;
      function pick(sel, group) {
        box.querySelectorAll(sel).forEach(function (el) {
          if (el.classList.contains('off')) return;
          el.addEventListener('click', function () {
            box.querySelectorAll(group).forEach(function (s) { s.classList.remove('sel'); });
            el.classList.add('sel');
          });
        });
      }
      pick('.pp-svc', '.pp-svc');
      pick('.pp-date', '.pp-date');
      pick('.pp-time:not(.off)', '.pp-time');
      var book = box.querySelector('.pp-book');
      if (book) book.addEventListener('click', function () {
        box.classList.add('done');
        var s = box.querySelector('.pp-success');
        if (s) s.classList.add('pop');
      });
    }

    function initAddonList() {
      document.querySelectorAll('.addon-item').forEach(function (item) {
        var row = item.querySelector('.addon-row');
        if (!row) return;
        function open() {
          document.querySelectorAll('.addon-item.open').forEach(function (el) {
            if (el !== item) {
              el.classList.remove('open');
              var r = el.querySelector('.addon-row');
              if (r) r.setAttribute('aria-expanded', 'false');
            }
          });
          item.classList.add('open');
          row.setAttribute('aria-expanded', 'true');
        }
        function close() { item.classList.remove('open'); row.setAttribute('aria-expanded', 'false'); }
        row.addEventListener('click', function () {
          if (item.classList.contains('open')) { close(); } else { open(); }
        });
      });
    }

    function initChannelSwitcher() {
      var item = document.getElementById('addonReminders');
      if (!item) return;
      item.querySelectorAll('.addon-channel-tab').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
          e.stopPropagation();
          var ch = tab.dataset.channel;
          item.querySelectorAll('.addon-channel-tab').forEach(function (t) {
            t.classList.toggle('active', t === tab);
            t.setAttribute('aria-selected', String(t === tab));
          });
          item.querySelectorAll('.addon-channel-desc').forEach(function (d) { d.classList.toggle('active', d.dataset.channel === ch); });
          item.querySelectorAll('.addon-channel-visual').forEach(function (v) { v.classList.toggle('active', v.dataset.channel === ch); });
        });
      });
    }

    function initFaqAccordion() {
      document.querySelectorAll('.faq-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.faq-item');
          var isOpen = item.classList.contains('open');
          document.querySelectorAll('.faq-item.open').forEach(function (el) {
            el.classList.remove('open');
            var b = el.querySelector('.faq-btn');
            if (b) b.setAttribute('aria-expanded', 'false');
          });
          if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
          if (window.plausible) window.plausible('FAQ Opened', { props: { question: btn.textContent.trim() } });
        });
      });
    }

    function initFadeUp() {
      var fadeObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); fadeObs.unobserve(e.target); }
        });
      }, { threshold: 0.08 });
      document.querySelectorAll('.fade-up').forEach(function (el) { fadeObs.observe(el); });
    }

    function initProofCount() {
      var bar = document.querySelector('.proof-bar');
      if (!bar) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var data = Array.prototype.slice.call(bar.querySelectorAll('.proof-num')).map(function (el) {
        var m = el.textContent.trim().match(/^(\d+)([\s\S]*)$/);
        return m ? { el: el, target: +m[1], suffix: m[2] } : null;
      }).filter(Boolean);
      if (!data.length) return;
      function run() {
        var dur = 1100, t0 = performance.now();
        function tick(now) {
          var p = Math.min((now - t0) / dur, 1);
          var e = 1 - Math.pow(1 - p, 3);
          data.forEach(function (d) { d.el.textContent = Math.round(d.target * e) + d.suffix; });
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
      var obs = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { run(); obs.disconnect(); } });
      }, { threshold: 0.4 });
      obs.observe(bar);
    }

    function initHowItWorks() {
      var rows = document.querySelectorAll('.hiw-row');
      var scenes = document.querySelectorAll('.hiw-scene');
      var trackFill = document.getElementById('hiwTrackFill');
      if (!rows.length) return;
      var fills = ['0%', '50%', '100%'];
      function setActive(idx) {
        rows.forEach(function (r, i) {
          var on = i === idx;
          r.classList.toggle('active', on);
          r.setAttribute('aria-expanded', String(on));
        });
        scenes.forEach(function (s, i) {
          s.classList.toggle('active', i === idx);
          s.setAttribute('aria-hidden', String(i !== idx));
        });
        if (trackFill) trackFill.style.height = fills[idx] || '100%';
      }
      setActive(0);
      rows.forEach(function (row, i) {
        row.addEventListener('click', function () { setActive(i); });
        row.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i); }
        });
      });
    }

    function initScrollProgress() {
      var bar = document.getElementById('scroll-progress');
      if (!bar) return;
      function update() {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = Math.min(pct, 100) + '%';
      }
      window.addEventListener('scroll', update, { passive: true });
      update();
    }

    function initLazyMarquee() {
      var tracks = document.querySelectorAll('.tmarquee-track');
      if (!tracks.length || !('IntersectionObserver' in window)) return;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; });
      }, { rootMargin: '200px' });
      tracks.forEach(function (t) {
        t.style.animationPlayState = 'paused';
        obs.observe(t);
      });
    }

    function initMagneticCta() {
      if (window.matchMedia('(hover: none)').matches) return;
      var section = document.getElementById('how-it-works');
      var btn = section && section.querySelector('[data-cta="hiw_cta"]');
      if (!section || !btn) return;
      var MAX = 10;
      var raf;
      section.addEventListener('mousemove', function (e) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var br = btn.getBoundingClientRect();
          var cx = br.left + br.width / 2;
          var cy = br.top + br.height / 2;
          var dx = Math.max(-MAX, Math.min(MAX, (e.clientX - cx) * 0.25));
          var dy = Math.max(-MAX, Math.min(MAX, (e.clientY - cy) * 0.25));
          btn.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        });
      });
      section.addEventListener('mouseleave', function () {
        cancelAnimationFrame(raf);
        btn.style.transform = '';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    }

    function initGlow() {
      document.querySelectorAll('.hero, .final-cta').forEach(function (el) {
        el.addEventListener('mousemove', function (e) {
          var r = el.getBoundingClientRect();
          el.style.setProperty('--glow-x', ((e.clientX - r.left) / r.width) * 100 + '%');
          el.style.setProperty('--glow-y', ((e.clientY - r.top) / r.height) * 100 + '%');
        });
      });
    }

    function initConnectModal() {
      window.openConnectModal = function (e) {
        if (e) e.preventDefault();
        window.showConnectChoice();
        var m = document.getElementById('bap-modal');
        m.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      };
      window.closeConnectModal = function () {
        document.getElementById('bap-modal').style.display = 'none';
        document.body.style.overflow = '';
        var form = document.getElementById('bap-form');
        if (form) form.reset();
        document.getElementById('bap-form-err').style.display = 'none';
        var sb = document.getElementById('bap-submit');
        sb.disabled = false;
        sb.textContent = 'Send';
      };
      window.showConnectChoice = function () {
        document.getElementById('bap-screen-choice').style.display = 'block';
        document.getElementById('bap-screen-form').style.display = 'none';
        document.getElementById('bap-screen-success').style.display = 'none';
      };
      window.showConnectForm = function () {
        document.getElementById('bap-screen-choice').style.display = 'none';
        document.getElementById('bap-screen-form').style.display = 'block';
        document.getElementById('bap-screen-success').style.display = 'none';
        setTimeout(function () {
          var f = document.getElementById('bap-f-name');
          if (f) f.focus();
        }, 60);
      };
      window.openCalendly = function () {
        window.open('https://calendly.com/info-bapita/30min', '_blank', 'noopener');
        window.closeConnectModal();
      };
      window.submitConnectForm = async function (e) {
        e.preventDefault();
        var name = document.getElementById('bap-f-name').value.trim();
        var biz = document.getElementById('bap-f-biz').value.trim();
        var phone = document.getElementById('bap-f-phone').value.trim();
        var email = document.getElementById('bap-f-email').value.trim();
        var errEl = document.getElementById('bap-form-err');
        var sb = document.getElementById('bap-submit');
        if (!name || !email) {
          errEl.textContent = 'Please fill in your name and email.';
          errEl.style.display = 'block';
          return;
        }
        errEl.style.display = 'none';
        sb.disabled = true;
        sb.textContent = String.fromCharCode(8230);
        try {
          var res = await fetch('/api/public/request-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, business_name: biz || null, phone: phone || null, email: email, lang: 'en' }),
          });
          if (!res.ok) throw new Error('server');
          document.getElementById('bap-screen-form').style.display = 'none';
          document.getElementById('bap-screen-success').style.display = 'block';
        } catch (_err) {
          errEl.textContent = 'Something went wrong. Please try again.';
          errEl.style.display = 'block';
          sb.disabled = false;
          sb.textContent = 'Send';
        }
      };
      var backdrop = document.getElementById('bap-backdrop');
      if (backdrop) backdrop.addEventListener('click', window.closeConnectModal);
      document.addEventListener('keydown', function (e) {
        var modal = document.getElementById('bap-modal');
        if (e.key === 'Escape' && modal && modal.style.display !== 'none') window.closeConnectModal();
      });
      var closeBtn = document.getElementById('bap-close');
      if (closeBtn) closeBtn.addEventListener('click', window.closeConnectModal);
      var doneBtn = document.getElementById('bap-done');
      if (doneBtn) doneBtn.addEventListener('click', window.closeConnectModal);
      var calendlyBtn = document.getElementById('bap-calendly-btn');
      if (calendlyBtn) calendlyBtn.addEventListener('click', window.openCalendly);
      var formBtn = document.getElementById('bap-form-btn');
      if (formBtn) formBtn.addEventListener('click', window.showConnectForm);
      var backBtn = document.getElementById('bap-back-btn');
      if (backBtn) backBtn.addEventListener('click', window.showConnectChoice);
      var bapForm = document.getElementById('bap-form');
      if (bapForm) bapForm.addEventListener('submit', window.submitConnectForm);
      var SKIP_CTAS = ['footer'];
      document.addEventListener('click', function (e) {
        var el = e.target.closest('[data-cta]');
        if (!el) return;
        var cta = el.getAttribute('data-cta');
        if (!cta || SKIP_CTAS.indexOf(cta) !== -1) return;
        e.preventDefault();
        window.openConnectModal(e);
      });
      document.querySelectorAll('[data-cta]').forEach(function (el) {
        el.addEventListener('click', function () {
          if (window.plausible) window.plausible('CTA Clicked', { props: { location: this.dataset.cta } });
        });
      });
    }

    function init() {
      initLang();
      initMobileMenu();
      initPainSelector();
      cloneScenesToMobile('.pain-row', '.pain-scene', 'pain-mobile-scene');
      initHeroBooking();
      initAddonList();
      initChannelSwitcher();
      initFaqAccordion();
      initFadeUp();
      initProofCount();
      initHowItWorks();
      cloneScenesToMobile('.hiw-row', '.hiw-scene', 'hiw-mobile-scene');
      initScrollProgress();
      initLazyMarquee();
      initMagneticCta();
      initGlow();
      initConnectModal();
    }

    init();
  }, []);

  return null;
}
