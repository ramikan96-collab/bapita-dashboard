"use client";

import { BookingSummaryCard } from "../../components/BookingSummaryCard";
import type { Service } from "@/types";
import type { ContactInfo } from "../../hooks/useBookingFlow";

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
}

const FIELDS = [
  { label:"Full name *",      key:"name"  as const, type:"text",  placeholder:"Your name"     },
  { label:"Phone *",          key:"phone" as const, type:"tel",   placeholder:"05X-XXX-XXXX"  },
  { label:"Email (optional)", key:"email" as const, type:"email", placeholder:"you@example.com"},
] as const;

export function ContactStep({ service, date, time, contact, onChange, onSubmit, submitting, error, accentColor, darkColor, bgColor }: Props) {
  const canSubmit = !!contact.name.trim() && !!contact.phone.trim() && !submitting;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:darkColor }}>Your details</div>

      <BookingSummaryCard
        serviceName={service.name} duration={service.duration} price={service.price}
        date={date} time={time}
        accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
      />

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {FIELDS.map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label style={{
              display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.05em", color:darkColor, opacity:0.5, marginBottom:6,
            }}>
              {label}
            </label>
            <input
              type={type}
              value={contact[key]}
              onChange={e => onChange({ [key]: e.target.value })}
              placeholder={placeholder}
              style={{
                width:"100%", height:48, borderRadius:12,
                border:`1.5px solid rgba(0,0,0,0.12)`,
                background: bgColor, fontSize:15, color:darkColor,
                padding:"0 14px", outline:"none", fontFamily:"inherit",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = accentColor; }}
              onBlur={e  => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; }}
            />
          </div>
        ))}
      </div>

      {error && <p style={{ fontSize:13, color:"#EF4444", textAlign:"center" }}>{error}</p>}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{
          width:"100%", height:52, borderRadius:9999, border:"none",
          background: canSubmit ? accentColor : "rgba(0,0,0,0.1)",
          color: canSubmit ? "#fff" : "rgba(0,0,0,0.3)",
          fontSize:16, fontWeight:800, cursor: canSubmit ? "pointer" : "default",
          transition:"all 0.2s ease",
        }}
      >
        {submitting ? "Confirming…" : "Confirm Booking"}
      </button>
    </div>
  );
}
