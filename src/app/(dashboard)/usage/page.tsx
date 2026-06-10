export default function UsagePage() {
  return (
    <div className="px-4 py-12 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(232,146,10,0.12)", color: "var(--color-amber)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      </div>
      <h1 className="text-[22px] font-bold text-dark mb-2">Usage</h1>
      <p className="text-[15px] max-w-xs" style={{ color: "var(--color-muted)" }}>
        Per-add-on stats — messages sent, payments processed — are coming soon.
      </p>
    </div>
  );
}
