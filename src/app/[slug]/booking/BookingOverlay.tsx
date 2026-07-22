"use client";

import { useEffect } from "react";
import type { Business, Service } from "@/types";
import { useBookingFlow } from "../hooks/useBookingFlow";
import { useSlots }       from "../hooks/useSlots";
import { StaffStep }      from "./steps/StaffStep";
import { DateStep }       from "./steps/DateStep";
import { TimeStep }       from "./steps/TimeStep";
import { ContactStep }    from "./steps/ContactStep";
import { SuccessScreen }  from "./steps/SuccessScreen";
import { translations, type Lang } from "../translations";
import { track } from "@/lib/analytics/track";

interface Props {
  business: Business;
  services: Service[];
  initialService: Service | null;
  onClose: () => void;
  accentColor: string;
  darkColor: string;
  bgColor: string;
  lang?: Lang;
}

export function BookingOverlay({ business, services, initialService, onClose, accentColor, darkColor, bgColor, lang = "en" }: Props) {
  const t = translations[lang];
  const isDark     = /^#[01]/.test(bgColor);
  const cardBg     = isDark ? "rgba(255,255,255,0.07)" : "#fff";
  const borderClr  = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const dividerClr = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const btnBg      = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)";
  const dateLocale = lang === "he" ? "he-IL" : "en-US";

  const localize = (s: Service): Service =>
    lang === "he" && s.name_he ? { ...s, name: s.name_he } : s;
  const localizedServices = services.map(localize);
  const localizedInitial = initialService ? localize(initialService) : null;

  const staffMembers = business.staff_members ?? [];
  const staffChoice = !!business.allow_staff_choice && staffMembers.length > 0;

  const { state, setService, setStaff, setDate, setTime, setContact, goBack, submit } = useBookingFlow(localizedInitial, staffChoice);
  const { slots, loading: slotsLoading } = useSlots(
    business.id,
    state.date,
    state.service?.duration ?? null,
    state.service?.id ?? null,
    state.staffId
  );

  // Staff eligible for the chosen service (empty staff_ids = anyone).
  const eligibleStaff = state.service?.staff_ids?.length
    ? staffMembers.filter(m => state.service!.staff_ids!.includes(m.id))
    : staffMembers;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ─── Analytics (funnel) ───────────────────────────────────────────────────
  // Overlay opening = booking_started (covers all themes' CTAs). Step changes
  // log step_reached; the success step logs booking_completed. A chosen date
  // with zero availability logs no_slots (demand signal).
  const trackCtx = { businessId: business.id, slug: business.slug, status: business.status, lang };

  useEffect(() => {
    track("booking_started", trackCtx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.step === "success") track("booking_completed", trackCtx);
    else track("step_reached", trackCtx, { step: state.step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  useEffect(() => {
    if (state.step === "time" && state.date && !slotsLoading && slots.length === 0) {
      track("no_slots", trackCtx, { meta: { date: state.date } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, state.date, slotsLoading, slots.length]);

  const fromCard   = !!initialService;
  const stepOrder: string[] = [
    ...(fromCard ? [] : ["service"]),
    ...(staffChoice ? ["staff"] : []),
    "date", "time", "contact",
  ];
  const totalSteps = stepOrder.length;
  const stepNum = state.step === "success" ? totalSteps : (stepOrder.indexOf(state.step) + 1 || 1);
  const isFirst = stepOrder[0] === state.step;

  return (
    <>
      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .bap-overlay-sheet {
          position: fixed;
          inset-inline-start: 0;
          inset-inline-end: 0;
          bottom: 0;
          z-index: 101;
          border-radius: 20px 20px 0 0;
          max-height: 92svh;
          display: flex;
          flex-direction: column;
          animation: slideUpSheet 0.35s ease;
        }
        @media (min-width: 768px) {
          .bap-overlay-sheet {
            inset-inline-start: unset;
            inset-inline-end: unset;
            bottom: unset;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: min(440px, calc(100vw - 48px));
            max-height: 88svh;
            border-radius: 20px;
            animation: popIn 0.28s ease;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
      }} />

      {/* Sheet / Card */}
      <div className="bap-overlay-sheet" style={{ background: bgColor }}>
        {/* Header */}
        {state.step !== "success" && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${dividerClr}`,
            flexShrink: 0,
          }}>
            <button
              onClick={isFirst ? onClose : goBack}
              style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: btnBg, cursor: "pointer", fontSize: 18, color: darkColor, fontFamily: "inherit" }}
            >←</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: darkColor }}>{business.name}</div>
              <div style={{ fontSize: 12, color: darkColor, opacity: 0.45, marginTop: 2 }}>
                {t.overlay.stepOf(stepNum, totalSteps)}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: btnBg, cursor: "pointer", fontSize: 20, color: darkColor, fontFamily: "inherit" }}
            >×</button>
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 48px" }}>

          {state.step === "service" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: darkColor }}>{t.steps.service.title}</div>
              {services.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", fontSize: 14, color: darkColor, opacity: 0.45 }}>
                  {lang === "he" ? "אין שירותים זמינים כרגע" : "No services available at the moment"}
                </div>
              )}
              {localizedServices.map(s => (
                <button key={s.id} onClick={() => setService(s)} style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  border: `1.5px solid ${borderClr}`,
                  background: cardBg, cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  textAlign: "start", transition: "border-color 0.15s ease",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = borderClr; }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: darkColor }}>{s.name}</div>
                    <div style={{ fontSize: 13, color: darkColor, opacity: 0.5, marginTop: 2 }}>{s.duration} {t.min}</div>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: accentColor }}>₪{s.price}</div>
                </button>
              ))}
            </div>
          )}

          {state.step === "staff" && state.service && (
            <StaffStep
              staff={eligibleStaff}
              onSelect={setStaff}
              accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
              stepTitle={t.steps.staff.title}
              anyLabel={t.steps.staff.any}
            />
          )}

          {state.step === "date" && state.service && (
            <DateStep
              service={state.service} selectedDate={state.date} onSelect={setDate}
              businessHours={business.business_hours}
              accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
              stepTitle={t.steps.date.title}
              minLabel={t.min}
              calendarT={t.calendar}
            />
          )}

          {state.step === "time" && state.service && state.date && (
            <TimeStep
              service={state.service} date={state.date}
              slots={slots} selectedTime={state.time} onSelect={setTime}
              loading={slotsLoading}
              accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
              stepTitle={t.steps.time.title}
              dateLocale={dateLocale}
            />
          )}

          {state.step === "contact" && state.service && state.date && state.time && (
            <ContactStep
              service={state.service} date={state.date} time={state.time}
              contact={state.contact} onChange={setContact}
              onSubmit={() => submit(business.id, business.name, lang)}
              submitting={state.submitting} error={state.error}
              accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
              t={t.steps.contact}
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
              t={t.steps.success}
              dateLocale={dateLocale}
              minLabel={t.min}
            />
          )}
        </div>
      </div>
    </>
  );
}
