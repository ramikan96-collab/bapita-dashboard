export default function Home() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="text-2xl font-black tracking-tight" style={{ color: "var(--color-dark)" }}>
            bapita
          </span>
          <span
            className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ background: "var(--color-amber)", color: "#fff" }}
          >
            dashboard
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Coming soon — Batch 2
        </p>
      </div>
    </div>
  );
}
