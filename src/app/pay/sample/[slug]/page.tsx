import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { addDaysIso, nightsBetween, stayTotal, todayIso } from "@/lib/stay";
import { formatIls } from "@/lib/payments";
import { PayCard, type PayLang } from "../../PayResult";
import { COPY, fmtDate, PayLinkView } from "../../l/PayLinkView";

// Sample of a stay business's private pay page, for the host to check and for
// the clearing company's site review. Made-up dates, no booking row, no token,
// and the Pay button is disabled — it cannot start a charge.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment page (sample)",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function SamplePayPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang: qLang } = await searchParams;

  const supabase = createServiceClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, name, slug, business_type, default_lang")
    .eq("slug", slug)
    .single();
  if (!biz || biz.business_type !== "stay") {
    return <PayCard lang="en" icon="🔗" title={COPY.en.missingTitle} body={COPY.en.missingBody} />;
  }

  const lang: PayLang = qLang === "he" || (qLang !== "en" && biz.default_lang === "he") ? "he" : "en";
  const t = COPY[lang];

  const { data: unitRow } = await supabase
    .from("services")
    .select("name, name_he, price, weekend_price")
    .eq("business_id", biz.id)
    .eq("active", true)
    .order("name")
    .limit(1)
    .maybeSingle();

  if (!unitRow) {
    return <PayCard lang={lang} icon="🔗" title={t.missingTitle} body={t.missingBody} />;
  }

  const checkIn = addDaysIso(todayIso(), 14);
  const checkOut = addDaysIso(checkIn, 3);
  const total = stayTotal(unitRow, checkIn, checkOut);
  const unit = (lang === "he" && unitRow.name_he) || unitRow.name;
  const expires = fmtDate(addDaysIso(todayIso(), 2), lang);

  const rows: [string, string][] = [
    [t.unit, unit],
    [t.checkIn, fmtDate(checkIn, lang)],
    [t.checkOut, fmtDate(checkOut, lang)],
    [t.nights, String(nightsBetween(checkIn, checkOut))],
    [t.guests, "2"],
  ];

  return (
    <PayLinkView
      lang={lang}
      bizName={biz.name}
      bizSlug={biz.slug}
      rows={rows}
      amount={formatIls(total)}
      expires={expires}
      token={null}
    />
  );
}
