import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bizContact, isHe, loadLegalBiz, LegalShell, type LegalBiz, type LegalSection } from "../_shared";
import { SITE_URL } from "@/lib/site-url";
import { CookieChoiceReset } from "@/components/CookieConsent";

// A business's own privacy notice. Under Israel's Privacy Protection Law
// (Amendment 13, in force 14 Aug 2025) whoever collects the details must say who
// holds them, why, who receives them and what rights people have. For a guest of
// a tenant that is the business, not Bapita, so the platform page at /privacy
// (Bapita's own policy) is wrong for them (spec 2026-11-11-legal-compliance).
// The notice already covers marketing messages, so a newsletter can be added
// later without rewriting it.

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  const b = await loadLegalBiz(slug);
  if (!b) return {};
  return {
    title: isHe(lang, b) ? `הודעת פרטיות | ${b.name_he || b.name}` : `Privacy notice | ${b.name}`,
    robots: { index: false, follow: true },
  };
}

function content(b: LegalBiz, he: boolean): { title: string; updated: string; back: string; other: string; sections: LegalSection[] } {
  const name = (he && b.name_he) || b.name;
  const holder = b.legal_name || name;
  const { phone, email } = bizContact(b);
  const stay = b.business_type === "stay";
  const linkStyle = { color: "inherit", textDecoration: "underline" };
  const ltr = { unicodeBidi: "isolate" as const, direction: "ltr" as const };
  const contact = (
    <>
      {phone && <>{he ? "טלפון / וואטסאפ: " : "Phone / WhatsApp: "}<a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ color: "inherit", ...ltr }}>{phone}</a></>}
      {phone && email && " · "}
      {email && <>{he ? "מייל: " : "Email: "}<a href={`mailto:${email}`} style={{ color: "inherit", ...ltr }}>{email}</a></>}
    </>
  );
  const hasContact = !!(phone || email);

  if (he) {
    return {
      title: `הודעת פרטיות — ${name}`,
      updated: "עודכן: נובמבר 2026",
      back: "חזרה לעמוד",
      other: "English",
      sections: [
        { h: "מי מחזיק במידע", p: [
          `${name} מופעל על ידי ${holder}${b.business_id_number ? `, עוסק מספר ${b.business_id_number}` : ""}. ${holder} הוא הגורם המחזיק במידע האישי שנאסף באתר זה (״אנחנו״).`,
          b.legal_address && `כתובת רשומה: ${b.legal_address}.`,
          hasContact && <>יצירת קשר בנושא פרטיות: {contact}</>,
        ] },
        { h: "איזה מידע אנחנו אוספים", p: [
          stay
            ? "כששולחים בקשת לינה או משלמים בקישור תשלום אנחנו אוספים: שם, מספר טלפון, כתובת מייל (רשות), תאריכי השהייה, מספר האורחים, הערות שכתבתם וסטטוס התשלום."
            : "כשקובעים תור אנחנו אוספים: שם, מספר טלפון, כתובת מייל (רשות), השירות שנבחר, מועד התור, הערות שכתבתם וסטטוס התשלום.",
          "פרטי כרטיס האשראי מוזנים רק בעמוד של ספק התשלום ואינם נשמרים אצלנו.",
        ] },
        { h: "למה אנחנו משתמשים במידע", p: [
          "לטיפול בהזמנה: מענה לבקשה, שליחת קישור תשלום, הנפקת קבלות, שליחת אישור הזמנה ופרטי הגעה, ויצירת קשר איתכם בנוגע להזמנה.",
        ] },
        { h: "חובה למסור מידע?", p: [
          "מסירת הפרטים נעשית מרצונכם ואינה חובה על פי חוק. עם זאת, בלי שם וטלפון לא נוכל לטפל בהזמנה.",
        ] },
        { h: "מי מעבד מידע בשמנו", p: [
          "המידע מעובד בשמנו על ידי ספקים שמסייעים לנו להפעיל את האתר וההזמנות:",
          <>Bapita, פלטפורמת ההזמנות שמארחת את האתר. למדיניות הפרטיות של Bapita עצמה ראו <a href={`${SITE_URL}/privacy`} style={linkStyle}>bapita.com/privacy</a>.</>,
          "ספקי אחסון ומסד נתונים.",
          "חשבונית ירוקה (morning) וחברת הסליקה Grow, לצורך תשלום והנפקת קבלות.",
          "ספק לשליחת מיילים.",
          "כלי ניתוח נתונים, כגון Google Analytics ו-Umami.",
        ] },
        { h: "כמה זמן נשמור את המידע", p: [
          "נשמור את המידע כל עוד הוא נחוץ לטיפול בהזמנה, ולפי הנדרש בדין, למשל חובות שמירת מסמכים לפי דיני המס.",
        ] },
        { h: "הזכויות שלכם", p: [
          <>לפי חוק הגנת הפרטיות, התשמ״א-1981, אפשר לבקש לעיין במידע שנשמר עליכם, לתקן אותו או למחוק אותו.{hasContact ? <> לשם כך פנו אלינו: {contact}</> : null}</>,
        ] },
        { h: "עוגיות (Cookies)", p: [
          "האתר משתמש בעוגיות חיוניות, הנדרשות לתפקודו.",
          "עוגיות ניתוח (Google Analytics) נטענות רק אם אישרתם אותן בהודעת העוגיות.",
          <><CookieChoiceReset label="שינוי הבחירה שלי בנושא עוגיות" /></>,
        ] },
        { h: "הודעות שיווקיות וניוזלטר", p: [
          "הודעות שיווקיות (מייל, SMS, וואטסאפ, ניוזלטר) יישלחו רק למי שנתן הסכמה מפורשת ונפרדת (opt-in). ההסכמה אינה מסומנת מראש ואינה תנאי להזמנה, בהתאם לסעיף 30א לחוק התקשורת (בזק ושידורים), התשמ״ב-1982.",
          "בכל הודעה שיווקית יצוינו זהות השולח ודרך פשוטה להסרה מהרשימה, וההסרה תיעשה בהקדם.",
          "הודעות הקשורות להזמנה, כגון אישור הזמנה, תשלום ופרטי הגעה, אינן הודעות שיווקיות.",
        ] },
      ],
    };
  }
  return {
    title: `Privacy notice — ${name}`,
    updated: "Last updated: November 2026",
    back: "Back to the page",
    other: "עברית",
    sections: [
      { h: "Who holds your details", p: [
        `${name} is operated by ${holder}${b.business_id_number ? `, Israeli business ID ${b.business_id_number}` : ""}. ${holder} is the holder of the personal data collected on this site ("we").`,
        b.legal_address && `Registered address: ${b.legal_address}.`,
        hasContact && <>Privacy contact: {contact}</>,
      ] },
      { h: "What we collect", p: [
        stay
          ? "When you send a stay request or pay through a payment link we collect: your name, phone number, email address (optional), the dates of your stay, the number of guests, any notes you write, and the payment status."
          : "When you book an appointment we collect: your name, phone number, email address (optional), the service you chose, the appointment time, any notes you write, and the payment status.",
        "Card details are entered only on the payment provider's page and are never stored by us.",
      ] },
      { h: "Why we use your details", p: [
        "To handle your booking: reply to your request, send the payment link, issue receipts, send the booking confirmation and arrival details, and contact you about the booking.",
      ] },
      { h: "Is giving your details required?", p: [
        "Giving us your details is voluntary and not required by law. Without your name and phone number, however, we cannot handle a booking.",
      ] },
      { h: "Who processes your details for us", p: [
        "Providers that help us run the site and the bookings process the details on our behalf:",
        <>Bapita, the booking platform that hosts this site. For Bapita&apos;s own policy see <a href={`${SITE_URL}/privacy`} style={linkStyle}>bapita.com/privacy</a>.</>,
        "Hosting and database providers.",
        "Green Invoice (morning) and the clearing company Grow, for payment and receipts.",
        "An email delivery provider.",
        "Analytics tools such as Google Analytics and Umami.",
      ] },
      { h: "How long we keep your details", p: [
        "We keep them as long as needed to handle the booking, and as required by law, for example the tax law's record-keeping rules.",
      ] },
      { h: "Your rights", p: [
        <>Under the Israeli Privacy Protection Law, 5741-1981, you can ask to review the information we hold about you, correct it or delete it.{hasContact ? <> To do so, contact us: {contact}</> : null}</>,
      ] },
      { h: "Cookies", p: [
        "This site uses essential cookies, which it needs to work.",
        "Analytics cookies (Google Analytics) are used only if you accept them in the cookie banner.",
        <><CookieChoiceReset label="Change my cookie choice" /></>,
      ] },
      { h: "Marketing messages and newsletter", p: [
        "Marketing messages (email, SMS, WhatsApp, newsletter) are sent only to people who gave explicit, separate consent (opt-in). Consent is never pre-ticked and is never a condition of booking, in line with section 30A of the Communications Law (Bezeq and Broadcasting), 5742-1982.",
        "Every marketing message identifies the sender and includes an easy way to unsubscribe, and unsubscribing is honoured promptly.",
        "Booking-related messages, such as the confirmation, payment and arrival details, are not marketing.",
      ] },
    ],
  };
}

export default async function BusinessPrivacyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const b = await loadLegalBiz(slug);
  if (!b) notFound();
  const he = isHe(lang, b);
  const c = content(b, he);
  return <LegalShell b={b} he={he} page="privacy" {...c} />;
}
