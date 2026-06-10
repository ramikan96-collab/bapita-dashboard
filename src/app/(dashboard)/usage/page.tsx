"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

type AddonType = "whatsapp" | "stripe" | "google" | "social" | "ads";

interface Addon {
  id: string;
  type: AddonType;
  active: boolean;
}

interface AddonStats {
  whatsapp?: { messages_sent: number; reminders: number; reviews_requested: number };
  stripe?: { payments_count: number; volume: number; payouts: number };
  google?: { profile_views: number; reviews_count: number };
  social?: { posts_shared: number; reach: number };
  ads?: { impressions: number; clicks: number; spend: number };
}

const ADDON_META: Record<AddonType, { name: string; icon: React.ReactNode; color: string }> = {
  whatsapp: {
    name: "WhatsApp Automations",
    color: "#25D366",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
      </svg>
    ),
  },
  stripe: {
    name: "תשלומים אונליין",
    color: "#635BFF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    ),
  },
  google: {
    name: "Google Business",
    color: "#4285F4",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    ),
  },
  social: {
    name: "רשתות חברתיות",
    color: "#E1306C",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    ),
  },
  ads: {
    name: "ניהול מודעות",
    color: "#FF6B35",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
  },
};

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--color-cream-2)] last:border-0">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="text-[15px] font-semibold text-dark">{value}</span>
    </div>
  );
}

function InactiveCard({ type }: { type: AddonType }) {
  const meta = ADDON_META[type];
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-cream)", color: "var(--color-muted)" }}>
          {meta.icon}
        </div>
        <span className="text-[15px] font-bold text-dark">{meta.name}</span>
      </div>
      <div className="py-4 text-center rounded-xl" style={{ background: "var(--color-cream)" }}>
        <p className="text-[13px] text-muted">
          הפעל את <span className="font-semibold text-dark">{meta.name}</span> כדי לראות נתונים
        </p>
        <a href="/addons" className="inline-block mt-2 text-[13px] font-semibold"
          style={{ color: "var(--color-amber)" }}>
          עבור לתוספים →
        </a>
      </div>
    </div>
  );
}

function WhatsAppStats({ stats }: { stats: AddonStats["whatsapp"] }) {
  if (!stats) return null;
  return (
    <>
      <StatRow label="הודעות נשלחו" value={stats.messages_sent.toLocaleString()} />
      <StatRow label="תזכורות" value={stats.reminders.toLocaleString()} />
      <StatRow label="בקשות ביקורת" value={stats.reviews_requested.toLocaleString()} />
    </>
  );
}

function StripeStats({ stats }: { stats: AddonStats["stripe"] }) {
  if (!stats) return null;
  return (
    <>
      <StatRow label="עסקאות" value={stats.payments_count.toLocaleString()} />
      <StatRow label="היקף תשלומים" value={`₪${stats.volume.toLocaleString()}`} />
      <StatRow label="תשלומים שהתקבלו" value={`₪${stats.payouts.toLocaleString()}`} />
    </>
  );
}

function GoogleStats({ stats }: { stats: AddonStats["google"] }) {
  if (!stats) return null;
  return (
    <>
      <StatRow label="צפיות בפרופיל" value={stats.profile_views.toLocaleString()} />
      <StatRow label="ביקורות שנאספו" value={stats.reviews_count.toLocaleString()} />
    </>
  );
}

function SocialStats({ stats }: { stats: AddonStats["social"] }) {
  if (!stats) return null;
  return (
    <>
      <StatRow label="פוסטים שפורסמו" value={stats.posts_shared.toLocaleString()} />
      <StatRow label="טווח הגעה" value={stats.reach.toLocaleString()} />
    </>
  );
}

function AdsStats({ stats }: { stats: AddonStats["ads"] }) {
  if (!stats) return null;
  return (
    <>
      <StatRow label="חשיפות" value={stats.impressions.toLocaleString()} />
      <StatRow label="קליקים" value={stats.clicks.toLocaleString()} />
      <StatRow label="הוצאה" value={`₪${stats.spend.toLocaleString()}`} />
    </>
  );
}

export default function UsagePage() {
  const { business, loading: bizLoading } = useBusiness();
  const supabase = createClient();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [stats] = useState<AddonStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!business) { setLoading(false); return; }
      const { data } = await supabase
        .from("addons")
        .select("id, type, active")
        .eq("business_id", business.id);
      setAddons(data || []);
      setLoading(false);
    }
    load();
  }, [business, supabase]);

  if (bizLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--color-cream)" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const ORDER: AddonType[] = ["whatsapp", "stripe", "google", "social", "ads"];

  // Build a map by type for easy lookup
  const addonByType = Object.fromEntries(addons.map((a) => [a.type, a])) as Record<AddonType, Addon | undefined>;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-cream)" }}>
      <div className="shrink-0 px-4 pt-5 pb-4 border-b border-[var(--color-cream-2)] bg-white">
        <h1 className="text-[28px] font-extrabold leading-tight text-dark">שימוש</h1>
        <p className="text-[15px] mt-1 text-muted">נתוני תוספים פעילים</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {ORDER.map((type) => {
          const addon = addonByType[type];
          const meta = ADDON_META[type];

          if (!addon || !addon.active) {
            return <InactiveCard key={type} type={type} />;
          }

          return (
            <div key={type} className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(30,26,20,0.06),0_2px_8px_rgba(30,26,20,0.05)]">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--color-cream-2)]">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${meta.color}18`, color: meta.color }}>
                  {meta.icon}
                </div>
                <span className="text-[15px] font-bold text-dark flex-1">{meta.name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(232,146,10,0.15)", color: "#B86800" }}>
                  החודש
                </span>
              </div>

              {type === "whatsapp" && <WhatsAppStats stats={stats.whatsapp} />}
              {type === "stripe" && <StripeStats stats={stats.stripe} />}
              {type === "google" && <GoogleStats stats={stats.google} />}
              {type === "social" && <SocialStats stats={stats.social} />}
              {type === "ads" && <AdsStats stats={stats.ads} />}

              {!stats[type] && (
                <div className="py-3 text-center">
                  <p className="text-[13px] text-muted">אין נתונים זמינים עדיין</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
