import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { linkState, loadLinkByToken } from "@/lib/payment-links";
import { nightsBetween } from "@/lib/stay";
import { formatIls } from "@/lib/payments";
import { PayCard, type PayLang } from "../../PayResult";

// Private pay link a host sent to one guest (spec: docs/specs/2026-11-10-stay-pay-link.md).
// Shows what is being paid for and one button. The charge itself happens in
// /api/public/pay-link/checkout, which re-checks everything.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ e?: string }>;
}

const COPY = {
  en: {
    title: "Complete your booking",
    body: "Check the details below. Payment is taken on Green Invoice's secure page — we never see your card.",
    unit: "Unit", checkIn: "Check-in", checkOut: "Check-out", nights: "Nights", guests: "Guests", total: "Total",
    pay: (a: string) => `Pay ${a} securely`,
    paidTitle: "Already paid", paidBody: "This booking is paid and confirmed. You can close this page.",
    receivedTitle: "Payment received", receivedBody: "Your payment went through. Your host will confirm your booking shortly.",
    goneTitle: "Link no longer active", goneBody: "This payment link has expired or was replaced. Ask your host for a new one.",
    closedTitle: "Booking closed", closedBody: "This booking can no longer be paid online. Please contact your host.",
    missingTitle: "Link not found", missingBody: "Check that you opened the full link your host sent.",
    errors: {
      failed: "The payment did not go through. You were not charged — you can try again.",
      taken: "These dates are no longer available. Please contact your host.",
      busy: "One moment — a payment page is already opening. Try again in a few seconds.",
      error: "We could not open the payment page. Please try again in a minute.",
      closed: "This booking can no longer be paid online. Please contact your host.",
    } as Record<string, string>,
    expires: (d: string) => `Link valid until ${d}`,
    seller: (n: string, id: string) => `Seller: ${n}${id ? ` · Business ID ${id}` : ""}`,
    terms: "Booking terms and cancellations",
  },
  he: {
    title: "השלמת ההזמנה",
    body: "בדקו את הפרטים. התשלום מתבצע בעמוד המאובטח של חשבונית ירוקה — אנחנו לא רואים את פרטי הכרטיס.",
    unit: "יחידה", checkIn: "צ׳ק אין", checkOut: "צ׳ק אאוט", nights: "לילות", guests: "אורחים", total: "סה״כ",
    pay: (a: string) => `לתשלום מאובטח ${a}`,
    paidTitle: "ההזמנה שולמה", paidBody: "ההזמנה שולמה ואושרה. אפשר לסגור את העמוד.",
    receivedTitle: "התשלום התקבל", receivedBody: "התשלום עבר. המארח יאשר את ההזמנה בקרוב.",
    goneTitle: "הקישור כבר לא פעיל", goneBody: "קישור התשלום פג תוקף או הוחלף. בקשו מהמארח קישור חדש.",
    closedTitle: "ההזמנה סגורה", closedBody: "לא ניתן לשלם על ההזמנה הזו אונליין. צרו קשר עם המארח.",
    missingTitle: "הקישור לא נמצא", missingBody: "ודאו שפתחתם את הקישור המלא שהמארח שלח.",
    errors: {
      failed: "התשלום לא עבר ולא חויבתם. אפשר לנסות שוב.",
      taken: "התאריכים האלה כבר לא פנויים. צרו קשר עם המארח.",
      busy: "רגע — עמוד התשלום כבר נפתח. נסו שוב בעוד כמה שניות.",
      error: "לא הצלחנו לפתוח את עמוד התשלום. נסו שוב בעוד דקה.",
      closed: "לא ניתן לשלם על ההזמנה הזו אונליין. צרו קשר עם המארח.",
    } as Record<string, string>,
    expires: (d: string) => `הקישור בתוקף עד ${d}`,
    seller: (n: string, id: string) => `המוכר: ${n}${id ? ` · מספר עוסק ${id}` : ""}`,
    terms: "תנאי הזמנה וביטולים",
  },
};

function fmtDate(iso: string, lang: PayLang): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", {
    weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem",
  });
}

export default async function PayLinkPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { e } = await searchParams;

  const supabase = createServiceClient();
  const link = await loadLinkByToken(supabase, token);
  if (!link) {
    return <PayCard lang="en" icon="🔗" title={COPY.en.missingTitle} body={COPY.en.missingBody} />;
  }

  const lang: PayLang = link.lang === "he" ? "he" : "en";
  const t = COPY[lang];

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, business_id, status, payment_status, appointment_date, check_out, guests, service:services(name, name_he)")
    .eq("id", link.booking_id)
    .single();
  const { data: biz } = await supabase.from("businesses").select("name, slug, business_id_number, legal_name").eq("id", link.business_id).single();

  if (!booking || booking.business_id !== link.business_id || !booking.check_out) {
    return <PayCard lang={lang} icon="🔒" title={t.closedTitle} body={t.closedBody} />;
  }
  if (booking.payment_status === "deposit_paid" || link.status === "paid") {
    return booking.status === "confirmed"
      ? <PayCard lang={lang} icon="✅" title={t.paidTitle} body={t.paidBody} />
      : <PayCard lang={lang} icon="✅" title={t.receivedTitle} body={t.receivedBody} />;
  }
  if (linkState(link) !== "payable") {
    return <PayCard lang={lang} icon="⏳" title={t.goneTitle} body={t.goneBody} />;
  }
  if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "no_show" || booking.payment_status !== "none") {
    return <PayCard lang={lang} icon="🔒" title={t.closedTitle} body={t.closedBody} />;
  }

  const svcRaw = booking.service as unknown;
  const svc = (Array.isArray(svcRaw) ? svcRaw[0] : svcRaw) as { name?: string | null; name_he?: string | null } | null;
  const unit = (lang === "he" && svc?.name_he) || svc?.name || "";
  const nights = nightsBetween(booking.appointment_date as string, booking.check_out as string);
  const amount = formatIls(Number(link.amount));
  const errorMsg = e ? t.errors[e] : undefined;
  const expires = new Date(link.expires_at).toLocaleString(lang === "he" ? "he-IL" : "en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem",
  });

  const rows: [string, string][] = [
    [t.unit, unit],
    [t.checkIn, fmtDate(booking.appointment_date as string, lang)],
    [t.checkOut, fmtDate(booking.check_out as string, lang)],
    [t.nights, String(nights)],
    ...(booking.guests ? [[t.guests, String(booking.guests)] as [string, string]] : []),
  ];

  return (
    <PayCard lang={lang} icon="🏠" title={biz?.name ? `${t.title} — ${biz.name}` : t.title} body={t.body}>
      <dl style={{ margin: "20px 0 0", padding: 16, borderRadius: 12, background: "#FAF5EC", textAlign: "start" }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", fontSize: 15 }}>
            <dt style={{ color: "#6B6257" }}>{k}</dt>
            <dd style={{ margin: 0, color: "#1E1A14", fontWeight: 600 }}>{v}</dd>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0 0", marginTop: 6, borderTop: "1px solid #EDE4D3", fontSize: 17 }}>
          <dt style={{ color: "#1E1A14", fontWeight: 700 }}>{t.total}</dt>
          <dd style={{ margin: 0, color: "#1E1A14", fontWeight: 800 }}>{amount}</dd>
        </div>
      </dl>

      {errorMsg && (
        <p role="alert" style={{ margin: "16px 0 0", padding: "10px 12px", borderRadius: 10, background: "#FDECEA", color: "#A3261B", fontSize: 14 }}>
          {errorMsg}
        </p>
      )}

      <form method="post" action="/api/public/pay-link/checkout" style={{ marginTop: 20 }}>
        <input type="hidden" name="token" value={link.token} />
        <button
          type="submit"
          style={{
            width: "100%", padding: "14px 24px", borderRadius: 9999, border: 0, cursor: "pointer",
            background: "#1E1A14", color: "#fff", fontSize: 16, fontWeight: 700,
          }}
        >
          {t.pay(amount)}
        </button>
      </form>
      <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6B6257" }}>{t.expires(expires)}</p>
      {biz?.name && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B6257" }}>
          {t.seller(biz.name, "")}
        </p>
      )}
      {biz?.slug && (
        <p style={{ margin: "4px 0 0", fontSize: 12 }}>
          <a href={`/${biz.slug}/legal/terms?lang=${lang}`} target="_blank" rel="noopener noreferrer" style={{ color: "#6B6257" }}>{t.terms}</a>
        </p>
      )}
    </PayCard>
  );
}
