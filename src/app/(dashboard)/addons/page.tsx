"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

type AddonType = "whatsapp" | "stripe" | "google" | "social" | "ads";

interface Addon {
  id: string;
  type: AddonType;
  active: boolean;
  activated_at: string | null;
}

interface AddonConfig {
  name: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  waMsg: string;
}

const WA_NUMBER = "972501234567";

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

const ADDON_CATALOG: Record<AddonType, AddonConfig> = {
  whatsapp: {
    name: "WhatsApp Automations",
    description: "תזכורות הזמנה, אישורים וביקורות — נשלחים אוטומטית ב-WhatsApp.",
    price: "₪99/חודש",
    icon: <WhatsAppIcon />,
    waMsg: "היי, אני מעוניין להפעיל את תוסף ה-WhatsApp Automations",
  },
  stripe: {
    name: "תשלומים אונליין",
    description: "לקוחות משלמים ברגע שמזמינים. כולל מדיניות ביטול ופיקדון.",
    price: "₪49/חודש + 1.9%",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    ),
    waMsg: "היי, אני מעוניין להפעיל תשלומים אונליין דרך Stripe",
  },
  google: {
    name: "Google Business",
    description: "סנכרון פרופיל Google Business. הצג זמינות בזמן אמת ואסוף ביקורות.",
    price: "₪79/חודש",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    ),
    waMsg: "היי, אני מעוניין לסנכרן את Google Business",
  },
  social: {
    name: "רשתות חברתיות",
    description: "שתף פוסטים אוטומטית ב-Instagram ו-Facebook. הגדל את הנוכחות הדיגיטלית.",
    price: "₪69/חודש",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    ),
    waMsg: "היי, אני מעוניין בתוסף הרשתות החברתיות",
  },
  ads: {
    name: "ניהול מודעות",
    description: "קמפיינים ב-Google ו-Meta המנוהלים עבורך. יותר לקוחות, פחות טרחה.",
    price: "מחיר מותאם אישית",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
    waMsg: "היי, אני מעוניין בשירות ניהול מודעות",
  },
};

const ALL_TYPES: AddonType[] = ["whatsapp", "stripe", "google", "social", "ads"];

function contactUs(msg: string) {
  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/${WA_NUMBER}?text=${encoded}`, "_blank");
}

export default function AddonsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAddons() {
      if (!business) { setLoading(false); return; }

      const { data } = await supabase
        .from("addons")
        .select("*")
        .eq("business_id", business.id);

      if (!data || data.length === 0) {
        const defaults = ALL_TYPES.map((type) => ({
          business_id: business.id,
          type,
          active: false,
        }));
        const { data: newData } = await supabase
          .from("addons")
          .insert(defaults)
          .select();
        setAddons(newData || []);
      } else {
        // ensure all types exist in state (merge missing ones)
        const existing = new Set(data.map((a: Addon) => a.type));
        const missing = ALL_TYPES.filter((t) => !existing.has(t)).map((type) => ({
          business_id: business.id,
          type,
          active: false,
        }));
        if (missing.length) {
          const { data: added } = await supabase.from("addons").insert(missing).select();
          setAddons([...data, ...(added || [])]);
        } else {
          setAddons(data);
        }
      }
      setLoading(false);
    }
    fetchAddons();
  }, [business, supabase]);

  if (bizLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center"
        style={{ background: "var(--color-cream)" }}>
        <p className="text-[15px] text-muted mb-4">הגדר את העסק שלך תחילה בהגדרות</p>
        <a href="/settings" className="px-5 py-3 rounded-xl text-[15px] font-semibold text-white bg-amber">
          עבור להגדרות
        </a>
      </div>
    );
  }

  const activeAddons = addons.filter((a) => a.active);
  const inactiveAddons = addons.filter((a) => !a.active);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-[var(--color-cream-2)] bg-white">
        <h1 className="text-[28px] font-extrabold leading-tight text-dark">תוספים</h1>
        <p className="text-[15px] mt-1 text-muted">שדרג את העסק עם אינטגרציות חכמות</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Active */}
        {activeAddons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-dark uppercase tracking-wide">פעיל</span>
              <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white"
                style={{ background: "var(--color-amber)" }}>
                {activeAddons.length}
              </span>
            </div>
            {activeAddons.map((addon) => {
              const cfg = ADDON_CATALOG[addon.type as AddonType];
              if (!cfg) return null;
              return (
                <div
                  key={addon.id}
                  className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]"
                  style={{ borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--color-amber)" }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)" }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-bold text-dark">{cfg.name}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(232,146,10,0.15)", color: "#B86800" }}>
                          פעיל
                        </span>
                      </div>
                      <p className="text-[13px] text-muted mt-1 leading-relaxed">{cfg.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available */}
        {inactiveAddons.length > 0 && (
          <div className="space-y-3">
            <span className="text-[13px] font-semibold text-dark uppercase tracking-wide">
              {activeAddons.length > 0 ? "זמין להפעלה" : "כל התוספים"}
            </span>
            {inactiveAddons.map((addon) => {
              const cfg = ADDON_CATALOG[addon.type as AddonType];
              if (!cfg) return null;
              return (
                <div
                  key={addon.id}
                  className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "var(--color-cream)", color: "var(--color-muted)" }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-dark">{cfg.name}</div>
                      <p className="text-[13px] text-muted mt-1 leading-relaxed">{cfg.description}</p>
                      <div className="text-[13px] font-semibold mt-2" style={{ color: "var(--color-amber)" }}>
                        {cfg.price}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--color-cream-2)]">
                    <button
                      onClick={() => contactUs(cfg.waMsg)}
                      className="w-full py-2.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2
                        text-white bg-[#25D366] hover:bg-[#1da851] active:bg-[#18a349] transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                      </svg>
                      צור קשר להפעלה
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom add-on CTA */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--color-cream)", color: "var(--color-muted)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-dark">תוסף מותאם אישית?</div>
              <p className="text-[13px] text-muted mt-1">אנחנו בונים אינטגרציות לצרכים הספציפיים שלך.</p>
              <button
                onClick={() => contactUs("היי, אני צריך תוסף מותאם אישית")}
                className="mt-3 text-[13px] font-semibold transition-colors"
                style={{ color: "var(--color-amber)" }}
              >
                שוחח איתנו →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
