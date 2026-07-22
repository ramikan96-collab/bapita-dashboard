// Return page when a Green Invoice deposit payment is cancelled/failed.
// The pending booking auto-expires and its slot is released by the cron.
export const dynamic = "force-static";

export default function PayCancelPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF5EC", padding: 24, direction: "rtl" }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#fff", borderRadius: 20, boxShadow: "0 2px 16px rgba(30,26,20,0.08)", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1E1A14", margin: "0 0 8px" }}>התשלום בוטל</h1>
        <p style={{ fontSize: 15, color: "#6B6257", margin: 0, lineHeight: 1.6 }}>
          ההזמנה לא הושלמה כי המקדמה לא שולמה. אפשר לחזור לעמוד העסק ולנסות שוב.
        </p>
      </div>
    </div>
  );
}
