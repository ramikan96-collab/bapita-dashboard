"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PayCard, BackLink, usePaymentStatus, type PayLang } from "../PayResult";

// Return page after a Green Invoice payment.
//
// It does NOT claim the booking is confirmed on arrival: the booking is settled
// server-side by the callback, so this page polls until it really is (and that
// same endpoint reconciles with Green Invoice, which rescues a paid booking when
// the callback never lands).

const COPY = {
  en: {
    waitTitle: "Confirming your payment…",
    waitBody: "Payment received. We're confirming your booking with the payment provider — this takes a few seconds.",
    okTitle: "Payment received",
    okBody: "Your booking is confirmed and an invoice has been sent to your email. You can close this window.",
    slowTitle: "Payment received",
    slowBody: "Your payment went through. Confirmation is taking longer than usual — the business will see your booking, and your invoice will arrive by email.",
    expiredTitle: "Booking not confirmed",
    expiredBody: "We could not confirm a payment for this booking, so the time slot was released. If you were charged, contact the business and they will sort it out.",
    back: "Back to booking page",
  },
  he: {
    waitTitle: "מאשרים את התשלום…",
    waitBody: "התשלום התקבל. אנחנו מאשרים את ההזמנה מול חברת הסליקה — זה לוקח כמה שניות.",
    okTitle: "התשלום התקבל",
    okBody: "ההזמנה אושרה וחשבונית נשלחה למייל שלך. אפשר לסגור את החלון.",
    slowTitle: "התשלום התקבל",
    slowBody: "התשלום עבר. האישור לוקח יותר זמן מהרגיל — העסק יראה את ההזמנה שלך והחשבונית תגיע במייל.",
    expiredTitle: "ההזמנה לא אושרה",
    expiredBody: "לא הצלחנו לאתר תשלום להזמנה הזו והתור שוחרר. אם חויבת, פנה לעסק והם יטפלו בזה.",
    back: "חזרה לעמוד העסק",
  },
} as const;

function SuccessInner() {
  const params = useSearchParams();
  const bookingId = params.get("b") || "";
  const slug = params.get("s") || "";
  const lang: PayLang = params.get("lang") === "he" ? "he" : "en";
  const t = COPY[lang];

  const { status, timedOut } = usePaymentStatus(bookingId);

  // No booking reference (someone opened the URL directly) — show the plain
  // acknowledgement rather than a misleading error.
  if (!bookingId) {
    return <PayCard lang={lang} icon="✅" title={t.okTitle} body={t.okBody}><BackLink slug={slug} label={t.back} /></PayCard>;
  }

  if (status === "paid" || status === "confirmed") {
    return <PayCard lang={lang} icon="✅" title={t.okTitle} body={t.okBody}><BackLink slug={slug} label={t.back} /></PayCard>;
  }

  if (status === "expired") {
    return <PayCard lang={lang} icon="⚠️" title={t.expiredTitle} body={t.expiredBody}><BackLink slug={slug} label={t.back} /></PayCard>;
  }

  if (timedOut) {
    return <PayCard lang={lang} icon="✅" title={t.slowTitle} body={t.slowBody}><BackLink slug={slug} label={t.back} /></PayCard>;
  }

  return <PayCard lang={lang} icon="⏳" title={t.waitTitle} body={t.waitBody} />;
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<PayCard lang="en" icon="⏳" title={COPY.en.waitTitle} body={COPY.en.waitBody} />}>
      <SuccessInner />
    </Suspense>
  );
}
