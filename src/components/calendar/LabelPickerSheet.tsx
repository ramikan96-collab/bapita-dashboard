"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Label } from "@/types";

const LABEL_COLORS = [
  "#E53E3E", "#ED64A6", "#ED8936", "#ECC94B", "#F6E05E",
  "#9AE6B4", "#276749", "#63B3ED", "#3182CE",
  "#805AD5", "#B794F4", "#1A202C", "#718096", "#FFFFFF",
];

interface Props {
  bookingId: string;
  businessId: string;
  currentLabelId?: string | null;
  onSelect: (label: Label | null) => void;
  onClose: () => void;
}

type FormMode = { type: "new" } | { type: "edit"; label: Label };

export default function LabelPickerSheet({
  bookingId,
  businessId,
  currentLabelId,
  onSelect,
  onClose,
}: Props) {
  const supabase = createClient();
  const [labels, setLabels] = useState<Label[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [form, setForm] = useState<FormMode | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(LABEL_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    supabase
      .from("labels")
      .select("id, name, color")
      .eq("business_id", businessId)
      .order("created_at")
      .then(({ data }) => {
        setLabels((data as Label[]) ?? []);
        setFetchLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelect(label: Label | null) {
    setApplying(true);
    const { error } = await supabase
      .from("bookings")
      .update({ label_id: label?.id ?? null })
      .eq("id", bookingId);
    if (!error) {
      onSelect(label);
      onClose();
    }
    setApplying(false);
  }

  function openNew() {
    setForm({ type: "new" });
    setFormName("");
    setFormColor(LABEL_COLORS[0]);
    setDeleteConfirm(null);
  }

  function openEdit(label: Label) {
    setForm({ type: "edit", label });
    setFormName(label.name);
    setFormColor(label.color);
    setDeleteConfirm(null);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    if (form?.type === "new") {
      const { data, error } = await supabase
        .from("labels")
        .insert({ business_id: businessId, name: formName.trim(), color: formColor })
        .select("id, name, color")
        .single();
      if (!error && data) setLabels((prev) => [...prev, data as Label]);
    } else if (form?.type === "edit") {
      const { error } = await supabase
        .from("labels")
        .update({ name: formName.trim(), color: formColor })
        .eq("id", form.label.id);
      if (!error) {
        setLabels((prev) =>
          prev.map((l) =>
            l.id === (form as { type: "edit"; label: Label }).label.id
              ? { ...l, name: formName.trim(), color: formColor }
              : l
          )
        );
      }
    }
    setSaving(false);
    setForm(null);
  }

  async function handleDelete(labelId: string) {
    const { error } = await supabase.from("labels").delete().eq("id", labelId);
    if (!error) {
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      if (currentLabelId === labelId) onSelect(null);
    }
    setDeleteConfirm(null);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md rounded-t-2xl px-5 pt-3 pb-10 max-h-[80vh] flex flex-col"
        style={{ background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div
          className="w-10 h-1 rounded-full mx-auto mb-4 shrink-0"
          style={{ background: "var(--color-cream-2)" }}
        />

        <p
          className="text-center text-xs font-bold uppercase tracking-widest mb-4 shrink-0"
          style={{ color: "var(--color-muted)" }}
        >
          Label
        </p>

        <div className="overflow-y-auto flex-1 flex flex-col gap-1">
          {fetchLoading ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--color-muted)" }}>
              Loading…
            </p>
          ) : (
            <>
              {/* No label row */}
              <button
                onClick={() => handleSelect(null)}
                disabled={applying}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-start transition-opacity active:opacity-70 disabled:opacity-50"
                style={{
                  background: !currentLabelId ? "var(--color-cream)" : "transparent",
                }}
              >
                <span
                  className="w-5 h-5 rounded-full border-2 shrink-0"
                  style={{ borderColor: "var(--color-cream-2)" }}
                />
                <span
                  className="flex-1 text-sm font-semibold"
                  style={{ color: "var(--color-muted)" }}
                >
                  No label
                </span>
                {!currentLabelId && (
                  <span style={{ color: "var(--color-amber)", fontSize: 16 }}>✓</span>
                )}
              </button>

              {labels.map((label) => (
                <div key={label.id} className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelect(label)}
                    disabled={applying}
                    className="flex-1 flex items-center gap-3 px-3 py-3 rounded-xl text-start transition-opacity active:opacity-70 disabled:opacity-50"
                    style={{
                      background:
                        currentLabelId === label.id ? "var(--color-cream)" : "transparent",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ background: label.color, border: label.color === "#FFFFFF" ? "1px solid var(--color-cream-2)" : "none" }}
                    />
                    <span
                      className="flex-1 text-sm font-semibold"
                      style={{ color: "var(--color-dark)" }}
                    >
                      {label.name}
                    </span>
                    {currentLabelId === label.id && (
                      <span style={{ color: "var(--color-amber)", fontSize: 16 }}>✓</span>
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(label)}
                    className="px-2.5 py-1.5 text-xs rounded-lg font-semibold"
                    style={{ color: "var(--color-muted)", background: "var(--color-cream)" }}
                  >
                    Edit
                  </button>
                  {deleteConfirm === label.id ? (
                    <button
                      onClick={() => handleDelete(label.id)}
                      className="px-2.5 py-1.5 text-xs rounded-lg font-bold"
                      style={{ color: "#EF4444", background: "rgba(239,68,68,0.1)" }}
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(label.id)}
                      className="px-2.5 py-1.5 text-xs rounded-lg"
                      style={{ color: "var(--color-muted)", background: "var(--color-cream)" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* Inline create/edit form */}
              {form && (
                <div
                  className="mt-3 rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    background: "var(--color-cream)",
                    border: "1px solid var(--color-cream-2)",
                  }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {form.type === "new" ? "New label" : "Edit label"}
                  </p>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value.slice(0, 16))}
                    placeholder="Label name (max 16 chars)"
                    maxLength={16}
                    autoFocus
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none"
                    style={{
                      borderColor: "var(--color-cream-2)",
                      background: "#fff",
                      color: "var(--color-dark)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--color-cream-2)")}
                  />
                  <div className="grid grid-cols-7 gap-2">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setFormColor(c)}
                        className="w-8 h-8 rounded-full transition-transform active:scale-90"
                        style={{
                          background: c,
                          border:
                            formColor === c
                              ? "3px solid var(--color-dark)"
                              : c === "#FFFFFF"
                              ? "2px solid var(--color-cream-2)"
                              : "2px solid transparent",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setForm(null)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!formName.trim() || saving}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                      style={{ background: "var(--color-amber)", color: "#fff" }}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              )}

              {!form && (
                <button
                  onClick={openNew}
                  className="mt-2 w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: "var(--color-cream)", color: "var(--color-amber)" }}
                >
                  + New label
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
