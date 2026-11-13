import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bizContact, isHe, loadLegalBiz, LegalShell, type LegalBiz, type LegalSection } from "../_shared";

// Accessibility statement for any business with a public page. Required for
// sites that serve the public under the Equal Rights for Persons with
// Disabilities (Service Accessibility Adjustments) Regulations, 5773-2013
// (spec 2026-11-11-legal-compliance). Built from the business row.

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
    title: isHe(lang, b) ? `הצהרת נגישות | ${b.name_he || b.name}` : `Accessibility statement | ${b.name}`,
    robots: { index: false, follow: true },
  };
}

// Good Living's own statement text (Debby/Rami 2026-11-13). Other tenants keep the shared text and date.
const GOOD_LIVING = "good-living-herzeliya";

function content(b: LegalBiz, he: boolean): { title: string; updated: string; back: string; other: string; sections: LegalSection[] } {
  const name = (he && b.name_he) || b.name;
  const gl = b.slug === GOOD_LIVING;
  const { phone, email } = bizContact(b);
  const ltr = { unicodeBidi: "isolate" as const, direction: "ltr" as const };
  const contact = (
    <>
      {phone && <>{he ? "טלפון / וואטסאפ: " : "Phone / WhatsApp: "}<a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ color: "inherit", ...ltr }}>{phone}</a></>}
      {phone && email && " · "}
      {email && <>{he ? "מייל: " : "Email: "}<a href={`mailto:${email}`} style={{ color: "inherit", ...ltr }}>{email}</a></>}
    </>
  );

  if (he) {
    return {
      title: `הצהרת נגישות — ${name}`,
      updated: gl ? "ההצהרה עודכנה: 13 בנובמבר 2026" : "ההצהרה עודכנה: נובמבר 2026",
      back: "חזרה לעמוד",
      other: "English",
      sections: [
        { h: "המחויבות שלנו", p: [
          `${name} רואה חשיבות רבה במתן שירות שוויוני ונגיש לכלל הלקוחות, כולל אנשים עם מוגבלות. אנו פועלים להנגשת האתר בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013, ולתקן הישראלי ת״י 5568 (המבוסס על הנחיות WCAG 2.0 ברמה AA).`,
        ] },
        { h: "מה עשינו", p: [
          "האתר בנוי ב-HTML סמנטי, כך שקוראי מסך וטכנולוגיות מסייעות מבינים את מבנה העמודים.",
          "אפשר לגלוש באתר ולמלא את טופס הבקשה באמצעות מקלדת בלבד.",
          "לתמונות יש תיאור טקסטואלי, ולשדות הטפסים יש תוויות.",
          "הקפדנו על ניגודיות צבעים מספקת בין הטקסט לרקע.",
          "האתר זמין בעברית (מימין לשמאל) ובאנגלית (משמאל לימין).",
          "העיצוב מתאים למסכי טלפון, טאבלט ומחשב.",
          "בתחתית כל עמוד יש תפריט נגישות להגדלת טקסט, להגברת ניגודיות, לצמצום אנימציות ולהדגשת הפוקוס במקלדת.",
        ] },
        { h: "מגבלות ידועות", p: [
          "למרות מאמצינו, ייתכן שחלקים באתר עדיין אינם נגישים במלואם.",
          "חלק מהעמודים אינם בשליטתנו, למשל עמוד התשלום בכרטיס אשראי שמופעל על ידי חשבונית ירוקה (morning) וחברת הסליקה Grow.",
          "תכנים שמעלה בעל העסק, כגון תמונות, עשויים להיות חסרים תיאור טקסטואלי.",
        ] },
        ...(gl ? [{ h: "הדירות", p: [
          "אף אחת משלוש הדירות אינה מותאמת לכיסאות גלגלים. אם צריך עזרה בנגישות או יש שאלה לפני ההזמנה, פנו אלינו ונפרט בדיוק מה מחכה לכם.",
        ] }] : []),
        { h: "יצירת קשר בנושא נגישות", p: [
          "נתקלתם בבעיית נגישות, או שאתם זקוקים לעזרה בהזמנה? פנו אלינו ונעשה כמיטב יכולתנו לעזור.",
          <>רכז הנגישות: {name}. {contact}</>,
        ] },
      ],
    };
  }
  return {
    title: `Accessibility statement — ${name}`,
    updated: gl ? "Statement updated: 13 November 2026" : "Statement updated: November 2026",
    back: "Back to the page",
    other: "עברית",
    sections: [
      { h: "Our commitment", p: [
        `${name} is committed to providing an equal and accessible service to everyone, including people with disabilities. We work to make this website accessible in line with the Israeli Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations, 5773-2013, and Israeli Standard 5568 (based on WCAG 2.0, level AA).`,
      ] },
      { h: "What we have done", p: [
        "The site uses semantic HTML, so screen readers and assistive technology can understand the structure of each page.",
        "The site and the request form can be used with a keyboard alone.",
        "Images have text alternatives and form fields have labels.",
        "We kept enough colour contrast between text and background.",
        "The site works in Hebrew (right to left) and English (left to right).",
        "The layout adapts to phones, tablets and desktop screens.",
        "An accessibility menu at the bottom of every page lets you enlarge the text, raise the contrast, reduce motion and strengthen the keyboard focus outline.",
      ] },
      { h: "Known limitations", p: [
        "Despite our efforts, some parts of the site may not yet be fully accessible.",
        "Some third-party pages, such as the card payment page run by Green Invoice (morning) and Grow, are not under our control.",
        "Content added by the business owner, such as photos, may lack a text alternative.",
      ] },
      ...(gl ? [{ h: "The apartments", p: [
        "None of the three apartments is adapted for wheelchair users. If you need help with access or have a question before booking, contact us and we'll tell you exactly what to expect.",
      ] }] : []),
      { h: "Accessibility contact", p: [
        "If you run into an accessibility barrier, or need help making a booking, contact us and we will do our best to help.",
        <>Accessibility contact: {name}. {contact}</>,
      ] },
    ],
  };
}

export default async function AccessibilityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const b = await loadLegalBiz(slug);
  if (!b) notFound();
  const he = isHe(lang, b);
  const c = content(b, he);
  return <LegalShell b={b} he={he} page="accessibility" {...c} />;
}
