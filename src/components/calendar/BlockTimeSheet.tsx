"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/i18n";
import { loadActiveStaff } from "@/lib/staff";
import type { BlockedTime, StaffMember } from "@/types";

export interface BlockDraft {
  id?: string;            // present → existing block (remove mode)
  business_id: string;
  block_date: string;     // yyyy-MM-dd
  start_time: string;     // HH:MM
  end_time: string;       // HH:MM
  label?: string | null;
  /** null/undefined = whole business; set = block just that staff member */
  staff_id?: string | null;
}

interface Props {
  draft: BlockDraft;
  onClose: () => void;
  onSaved: () => void;    // refetch blocked times
}

const hhmm = (t: string) => t.slice(0, 5);

export default function BlockTimeSheet({ draft, onClose, onSaved }: Props) {
  const { t } = useLang();
  const existing = Boolean(draft.id);
  const [start, setStart] = useState(hhmm(draft.start_time));
  const [end, setEnd] = useState(hhmm(draft.end_time));
  const [label, setLabel] = useState(draft.label ?? "");
  const [staffId, setStaffId] = useState<string | null>(draft.staff_id ?? null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    loadActiveStaff(supabase, draft.business_id).then(setStaff);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.business_id]);

  async function handleBlock() {
    if (end <= start) { setError(t("End time must be after start time")); return; }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("blocked_times").insert({
      business_id: draft.business_id,
      block_date: draft.block_date,
      start_time: start,
      end_time: end,
      label: label.trim() || null,
      staff_id: staffId ?? null,
    } satisfies Omit<BlockedTime, "id">);
    setSaving(false);
    if (error) { setError(t("Couldn't block time")); return; }
    onSaved();
    onClose();
  }

  async function handleRemove() {
    setSaving(true);
    const { error } = await supabase.from("blocked_times").delete().eq("id", draft.id!);
    setSaving(false);
    if (error) { setError(t("Couldn't remove block")); return; }
    onSaved();
    onClose();
  }

  const dateLabel = format(parseISO(draft.block_date), "EEEE, d MMM");
  const presets = ["Lunch", "Break", "Personal"];
  const blockedStaff = staff.find((s) => s.id === draft.staff_id);

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="fixed bottom-0 inset-x-0 z-[56] bg-white rounded-t-[20px] flex flex-col"
        style={{ boxShadow: "0 -4px 24px rgba(30,26,20,0.12)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-cream-2)" }} />
        </div>

        <div className="px-4 pb-3 border-b" style={{ borderColor: "var(--color-cream-2)" }}>
          <h2 className="text-[18px] font-bold" style={{ color: "var(--color-dark)" }}>
            {existing ? "Blocked time" : "Block time"}
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-muted)" }}>{dateLabel}</p>
        </div>

        <div className="px-4 py-4 overflow-y-auto">
          {existing ? (
            <div className="rounded-2xl p-4 mb-2" style={{ background: "var(--color-cream)" }}>
              <p className="text-[15px] font-semibold" style={{ color: "var(--color-dark)" }}>
                {draft.label || "Blocked"}
              </p>
              <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>
                {hhmm(draft.start_time)} – {hhmm(draft.end_time)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                {blockedStaff && (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: blockedStaff.color || "var(--color-amber)" }} />
                )}
                <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                  {blockedStaff ? blockedStaff.name : t("Whole business")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <Field label="Start">
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="h-12 px-3 rounded-[10px] border bg-white text-[15px] w-full outline-none"
                    style={{ borderColor: "var(--color-cream-2)", color: "var(--color-dark)" }}
                  />
                </Field>
                <Field label="End">
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="h-12 px-3 rounded-[10px] border bg-white text-[15px] w-full outline-none"
                    style={{ borderColor: "var(--color-cream-2)", color: "var(--color-dark)" }}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Label (optional)">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Lunch"
                    className="h-12 px-4 rounded-[10px] border bg-white text-[15px] w-full outline-none placeholder:text-[var(--color-muted)]"
                    style={{ borderColor: "var(--color-cream-2)", color: "var(--color-dark)" }}
                  />
                </Field>
                <div className="flex gap-2 mt-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => setLabel(p)}
                      className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors"
                      style={{
                        background: label === p ? "var(--color-amber)" : "var(--color-cream-2)",
                        color: label === p ? "var(--color-surface)" : "var(--color-muted)",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {staff.length > 0 && (
                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)", marginBottom: 8 }}>
                    {t("Who")}
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setStaffId(null)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999,
                        border: `1.5px solid ${staffId === null ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                        background: staffId === null ? "var(--amber-soft)" : "transparent", cursor: "pointer", fontSize: 13,
                        color: "var(--color-dark)", fontFamily: "inherit",
                      }}
                    >
                      {t("Whole business")}
                    </button>
                    {staff.map((s) => {
                      const on = staffId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStaffId(s.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999,
                            border: `1.5px solid ${on ? "var(--color-amber)" : "var(--color-cream-2)"}`,
                            background: on ? "var(--amber-soft)" : "transparent", cursor: "pointer", fontSize: 13,
                            color: "var(--color-dark)", fontFamily: "inherit",
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color || "var(--color-amber)" }} />
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className="text-[12px] mt-3" style={{ color: "var(--color-cancelled)" }}>{error}</p>}
        </div>

        <div className="px-4 pb-8 pt-2 flex gap-3 border-t" style={{ borderColor: "var(--color-cream-2)" }}>
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl text-[15px] font-medium border transition-colors"
            style={{ borderColor: "var(--color-cream-2)", color: "var(--color-dark)" }}
          >
            Cancel
          </button>
          {existing ? (
            <button
              onClick={handleRemove}
              disabled={saving}
              className="flex-1 py-3.5 rounded-xl text-[15px] font-semibold border transition-colors disabled:opacity-50"
              style={{ borderColor: "rgba(239,68,68,0.3)", color: "var(--color-cancelled)" }}
            >
              {saving ? "Removing…" : "Remove block"}
            </button>
          ) : (
            <button
              onClick={handleBlock}
              disabled={saving}
              className="flex-1 py-3.5 rounded-xl text-[15px] font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--color-amber)" }}
            >
              {saving ? "Blocking…" : "Block"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <label className="text-[13px] font-medium" style={{ color: "var(--color-dark)" }}>{label}</label>
      {children}
    </div>
  );
}
