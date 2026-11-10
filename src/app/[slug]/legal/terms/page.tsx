import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { STAY_CHECK_IN_TIME } from "@/lib/stay";
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

type Section = { h: string; p: (string | false | null | undefined)[] };

function content(b: Biz, he: boolean): { title: string; updated: string; sections: Section[]; back: string; other: string } {
  const name = (he && b.name_he) || b.name;
  const seller = b.legal_name || name;
  const rawPhone = b.phone || b.whatsapp_number;
  const phone = rawPhone ? displayIlPhone(rawPhone) : null;
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
        { h: "הזמנה", p: [
          "בקשה שנשלחת דרך האתר אינה הזמנה סופית.",
          "ההזמנה מאושרת רק אחרי שהמארח אישר אותה והתשלום המלא התקבל. המארח שולח לאורח קישור תשלום אישי עם הסכום הסופי.",
        ] },
        { h: "מחירים ותשלום", p: [
          "המחירים בשקלים חדשים.",
          "התשלום מתבצע במלואו בעמוד תשלום מאובטח של חשבונית ירוקה (morning) וחברת הסליקה Grow. איננו שומרים את פרטי כרטיס האשראי.",
          "על כל תשלום מונפקת קבלה שנשלחת במייל.",
        ] },
        { h: "שינויים וביטולים", p: [
          "רק המארח יכול לשנות או לבטל הזמנה מאושרת.",
          `אורח שרוצה לבטל או לשנות שולח בקשה בוואטסאפ או במייל${phone || b.email ? ` (${[phone, b.email].filter(Boolean).join(" / ")})` : ""}.`,
          "בקשות מטופלות, והחזרים ניתנים כשהם מגיעים, בהתאם לחוק הגנת הצרכן, התשמ״א-1981, ולתקנות לפיו.",
          b.cancellation_policy && `מדיניות נוספת: ${b.cancellation_policy}`,
        ] },
        { h: "הגעה ושהייה", p: [
          `הצ׳ק אין מהשעה ${STAY_CHECK_IN_TIME}. פרטי הגעה וכללי הבית נשלחים עם אישור ההזמנה.`,
        ] },
        { h: "פרטיות", p: [
          "פרטים אישיים שנמסרים בהזמנה משמשים רק לטיפול בהזמנה. ראו את מדיניות הפרטיות.",
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
      { h: "Booking", p: [
        "A request sent through this site is not a reservation.",
        "A booking is confirmed only after the host accepts it and full payment is received. The host sends the guest a private payment link with the final total.",
      ] },
      { h: "Prices and payment", p: [
        "Prices are in Israeli shekels (ILS).",
        "Payment is made in full on a secure payment page run by Green Invoice (morning) and the clearing company Grow. We never store your card details.",
        "A receipt is issued for every payment and sent by email.",
      ] },
      { h: "Changes and cancellations", p: [
        "Only the host can change or cancel a confirmed booking.",
        `A guest who wants to cancel or change a booking sends a request by WhatsApp or email${phone || b.email ? ` (${[phone, b.email].filter(Boolean).join(" / ")})` : ""}.`,
        "Requests are handled, and refunds given where due, in accordance with the Israeli Consumer Protection Law, 5741-1981, and its regulations.",
        b.cancellation_policy && `Additional policy: ${b.cancellation_policy}`,
      ] },
      { h: "Arrival and stay", p: [
        `Check-in is from ${STAY_CHECK_IN_TIME}. Arrival details and house rules are sent with the booking confirmation.`,
      ] },
      { h: "Privacy", p: [
        "Personal details given when booking are used only to handle the booking. See the privacy policy.",
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
    <main dir={he ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "var(--color-cream, #FAF5EC)", padding: "40px 16px" }}>
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
        <p style={{ fontSize: 14, margin: "20px 0 0" }}>
          <Link href="/privacy" style={{ color: muted }}>{he ? "מדיניות פרטיות" : "Privacy policy"}</Link>
        </p>
      </article>
    </main>
  );
}
