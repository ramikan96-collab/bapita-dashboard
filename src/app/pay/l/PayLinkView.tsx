import { PayCard, type PayLang } from "../PayResult";

// The payable view of a private pay link, shared by the real page
// (/pay/l/<token>) and the sample page (/pay/sample/<slug>). With token = null
// it is the sample: no hidden token, no form action, Pay button disabled, so
// it can never start a charge.

export const COPY = {
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
      terms: "Please confirm you accept the booking terms before paying.",
    } as Record<string, string>,
    expires: (d: string) => `Link valid until ${d}`,
    seller: (n: string, id: string) => `Seller: ${n}${id ? ` · Business ID ${id}` : ""}`,
    terms: "Booking terms and cancellations",
    sampleNote: "Sample page — this is how a guest's private payment page looks. No booking, no charge.",
    sampleButton: "Pay button (sample — no charge)",
    agree: ["I have read and accept the ", "booking terms and cancellation policy", ", and I am 18 or older."],
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
      terms: "יש לאשר את תנאי ההזמנה לפני התשלום.",
    } as Record<string, string>,
    expires: (d: string) => `הקישור בתוקף עד ${d}`,
    seller: (n: string, id: string) => `המוכר: ${n}${id ? ` · מספר עוסק ${id}` : ""}`,
    terms: "תנאי הזמנה וביטולים",
    sampleNote: "עמוד לדוגמה — כך נראה עמוד התשלום האישי שהאורח מקבל. אין הזמנה ואין חיוב.",
    sampleButton: "כפתור תשלום (דוגמה — ללא חיוב)",
    agree: ["קראתי ואני מאשר/ת את ", "תנאי ההזמנה ומדיניות הביטולים", ", ואני בן/בת 18 ומעלה."],
  },
};

export function fmtDate(iso: string, lang: PayLang): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", {
    weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem",
  });
}

export function PayLinkView({ lang, bizName, bizSlug, rows, amount, expires, errorMsg, token }: {
  lang: PayLang;
  bizName: string | null;
  bizSlug: string | null;
  rows: [string, string][];
  amount: string;
  expires: string;
  errorMsg?: string;
  token: string | null;
}) {
  const t = COPY[lang];
  const sample = token === null;
  return (
    <PayCard lang={lang} icon="🏠" title={bizName ? `${t.title} — ${bizName}` : t.title} body={t.body}>
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

      {sample && (
        <p role="note" style={{ margin: "16px 0 0", padding: "10px 12px", borderRadius: 10, background: "#FFF4D6", color: "#6B4E00", fontSize: 14 }}>
          {t.sampleNote}
        </p>
      )}

      <form method="post" action={sample ? undefined : "/api/public/pay-link/checkout"} style={{ marginTop: 20 }}>
        {token && <input type="hidden" name="token" value={token} />}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14, fontSize: 14, color: "#1E1A14", textAlign: "start", cursor: "pointer" }}>
          <input type="checkbox" name="agree" value="1" required style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
          <span>
            {t.agree[0]}
            {bizSlug
              ? <a href={`/${bizSlug}/legal/terms?lang=${lang}`} target="_blank" rel="noopener noreferrer" style={{ color: "#1E1A14", textDecoration: "underline" }}>{t.agree[1]}</a>
              : t.agree[1]}
            {t.agree[2]}
          </span>
        </label>
        <button
          type="submit"
          disabled={sample}
          style={{
            width: "100%", padding: "14px 24px", borderRadius: 9999, border: 0, cursor: sample ? "not-allowed" : "pointer",
            background: "#1E1A14", color: "#fff", fontSize: 16, fontWeight: 700, opacity: sample ? 0.5 : 1,
          }}
        >
          {sample ? t.sampleButton : t.pay(amount)}
        </button>
      </form>
      <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6B6257" }}>{t.expires(expires)}</p>
      {bizName && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B6257" }}>
          {t.seller(bizName, "")}
        </p>
      )}
      {bizSlug && (
        <p style={{ margin: "4px 0 0", fontSize: 12 }}>
          <a href={`/${bizSlug}/legal/terms?lang=${lang}`} target="_blank" rel="noopener noreferrer" style={{ color: "#6B6257" }}>{t.terms}</a>
        </p>
      )}
    </PayCard>
  );
}
