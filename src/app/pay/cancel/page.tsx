"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PayCard, BackLink, type PayLang } from "../PayResult";

// Return page when a Green Invoice payment is cancelled or fails. The pending
// booking holds its slot only until the hold window lapses; availability checks
// ignore it from that moment on, so the slot frees itself.

const COPY = {
  en: {
    title: "Payment cancelled",
    body: "Your booking was not completed because the payment did not go through. The time slot is free again — you can go back and try once more.",
    back: "Back to booking page",
  },
  he: {
    title: "התשלום בוטל",
    body: "ההזמנה לא הושלמה כי התשלום לא עבר. התור שוחרר — אפשר לחזור לעמוד העסק ולנסות שוב.",
    back: "חזרה לעמוד העסק",
  },
} as const;

function CancelInner() {
  const params = useSearchParams();
  const slug = params.get("s") || "";
  const lang: PayLang = params.get("lang") === "he" ? "he" : "en";
  const t = COPY[lang];

  return (
    <PayCard lang={lang} icon="⚠️" title={t.title} body={t.body}>
      <BackLink slug={slug} label={t.back} />
    </PayCard>
  );
}

export default function PayCancelPage() {
  return (
    <Suspense fallback={<PayCard lang="en" icon="⚠️" title={COPY.en.title} body={COPY.en.body} />}>
      <CancelInner />
    </Suspense>
  );
}
