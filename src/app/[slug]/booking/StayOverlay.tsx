"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Business, Service } from "@/types";
import { StayRangePicker } from "../components/StayRangePicker";
import { translations, type Lang } from "../translations";
import { track } from "@/lib/analytics/track";
import { addDaysIso, nightsBetween, stayTotal, validateStayRequest } from "@/lib/stay";

interface Props {
  business: Business;
  unit: Service;
  /** Photos for this unit, from business.gallery_groups; empty falls back to the hero. */
  photos: string[];
  onClose: () => void;
  accentColor: string;
  darkColor: string;
  bgColor: string;
  lang?: Lang;
}

interface Availability {
  nights: string[];
  minNights: number;
  maxGuests: number | null;
}

type Step = "checkin" | "checkout" | "guests" | "contact" | "success";

const STEP_ORDER: Step[] = ["checkin", "checkout", "guests", "contact"];

/**
 * Stay request modal, one decision per screen.
 *
 * Deliberately mirrors BookingOverlay's step chrome — back arrow, "2 of 4", one
 * question at a time — so the appointment flow and the stay flow read as the
 * same product rather than two bolted-together booking widgets. On a phone it
 * also keeps the calendar above the fold, which one long form does not.
 *
 * Phase 1 creates a PENDING request, never a confirmed reservation, and the
 * copy on the last step says so.
 */
export function StayOverlay({
  business, unit, photos, onClose, accentColor, darkColor, bgColor, lang = "en",
}: Props) {
  const t = translations[lang];
  const isDark = /^#[01]/.test(bgColor);
  const cardBg = isDark ? "rgba(255,255,255,0.07)" : "#fff";
  const borderClr = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const dividerClr = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const btnBg = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)";
  const dateLocale = lang === "he" ? "he-IL" : "en-US";

  const unitName = lang === "he" && unit.name_he ? unit.name_he : unit.name;
  const unitDesc = lang === "he" && unit.description_he ? unit.description_he : unit.description;

  const [step, setStep] = useState<Step>("checkin");
  const [avail, setAvail] = useState<Availability | null>(null);
  const [availLoading, setAvailLoading] = useState(true);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [photoIdx, setPhotoIdx] = useState(0);

  const trackCtx = { businessId: business.id, slug: business.slug, status: business.status, lang };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    track("booking_started", trackCtx, { meta: { unit: unit.id } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === "success") track("booking_completed", trackCtx, { meta: { unit: unit.id } });
    else track("step_reached", trackCtx, { step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/stay-availability?businessId=${business.id}&unitId=${unit.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAvail({
          nights: Array.isArray(d.nights) ? d.nights : [],
          minNights: Number(d.minNights) || 1,
          maxGuests: d.maxGuests ?? null,
        });
        setAvailLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Availability is an optimization, not the guard — the server revalidates
        // on submit. Failing open beats blocking a guest behind a fetch error.
        setAvail({ nights: [], minNights: unit.min_nights ?? 1, maxGuests: unit.max_guests ?? null });
        setAvailLoading(false);
      });
    return () => { cancelled = true; };
  }, [business.id, unit.id, unit.min_nights, unit.max_guests]);

  const unavailableSet = new Set(avail?.nights ?? []);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const total = stayTotal(unit.price, nights);
  const maxGuests = avail?.maxGuests ?? unit.max_guests ?? null;
  const minNights = avail?.minNights ?? unit.min_nights ?? 1;

  const stepNum = step === "success" ? STEP_ORDER.length : STEP_ORDER.indexOf(step) + 1;
  const isFirst = step === "checkin";

  /** Drops the range and returns to the first date step. */
  function clearDates() {
    setError("");
    setCheckIn(null);
    setCheckOut(null);
    setStep("checkin");
  }

  function goBack() {
    setError("");
    if (step === "contact") setStep("guests");
    else if (step === "guests") setStep("checkout");
    else if (step === "checkout") { setStep("checkin"); setCheckOut(null); }
  }

  /**
   * The picker is shared between both date steps. On the check-in step it only
   * ever reports a start; on the check-out step a tap on or before the current
   * check-in resets the start rather than erroring, which is the forgiving
   * behaviour every booking site has trained guests to expect.
   */
  function onPickDates(ci: string | null, co: string | null) {
    setError("");
    setCheckIn(ci);
    setCheckOut(co);

    if (step === "checkin" && ci && !co) { setStep("checkout"); return; }

    if (step === "checkout" && ci && co) {
      const invalid = validateStayRequest({
        start: ci, end: co, guests,
        unit: { min_nights: minNights, max_guests: maxGuests },
        // Night conflicts are impossible here: the picker refuses to build a
        // range spanning a blocked night. This only checks the rules it cannot
        // express, such as the minimum stay.
        unavailable: [],
      });
      if (invalid) { setError(t.stay.errors[invalid]); setCheckOut(null); return; }
      setStep("guests");
    }
  }

  const canSubmit =
    !!checkIn && !!checkOut && nights >= minNights &&
    name.trim().length > 1 && phone.trim().length > 5 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          businessName: business.name,
          serviceId: unit.id,
          date: checkIn,
          checkOut,
          guests,
          time: "15:00", // ignored server-side for stays; keeps the payload shape stable
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || null,
          notes: notes.trim() || null,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || t.stay.errors.unavailable);
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setStep("success");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" });

  const label: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: darkColor, marginBottom: 14, display: "block" };
  const fieldLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: darkColor, opacity: 0.6, marginBottom: 6, display: "block" };
  const input: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1.5px solid ${borderClr}`, background: cardBg, color: darkColor,
    fontSize: 15, fontFamily: "inherit", outline: "none",
  };
  const primaryBtn = (enabled: boolean): React.CSSProperties => ({
    width: "100%", padding: "16px", borderRadius: 12, border: "none",
    background: enabled ? accentColor : btnBg,
    color: enabled ? "#fff" : `${darkColor}66`,
    fontSize: 16, fontWeight: 800,
    cursor: enabled ? "pointer" : "default",
    fontFamily: "inherit", transition: "background 0.15s ease",
  });

  return (
    <>
      <style>{`
        @keyframes stiSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes stiPopIn { from { opacity:0; transform: translate(-50%,-50%) scale(0.96); } to { opacity:1; transform: translate(-50%,-50%) scale(1); } }
        .bap-stay-sheet {
          position: fixed; inset-inline-start: 0; inset-inline-end: 0; bottom: 0;
          z-index: 101; border-radius: 20px 20px 0 0; max-height: 92svh;
          display: flex; flex-direction: column; animation: stiSlideUp 0.35s ease;
        }
        @media (min-width: 768px) {
          .bap-stay-sheet {
            inset-inline-start: unset; inset-inline-end: unset; bottom: unset;
            top: 50%; left: 50%; transform: translate(-50%,-50%);
            width: min(460px, calc(100vw - 48px)); max-height: 88svh;
            border-radius: 20px; animation: stiPopIn 0.28s ease;
          }
        }
        @media (prefers-reduced-motion: reduce) { .bap-stay-sheet { animation: none; } }
      `}</style>

      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)", zIndex: 100,
      }} />

      <div className="bap-stay-sheet" style={{ background: bgColor }}>
        {/* Header — same shape as the appointment overlay */}
        {step !== "success" && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px 14px", borderBottom: `1px solid ${dividerClr}`, flexShrink: 0,
          }}>
            <button
              onClick={isFirst ? onClose : goBack}
              aria-label={isFirst ? "Close" : "Back"}
              style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: btnBg, cursor: "pointer", fontSize: 18, color: darkColor, fontFamily: "inherit" }}
            >←</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: darkColor }}>{unitName}</div>
              <div style={{ fontSize: 12, color: darkColor, opacity: 0.45, marginTop: 2 }}>
                {t.overlay.stepOf(stepNum, STEP_ORDER.length)}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: btnBg, cursor: "pointer", fontSize: 20, color: darkColor, fontFamily: "inherit" }}
            >×</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px" }}>

          {/* ── 1. Check in ─────────────────────────────────────────────── */}
          {step === "checkin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {photos.length > 0 && (
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 14, overflow: "hidden", background: btnBg }}>
                  <Image
                    src={photos[photoIdx]}
                    alt={`${unitName} — ${photoIdx + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 460px"
                    style={{ objectFit: "cover" }}
                    priority
                  />
                  {photos.length > 1 && (
                    <>
                      <PhotoNav side="start" onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)} />
                      <PhotoNav side="end" onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)} />
                      <div style={{
                        position: "absolute", bottom: 10, insetInlineEnd: 10,
                        background: "rgba(0,0,0,0.55)", color: "#fff",
                        fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 20,
                      }}>{photoIdx + 1} / {photos.length}</div>
                    </>
                  )}
                </div>
              )}

              {unitDesc && (
                <p style={{ fontSize: 14, lineHeight: 1.6, color: darkColor, opacity: 0.7, margin: 0 }}>{unitDesc}</p>
              )}

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: accentColor }}>
                  ₪{unit.price}
                  <span style={{ fontSize: 13, fontWeight: 500, color: darkColor, opacity: 0.5 }}> / {t.stay.perNight}</span>
                </span>
                {maxGuests ? <span style={{ fontSize: 13, color: darkColor, opacity: 0.5 }}>{t.stay.sleeps(maxGuests)}</span> : null}
              </div>

              <div>
                <span style={label}>{t.stay.pickCheckIn}</span>
                <StayRangePicker
                  checkIn={null}
                  checkOut={null}
                  unavailable={unavailableSet}
                  onChange={onPickDates}
                  accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
                  calendarT={t.calendar}
                  nightsLabel={t.stay.nights}
                  loading={availLoading}
                />
                {minNights > 1 && (
                  <p style={{ marginTop: 10, fontSize: 12, color: darkColor, opacity: 0.5, textAlign: "center" }}>
                    {t.stay.minNights(minNights)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── 2. Check out ────────────────────────────────────────────── */}
          {step === "checkout" && checkIn && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: cardBg, border: `1px solid ${borderClr}`, borderRadius: 12, padding: "12px 16px" }}>
                <Row k={t.stay.checkIn} v={fmtDate(checkIn)} darkColor={darkColor} bold />
              </div>

              <div>
                <span style={label}>{t.stay.pickCheckOutFrom(fmtDate(checkIn))}</span>
                <StayRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  unavailable={unavailableSet}
                  onChange={onPickDates}
                  accentColor={accentColor} darkColor={darkColor} bgColor={bgColor}
                  calendarT={t.calendar}
                  nightsLabel={t.stay.nights}
                  loading={availLoading}
                />
                <p style={{ marginTop: 10, fontSize: 12, color: darkColor, opacity: 0.5, textAlign: "center" }}>
                  {t.stay.earliestCheckOut(fmtDate(addDaysIso(checkIn, minNights)))}
                  {minNights > 1 ? ` · ${t.stay.minNights(minNights)}` : ""}
                </p>
                <button
                  type="button"
                  onClick={clearDates}
                  style={{
                    display: "block", margin: "12px auto 0", background: "none", border: "none",
                    padding: "6px 8px", color: darkColor, opacity: 0.55, fontSize: 13, fontWeight: 600,
                    textDecoration: "underline", cursor: "pointer", fontFamily: "inherit",
                  }}
                >{t.stay.clearDates}</button>
              </div>

              {error && <div style={{ fontSize: 13, color: "#EF4444", fontWeight: 600 }}>{error}</div>}
            </div>
          )}

          {/* ── 3. Guests ───────────────────────────────────────────────── */}
          {step === "guests" && checkIn && checkOut && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ background: cardBg, border: `1px solid ${borderClr}`, borderRadius: 12, padding: 16 }}>
                <Row k={t.stay.checkIn} v={fmtDate(checkIn)} darkColor={darkColor} />
                <Row k={t.stay.checkOut} v={fmtDate(checkOut)} darkColor={darkColor} />
                <div style={{ height: 1, background: dividerClr, margin: "10px 0" }} />
                <Row k={`₪${unit.price} × ${t.stay.nights(nights)}`} v={`₪${total}`} darkColor={darkColor} bold />
              </div>

              <div>
                <span style={label}>{t.stay.guests}{maxGuests ? ` · ${t.stay.sleeps(maxGuests)}` : ""}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <Stepper label="−" onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} bg={btnBg} color={darkColor} />
                  <span style={{ fontSize: 20, fontWeight: 800, color: darkColor, minWidth: 28, textAlign: "center" }}>{guests}</span>
                  <Stepper label="+" onClick={() => setGuests((g) => (maxGuests ? Math.min(maxGuests, g + 1) : g + 1))} disabled={!!maxGuests && guests >= maxGuests} bg={btnBg} color={darkColor} />
                </div>
              </div>

              <button onClick={() => setStep("contact")} style={primaryBtn(true)}>
                {lang === "he" ? "המשך" : "Continue"}
              </button>
            </div>
          )}

          {/* ── 4. Your details ─────────────────────────────────────────── */}
          {step === "contact" && checkIn && checkOut && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: cardBg, border: `1px solid ${borderClr}`, borderRadius: 12, padding: 16 }}>
                <Row k={t.stay.checkIn} v={fmtDate(checkIn)} darkColor={darkColor} />
                <Row k={t.stay.checkOut} v={fmtDate(checkOut)} darkColor={darkColor} />
                <Row k={t.stay.guests} v={String(guests)} darkColor={darkColor} />
                <div style={{ height: 1, background: dividerClr, margin: "10px 0" }} />
                <Row k={t.stay.total} v={`₪${total}`} darkColor={darkColor} bold />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <span style={fieldLabel}>{t.steps.contact.name}</span>
                  <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.steps.contact.namePlaceholder} autoComplete="name" />
                </div>
                <div>
                  <span style={fieldLabel}>{t.steps.contact.phone}</span>
                  <input style={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.steps.contact.phonePlaceholder} inputMode="tel" autoComplete="tel" />
                </div>
                <div>
                  <span style={fieldLabel}>{t.steps.contact.email}</span>
                  <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.steps.contact.emailPlaceholder} inputMode="email" autoComplete="email" />
                </div>
                <div>
                  <span style={fieldLabel}>{lang === "he" ? "הערות (רשות)" : "Notes (optional)"}</span>
                  <textarea
                    style={{ ...input, minHeight: 68, resize: "vertical" }}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={lang === "he" ? "שעת הגעה, בקשות מיוחדות…" : "Arrival time, special requests…"}
                  />
                </div>
              </div>

              {error && <div style={{ fontSize: 13, color: "#EF4444", fontWeight: 600 }}>{error}</div>}

              <div>
                <button onClick={submit} disabled={!canSubmit} style={primaryBtn(canSubmit)}>
                  {submitting ? t.stay.requesting : t.stay.request}
                </button>
                <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, color: darkColor, opacity: 0.5, textAlign: "center" }}>
                  {t.stay.notice}
                </p>
              </div>
            </div>
          )}

          {/* ── Success ─────────────────────────────────────────────────── */}
          {step === "success" && checkIn && checkOut && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 12, color: accentColor }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: darkColor, marginBottom: 8 }}>
                {t.stay.requestedTitle}
              </div>
              <p style={{ fontSize: 14, color: darkColor, opacity: 0.6, lineHeight: 1.6, margin: "0 0 24px" }}>
                {t.stay.requestedBody(name.trim().split(" ")[0])}
              </p>
              <div style={{ background: cardBg, border: `1px solid ${borderClr}`, borderRadius: 12, padding: 16, textAlign: "start" }}>
                <Row k={unitName} v="" darkColor={darkColor} bold />
                <Row k={t.stay.checkIn} v={fmtDate(checkIn)} darkColor={darkColor} />
                <Row k={t.stay.checkOut} v={fmtDate(checkOut)} darkColor={darkColor} />
                <Row k={t.stay.guests} v={String(guests)} darkColor={darkColor} />
                <Row k={t.stay.total} v={`₪${total}`} darkColor={darkColor} bold />
              </div>
              <button onClick={onClose} style={{ ...primaryBtn(true), marginTop: 20 }}>
                {lang === "he" ? "סגירה" : "Done"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ k, v, darkColor, bold }: { k: string; v: string; darkColor: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, marginBottom: 6 }}>
      <span style={{ color: darkColor, opacity: bold ? 0.9 : 0.6, fontWeight: bold ? 800 : 400 }}>{k}</span>
      <span style={{ color: darkColor, fontWeight: bold ? 800 : 600 }}>{v}</span>
    </div>
  );
}

function Stepper({ label, onClick, disabled, bg, color }: { label: string; onClick: () => void; disabled: boolean; bg: string; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === "+" ? "Add guest" : "Remove guest"}
      style={{
        width: 42, height: 42, borderRadius: "50%", border: "none", background: bg,
        color, fontSize: 20, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1, fontFamily: "inherit",
      }}
    >{label}</button>
  );
}

function PhotoNav({ side, onClick }: { side: "start" | "end"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "start" ? "Previous photo" : "Next photo"}
      style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        [side === "start" ? "insetInlineStart" : "insetInlineEnd"]: 10,
        width: 32, height: 32, borderRadius: "50%", border: "none",
        background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 16,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      } as React.CSSProperties}
    >{side === "start" ? "‹" : "›"}</button>
  );
}
