import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { STAY_CHECK_IN_TIME, STAY_CHECK_OUT_TIME } from "@/lib/stay";
import { displayIlPhone } from "@/lib/phone-display";

// A stay business's own booking terms: who the seller is, how booking and
// payment work, and how cancellations are handled. Required for Grow's clearing
// site review and Israeli distance-sale disclosure (spec 2026-11-10-stay-pay-link).
// Built from the business row so every stay gets correct terms without a copy job.

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

interface Biz {
  name: string;
  name_he: string | null;
  slug: string;
  status: string | null;
  business_type: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_number: string | null;
  business_id_number: string | null;
  legal_name: string | null;
  legal_address: string | null;
  cancellation_policy: string | null;
  default_lang: string | null;
}

// Same anon client + column grants as the tenant homepage.
async function load(slug: string): Promise<Biz | null> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase
    .from("businesses")
    .select("name, name_he, slug, status, business_type, address, phone, email, whatsapp_number, business_id_number, legal_name, legal_address, cancellation_policy, default_lang")
    .eq("slug", slug)
    .single();
  const b = data as Biz | null;
  if (!b || b.business_type !== "stay") return null;
  return b;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  const b = await load(slug);
  if (!b) return {};
  const he = lang === "he";
  return {
    title: he ? `תנאי הזמנה | ${b.name_he || b.name}` : `Booking terms | ${b.name}`,
    robots: { index: false, follow: true },
  };
}

type Section = { h: string; p: (ReactNode | false | null | undefined)[] };

function content(b: Biz, he: boolean): { title: string; updated: string; sections: Section[]; back: string; other: string } {
  const name = (he && b.name_he) || b.name;
  const seller = b.legal_name || name;
  const rawPhone = b.phone || b.whatsapp_number;
  const phone = rawPhone ? displayIlPhone(rawPhone) : null;
  const linkStyle = { color: "inherit", textDecoration: "underline" };
  const sampleHref = `/pay/sample/${b.slug}?lang=${he ? "he" : "en"}`;
  const privacyHref = `/${b.slug}/legal/privacy?lang=${he ? "he" : "en"}`;
  if (he) {
    return {
      title: `תנאי הזמנה — ${name}`,
      updated: "עודכן: נובמבר 2026",
      back: "חזרה לעמוד",
      other: "English",
      sections: [
        { h: "מי אנחנו", p: [
          `${name} מופעל על ידי ${seller}${b.business_id_number ? `, עוסק מספר ${b.business_id_number}` : ""}.`,
          b.legal_address && `כתובת רשומה: ${b.legal_address}.`,
          b.address && `כתובת הנכס: ${b.address}.`,
          (phone || b.email) && `יצירת קשר: ${[phone && `טלפון / וואטסאפ ${phone}`, b.email && `מייל ${b.email}`].filter(Boolean).join(", ")}.`,
        ] },
        { h: "גיל המזמין", p: [
          "ביצוע הזמנה ותשלום באתר מותרים רק למי שמלאו לו 18 שנים ומעלה. המזמין אחראי לכל האורחים בהזמנה.",
        ] },
        { h: "הזמנה", p: [
          "בקשה שנשלחת דרך האתר אינה הזמנה סופית.",
          "ההזמנה מאושרת רק אחרי שהמארח אישר אותה והתשלום המלא התקבל. המארח שולח לאורח קישור תשלום אישי עם הסכום הסופי.",
        ] },
        { h: "מחירים ותשלום", p: [
          "המחירים בשקלים חדשים. המחירים סופיים וכוללים את כל המסים.",
          <>התשלום מתבצע במלואו בעמוד תשלום מאובטח של חשבונית ירוקה (morning) וחברת הסליקה Grow (<Link href={sampleHref} style={linkStyle}>דוגמה לעמוד התשלום</Link>). איננו שומרים את פרטי כרטיס האשראי.</>,
          "על כל תשלום מונפקת קבלה שנשלחת במייל.",
        ] },
        { h: "שינויים וביטולים", p: [
          "רק המארח יכול לשנות או לבטל הזמנה מאושרת.",
          `אורח שרוצה לבטל או לשנות שולח בקשה בוואטסאפ או במייל${phone || b.email ? ` (${[phone, b.email].filter(Boolean).join(" / ")})` : ""}.`,
          "ביטול על ידי האורח כפוף לחוק הגנת הצרכן, התשמ״א-1981, ולתקנות לפיו:",
          "אורח רשאי לבטל הזמנה בתוך 14 ימים מיום ההזמנה (או מיום קבלת אישור ההזמנה), ובלבד שנותרו עד מועד ההגעה יותר מ-7 ימים שאינם שבתות או חגים. במקרה כזה דמי הביטול לא יעלו על 5% ממחיר ההזמנה או 100 ₪, לפי הנמוך מביניהם (בתוספת עמלות סליקה, אם חויב בהן העסק). החזר כספי יינתן בתוך 14 ימים ממועד הודעת הביטול.",
          "אורח בן 65 ומעלה, אדם עם מוגבלות או עולה חדש, שההזמנה שלו נעשתה בעקבות שיחה (טלפון, צ׳אט או וואטסאפ), רשאי לבטל בתוך 4 חודשים מיום ההזמנה, ובלבד שנותרו עד מועד ההגעה לפחות 7 ימי עסקים.",
          "מחוץ למסגרות אלה החזר כספי אינו מובטח, והוא לשיקול דעת המארח. מומלץ לברר עם המארח לגבי התאריכים לפני ההזמנה.",
          b.cancellation_policy && `מדיניות הביטולים של העסק: ${b.cancellation_policy}`,
        ] },
        { h: "אספקת השירות", p: [
          "השירות הוא לינה בנכס בתאריכים שנקבעו בהזמנה. אין משלוח של מוצר פיזי.",
          "אישור הזמנה וקבלה נשלחים במייל מיד לאחר שהתשלום מתקבל.",
          `פרטי הגעה, קוד או מפתח כניסה וכללי הבית נשלחים במייל או בוואטסאפ עד 24 שעות לפני ההגעה. הצ׳ק אין מהשעה ${STAY_CHECK_IN_TIME}, והצ׳ק אאוט עד השעה ${STAY_CHECK_OUT_TIME}.`,
          "אם הנכס אינו זמין מסיבה שבשליטתנו, יוצע לאורח נכס חלופי שווה ערך או החזר מלא של הסכום ששולם.",
        ] },
        { h: "אחריות", p: [
          "האורח אחראי לנזק שנגרם לנכס ולתכולתו במהלך השהייה, על ידו או על ידי מי מאורחיו.",
          "איננו אחראים לאובדן, גניבה או נזק לחפצים אישיים של האורחים, ולא לנזק ישיר או עקיף שנגרם משימוש בנכס שלא בהתאם לכללי הבית.",
          "איננו אחראים לתקלה או לעיכוב שנגרמו מכוח עליון או מגורם חיצוני שאינו בשליטתנו (כגון הפסקת חשמל, מים או אינטרנט מצד ספק).",
          "אין באמור כדי לגרוע מזכויות האורח לפי כל דין.",
        ] },
        { h: "פרטיות", p: [
          <>פרטים אישיים שנמסרים בהזמנה משמשים רק לטיפול בהזמנה. ראו את <Link href={privacyHref} style={linkStyle}>הודעת הפרטיות</Link>.</>,
        ] },
        { h: "דין וסמכות", p: [
          "על התנאים חלים דיני מדינת ישראל, והסמכות נתונה לבתי המשפט בישראל.",
        ] },
      ],
    };
  }
  return {
    title: `Booking terms — ${name}`,
    updated: "Last updated: November 2026",
    back: "Back to the page",
    other: "עברית",
    sections: [
      { h: "Who we are", p: [
        `${name} is operated by ${seller}${b.business_id_number ? `, Israeli business ID ${b.business_id_number}` : ""}.`,
        b.legal_address && `Registered address: ${b.legal_address}.`,
        b.address && `Property address: ${b.address}.`,
        (phone || b.email) && `Contact: ${[phone && `phone / WhatsApp ${phone}`, b.email && `email ${b.email}`].filter(Boolean).join(", ")}.`,
      ] },
      { h: "Age", p: [
        "You must be 18 or older to book and pay on this site. The person booking is responsible for all guests on the booking.",
      ] },
      { h: "Booking", p: [
        "A request sent through this site is not a reservation.",
        "A booking is confirmed only after the host accepts it and full payment is received. The host sends the guest a private payment link with the final total.",
      ] },
      { h: "Prices and payment", p: [
        "Prices are in Israeli shekels (ILS). Prices are final and include all taxes.",
        <>Payment is made in full on a secure payment page run by Green Invoice (morning) and the clearing company Grow (<Link href={sampleHref} style={linkStyle}>example of the payment page</Link>). We never store your card details.</>,
        "A receipt is issued for every payment and sent by email.",
      ] },
      { h: "Changes and cancellations", p: [
        "Only the host can change or cancel a confirmed booking.",
        `A guest who wants to cancel or change a booking sends a request by WhatsApp or email${phone || b.email ? ` (${[phone, b.email].filter(Boolean).join(" / ")})` : ""}.`,
        "Cancellation by the guest is subject to the Israeli Consumer Protection Law, 5741-1981, and its regulations:",
        "A guest may cancel within 14 days of booking (or of receiving the booking confirmation), provided that more than 7 days that are not Shabbat or holidays remain before check-in. In that case the cancellation fee is at most 5% of the price or ₪100, whichever is lower (plus card-clearing fees, if charged to the business). Any refund is made within 14 days of the cancellation notice.",
        "A guest aged 65 or over, a person with a disability or a new immigrant, whose booking was made after a conversation (phone, chat or WhatsApp), may cancel within 4 months of booking, provided that at least 7 business days remain before check-in.",
        "Outside these windows a refund is not guaranteed and is at the host's discretion. Please check with the host about your dates before booking.",
        b.cancellation_policy && `The business's cancellation policy: ${b.cancellation_policy}`,
      ] },
      { h: "Delivery of the service", p: [
        "The service is accommodation at the property on the dates in the booking. No physical product is shipped.",
        "A booking confirmation and receipt are sent by email as soon as payment is received.",
        `Arrival details, the entry code or key, and house rules are sent by email or WhatsApp no later than 24 hours before arrival. Check-in is from ${STAY_CHECK_IN_TIME} and check-out is by ${STAY_CHECK_OUT_TIME}.`,
        "If the property is unavailable for a reason within our control, the guest is offered an equivalent alternative or a full refund of the amount paid.",
      ] },
      { h: "Liability", p: [
        "The guest is responsible for damage to the property and its contents caused during the stay by the guest or anyone in their party.",
        "We are not responsible for loss, theft or damage to guests' personal belongings, or for direct or indirect damage caused by using the property against the house rules.",
        "We are not responsible for faults or delays caused by force majeure or by outside providers beyond our control (such as power, water or internet outages).",
        "Nothing in these terms limits a guest's rights under Israeli law.",
      ] },
      { h: "Privacy", p: [
        <>Personal details given when booking are used only to handle the booking. See the <Link href={privacyHref} style={linkStyle}>privacy notice</Link>.</>,
      ] },
      { h: "Law", p: [
        "These terms are governed by the laws of the State of Israel, and the courts of Israel have jurisdiction.",
      ] },
    ],
  };
}

export default async function StayTermsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const b = await load(slug);
  if (!b) notFound();

  const he = lang === "he" || (lang !== "en" && b.default_lang === "he");
  const c = content(b, he);
  const muted = "var(--color-muted, #6B6257)";
  const dark = "var(--color-dark, #1E1A14)";

  return (
    <main dir={he ? "rtl" : "ltr"} lang={he ? "he" : "en"} style={{ minHeight: "100vh", background: "var(--color-cream, #FAF5EC)", padding: "40px 16px" }}>
      <article style={{ maxWidth: 720, margin: "0 auto", background: "var(--color-surface, #fff)", borderRadius: 20, padding: "28px 22px", lineHeight: 1.7, color: dark }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, marginBottom: 16 }}>
          <Link href={`/${b.slug}${he ? "/he" : ""}`} style={{ color: muted }}>{he ? "→" : "←"} {c.back}</Link>
          <Link href={`/${b.slug}/legal/terms?lang=${he ? "en" : "he"}`} style={{ color: muted }}>{c.other}</Link>
        </div>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>{c.title}</h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: muted }}>{c.updated}</p>
        {c.sections.map((s) => (
          <section key={s.h} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{s.h}</h2>
            {s.p.filter(Boolean).map((t, i) => (
              <p key={i} style={{ margin: "0 0 6px", fontSize: 15 }}>{t}</p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
