import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { linkState, loadLinkByToken } from "@/lib/payment-links";
import { nightsBetween } from "@/lib/stay";
import { formatIls } from "@/lib/payments";
import { PayCard, type PayLang } from "../../PayResult";
import { COPY, fmtDate, PayLinkView } from "../PayLinkView";

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
    <PayLinkView
      lang={lang}
      bizName={biz?.name ?? null}
      bizSlug={biz?.slug ?? null}
      rows={rows}
      amount={amount}
      expires={expires}
      errorMsg={errorMsg}
      token={link.token}
    />
  );
}
