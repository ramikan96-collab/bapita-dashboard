"use client";

import { useState } from "react";
import { formatIls, type ResolvedPayment } from "@/lib/payments";

export interface DisclosureT {
  seller: string;
  businessId: string;
  details: string;
  hide: string;
  totalPrice: string;
  dueNowLabel: string;
  atVenueLabel: string;
  cancellationTitle: string;
  cancellationDefault: string;
  processorNote: string;
}

interface Props {
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  businessIdNumber: string | null;
  cancellationPolicy: string | null;
  payment: ResolvedPayment;
  accentColor: string;
  darkColor: string;
  t: DisclosureT;
}

/**
 * Israeli distance-sale disclosure (מכר מרחוק), shown at the point of payment.
 * The business is the seller of record for this transaction (see terms) — this
 * surfaces who is being paid, the full price breakdown, and where cancellation
 * terms live, before the customer taps pay.
 */
export function PaymentDisclosure({ businessName, businessAddress, businessPhone, businessIdNumber, cancellationPolicy, payment, accentColor, darkColor, t }: Props) {
  const [open, setOpen] = useState(false);
  const sellerLine = [businessName, businessAddress, businessPhone].filter(Boolean).join(" · ");
  const cancellationText = cancellationPolicy?.trim() || t.cancellationDefault;

  return (
    <div style={{ borderTop: `1px solid ${darkColor}1A`, marginTop: 10, paddingTop: 10 }}>
      <div style={{ fontSize: 12, color: darkColor, opacity: 0.7, lineHeight: 1.5 }}>
        {t.seller}: <strong style={{ opacity: 1 }}>{sellerLine}</strong>
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="payment-disclosure-panel"
        style={{
          background: "none", border: "none", padding: 0, marginTop: 6, font: "inherit",
          fontSize: 12, color: accentColor, fontWeight: 700, cursor: "pointer",
          textDecoration: "underline", textUnderlineOffset: 2,
        }}
      >
        {open ? t.hide : t.details}
      </button>

      {open && (
        <div id="payment-disclosure-panel" style={{ marginTop: 10, fontSize: 12.5, color: darkColor, opacity: 0.85, lineHeight: 1.6, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 4 }}>
            {businessIdNumber && <Row label={t.businessId} value={businessIdNumber} />}
            <Row label={t.totalPrice} value={formatIls(payment.price)} />
            <Row label={t.dueNowLabel} value={formatIls(payment.amountDue)} />
            {payment.balanceDue > 0 && <Row label={t.atVenueLabel} value={formatIls(payment.balanceDue)} />}
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.cancellationTitle}</div>
            <p style={{ margin: 0 }}>{cancellationText}</p>
          </div>

          <p style={{ margin: 0, opacity: 0.8 }}>{t.processorNote}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
