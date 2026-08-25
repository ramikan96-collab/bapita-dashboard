import { BrowserFrame } from "@/components/hub/ui/frame";
import type { Audience } from "@/lib/marketing/audiences";

/**
 * One booking page, four businesses.
 *
 * The Hub had four hand-written mocks because it had four different products.
 * Here there is one product, so there is one mock, driven by the audience —
 * which is exactly the claim the card is making. The only structural difference
 * between them is `mode`: a stay picks nights off a date strip, an appointment
 * picks a time. That is the same fork the real product makes on
 * `businesses.business_type`.
 *
 * Real DOM, not screenshots: it stays crisp at any width and picks up the
 * audience accent without a second asset.
 *
 * `dense` tightens every vertical rhythm by roughly a fifth. It exists because
 * the mock now lives inside a fixed-height card stage alongside two other
 * surfaces, and a mock that overflows its stage by 60px is what would break the
 * one thing a three-up has to get right — a shared bottom edge.
 */
export function SiteMock({
  audience,
  dense = false,
}: {
  audience: Audience;
  dense?: boolean;
}) {
  const { accent, items, slots, mock, mode } = audience;
  const isStay = mode === "stay";
  // Appointment: one slot is the chosen one. Stay: a check in → check out range.
  const chosen = isStay ? [2, 3] : [3];

  return (
    <BrowserFrame url={mock.url} accent={accent} dense={dense}>
      <div className="bg-white">
        <div
          className={`flex items-center gap-3 px-5 ${dense ? "py-3" : "py-4"}`}
          style={{ background: `linear-gradient(120deg, ${accent}14, transparent)` }}
        >
          <span
            className={`flex items-center justify-center rounded-full text-sm font-extrabold text-white ${
              dense ? "h-9 w-9" : "h-10 w-10"
            }`}
            style={{ background: accent }}
          >
            {mock.initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-espresso">{mock.name}</p>
            <p className="flex items-center gap-1 text-[0.6875rem] text-espresso/45">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hub-success" />
              {mock.status}
            </p>
          </div>
        </div>

        <div className={`px-5 pb-1 ${dense ? "space-y-1" : "space-y-1.5"}`}>
          {items.map((item, i) => (
            <div
              key={item.name}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 ${
                dense ? "py-2" : "py-2.5"
              }`}
              style={
                i === 0
                  ? { borderColor: `${accent}55`, background: `${accent}0d` }
                  : { borderColor: "rgba(42,29,20,0.08)" }
              }
            >
              <div className="min-w-0">
                <p className="truncate text-[0.8125rem] font-semibold text-espresso">
                  {item.name}
                </p>
                <p className="truncate text-[0.6875rem] text-espresso/40">{item.meta}</p>
              </div>
              <span className="shrink-0 text-[0.8125rem] font-bold tabular-nums text-espresso">
                {item.price}
                {isStay && (
                  <span className="font-medium text-espresso/40"> / night</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className={`px-5 ${dense ? "pt-2.5" : "pt-3.5"}`}>
          <p
            className={`text-[0.625rem] font-bold uppercase tracking-[0.14em] text-espresso/35 ${
              dense ? "mb-1.5" : "mb-2"
            }`}
          >
            {mock.slotLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {slots.map((slot, i) => {
              const on = chosen.includes(i);
              return (
                <span
                  key={slot}
                  className={
                    isStay
                      ? `flex items-center justify-center rounded-hub-lg text-[0.75rem] font-semibold tabular-nums ${
                          dense ? "h-7 w-7" : "h-8 w-8"
                        }`
                      : `rounded-hub-lg px-2.5 text-[0.75rem] font-semibold tabular-nums ${
                          dense ? "py-1" : "py-1.5"
                        }`
                  }
                  style={
                    on
                      ? { background: accent, color: "#fff" }
                      : { background: "rgba(42,29,20,0.05)", color: "rgba(42,29,20,0.6)" }
                  }
                >
                  {slot}
                </span>
              );
            })}
          </div>
        </div>

        <div className={dense ? "p-4 pt-3" : "p-5 pt-4"}>
          <div
            className={`truncate rounded-pill text-center text-[0.8125rem] font-bold text-white ${
              dense ? "py-2" : "py-2.5"
            }`}
            style={{ background: accent }}
          >
            {mock.cta}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
