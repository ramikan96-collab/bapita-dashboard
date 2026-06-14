"use client";

import { useEffect } from "react";
import type { Business, Service } from "@/types";
import { useBookingFlow } from "../hooks/useBookingFlow";
import { useSlots } from "../hooks/useSlots";
import { DateStep } from "./steps/DateStep";
import { TimeStep } from "./steps/TimeStep";
import { ContactStep } from "./steps/ContactStep";
import { SuccessScreen } from "./steps/SuccessScreen";

interface Props {
  business: Business;
  services: Service[];
  initialService: Service | null;
  onClose: () => void;
  accentColor: string;
  darkColor: string;
  bgColor: string;
}

export function BookingOverlay({ business, services, initialService, onClose, accentColor, darkColor, bgColor }: Props) {
  const { state, setService, setDate, setTime, setContact, goBack, submit } = useBookingFlow(initialService);
  const { slots, loading: slotsLoading } = useSlots(
    business.id,
    state.date,
    state.service?.duration ?? null
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fromCard   = !!initialService;
  const totalSteps = fromCard ? 3 : 4;
  const STEP_NUM: Record<string, number> = fromCard
    ? { date:1, time:2, contact:3, success:3 }
    : { service:1, date:2, time:3, contact:4, success:4 };
  const stepNum = STEP_NUM[state.step] ?? 1;

  const isFirst = fromCard ? state.step === "date" : state.step === "service";

  return (
    <>
      <style>{`@keyframes slideUpSheet { from { transform:translateY(100%); } to { transform:translateY(0); } }`}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0,
        background:"rgba(0,0,0,0.5)",
        backdropFilter:"blur(4px)",
        zIndex:100,
      }} />

      {/* Sheet */}
      <div style={{
        position:"fixed", insetInlineStart:0, insetInlineEnd:0, bottom:0,
        zIndex:101, background:bgColor,
        borderRadius:"20px 20px 0 0",
        maxHeight:"92svh",
        display:"flex", flexDirection:"column",
        animation:"slideUpSheet 0.35s ease",
      }}>
        {/* Header (hidden on success) */}
        {state.step !== "success" && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"18px 20px 14px",
            borderBottom:`1px solid rgba(0,0,0,0.08)`,
            flexShrink:0,
          }}>
            <button
              onClick={isFirst ? onClose : goBack}
              style={{ width:36, height:36, borderRadius:8, border:"none", background:"rgba(0,0,0,0.06)", cursor:"pointer", fontSize:18, color:darkColor, fontFamily:"inherit" }}
            >←</button>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:800, color:darkColor }}>{business.name}</div>
              <div style={{ fontSize:12, color:darkColor, opacity:0.45, marginTop:2 }}>
                {stepNum} of {totalSteps}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width:36, height:36, borderRadius:8, border:"none", background:"rgba(0,0,0,0.06)", cursor:"pointer", fontSize:20, color:darkColor, fontFamily:"inherit" }}
            >×</button>
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 48px" }}>

          {state.step === "service" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:darkColor }}>Choose a service</div>
              {services.map(s => (
                <button key={s.id} onClick={() => setService(s)} style={{
                  width:"100%", padding:"14px 16px", borderRadius:12,
                  border:`1.5px solid rgba(0,0,0,0.1)`,
                  background:"#fff", cursor:"pointer",
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  textAlign:"left", transition:"border-color 0.15s ease",
                  fontFamily:"inherit",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; }}
                >
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:darkColor }}>{s.name}</div>
                    <div style={{ fontSize:13, color:darkColor, opacity:0.5, marginTop:2 }}>{s.duration} min</div>
                  </div>
                  <div style={{ fontSize:17, fontWeight:900, color:accentColor }}>₪{s.price}</div>
                </button>
              ))}
            </div>
          )}

          {state.step === "date" && state.service && (
            <DateStep
              service={state.service} selectedDate={state.date} onSelect={setDate}
              businessHours={business.business_hours}
              accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
            />
          )}

          {state.step === "time" && state.service && state.date && (
            <TimeStep
              service={state.service} date={state.date}
              slots={slots} selectedTime={state.time} onSelect={setTime}
              loading={slotsLoading}
              accentColor={accentColor} darkColor={darkColor}
            />
          )}

          {state.step === "contact" && state.service && state.date && state.time && (
            <ContactStep
              service={state.service} date={state.date} time={state.time}
              contact={state.contact} onChange={setContact}
              onSubmit={() => submit(business.id, business.name)}
              submitting={state.submitting} error={state.error}
              accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
            />
          )}

          {state.step === "success" && state.service && state.date && state.time && (
            <SuccessScreen
              service={state.service} date={state.date} time={state.time}
              customerName={state.contact.name}
              businessName={business.name}
              businessPhone={business.phone}
              businessAddress={business.address}
              accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
            />
          )}
        </div>
      </div>
    </>
  );
}
