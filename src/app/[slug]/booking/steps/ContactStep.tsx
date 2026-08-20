"use client";

import { BookingSummaryCard } from "../../components/BookingSummaryCard";
import type { Service } from "@/types";
import type { ContactInfo } from "../../hooks/useBookingFlow";
import { formatIls, type ResolvedPayment } from "@/lib/payments";

interface ContactT {
  title: string;
  name: string;
  namePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  confirm: string;
  confirming: string;
}

export interface PaymentT {
  dueNow: (amount: string) => string;
  balanceAtVenue: (amount: string) => string;
  payFull: (amount: string) => string;
  payDeposit: (amount: string, balance: string) => string;
  redirectNote: string;
  payAndConfirm: (amount: string) => string;
  redirecting: string;
  depositBadge: (amount: string) => string;
  prepaidBadge: string;
}

interface Props {
  service: Service;
  date: string;
  time: string;
  contact: ContactInfo;
  onChange: (patch: Partial<ContactInfo>) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
  accentColor: string;
  darkColor: string;
  bgColor: string;
  t: ContactT;
  /** Null when this service takes no online payment. */
  payment?: ResolvedPayment | null;
  payT: PaymentT;
}

export function ContactStep({ service, date, time, contact, onChange, onSubmit, submitting, error, accentColor, darkColor, bgColor, t, payment, payT }: Props) {
  const paying = !!payment && payment.mode !== "none";
  const dueLabel = paying
    ? (payment!.mode === "full"
        ? payT.payFull(formatIls(payment!.amountDue))
        : payT.payDeposit(formatIls(payment!.amountDue), formatIls(payment!.balanceDue)))
    : "";
  const canSubmit  = !!contact.name.trim() && contact.phone.trim().length >= 7 && !submitting;
  const isDark     = /^#[01]/.test(bgColor);
  const borderClr  = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
  const disabledBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)";
  const disabledTx = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.3)";

  const FIELDS = [
    { label: t.name,  key: "name"  as const, type: "text",  placeholder: t.namePlaceholder  },
    { label: t.phone, key: "phone" as const, type: "tel",   placeholder: t.phonePlaceholder },
    { label: t.email, key: "email" as const, type: "email", placeholder: t.emailPlaceholder },
  ] as const;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:darkColor }}>{t.title}</div>

      <BookingSummaryCard
        serviceName={service.name} duration={service.duration} price={service.price}
        date={date} time={time}
        accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
      />

      {paying && (
        <div style={{
          borderRadius:12, padding:"12px 14px",
          background:`${accentColor}14`, border:`1.5px solid ${accentColor}40`,
        }}>
          <div style={{ fontSize:14, fontWeight:800, color:darkColor }}>{dueLabel}</div>
          <div style={{ fontSize:12, color:darkColor, opacity:0.6, marginTop:4, lineHeight:1.5 }}>
            {payT.redirectNote}
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {FIELDS.map(({ label, key, type, placeholder }) => {
          const fieldId = `contact-${key}`;
          const required = key !== "email";
          return (
            <div key={key}>
              <label htmlFor={fieldId} style={{
                display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.05em", color:darkColor, opacity:0.5, marginBottom:6,
              }}>
                {label}
              </label>
              <input
                id={fieldId}
                type={type}
                value={contact[key]}
                onChange={e => onChange({ [key]: e.target.value })}
                placeholder={placeholder}
                required={required}
                aria-required={required}
                autoComplete={key === "name" ? "name" : key === "phone" ? "tel" : "email"}
                style={{
                  width:"100%", height:48, borderRadius:12,
                  border:`1.5px solid ${borderClr}`,
                  background: bgColor, fontSize:15, color:darkColor,
                  padding:"0 14px", outline:"none", fontFamily:"inherit",
                  boxSizing: "border-box",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = accentColor; }}
                onBlur={e  => { e.currentTarget.style.borderColor = borderClr; }}
              />
            </div>
          );
        })}
      </div>

      {error && <p role="alert" style={{ fontSize:13, color:"#EF4444", textAlign:"center" }}>{error}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{
          width:"100%", height:52, borderRadius:9999, border:"none",
          background: canSubmit ? accentColor : disabledBg,
          color: canSubmit ? "#fff" : disabledTx,
          fontSize:16, fontWeight:800, cursor: canSubmit ? "pointer" : "default",
          transition:"all 0.2s ease", fontFamily:"inherit",
        }}
      >
        {submitting
          ? (paying ? payT.redirecting : t.confirming)
          : (paying ? payT.payAndConfirm(formatIls(payment!.amountDue)) : t.confirm)}
      </button>
    </div>
  );
}
