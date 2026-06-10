export default function FinancialsPage() {
  return (
    <div className="px-4 py-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
          <line x1="2" y1="10" x2="22" y2="10"></line>
        </svg>
      </div>
      <h1 className="text-[22px] font-bold text-dark mb-2">Financials</h1>
      <p className="text-[15px] max-w-xs" style={{ color: "var(--color-muted)" }}>
        Revenue, payments, and payout reports are coming soon.
      </p>
    </div>
  );
}
