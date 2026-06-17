import { createServiceClient } from "@/lib/supabase/service";
import CancelConfirm from "./CancelConfirm";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function CancelPage({ params }: Props) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_name, appointment_date, appointment_time, status, cancel_token, businesses(name)")
    .eq("cancel_token", token)
    .single();

  const fontStyle = { fontFamily: "system-ui, -apple-system, sans-serif" };
  const container: React.CSSProperties = {
    minHeight: "100vh",
    background: "#FAF5EC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    ...fontStyle,
  };
  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 20,
    padding: "32px 28px",
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  };

  if (!booking) {
    return (
      <div style={container}>
        <div style={card}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Link not found</h1>
          <p style={{ color: "#888", fontSize: 14, margin: 0 }}>This cancellation link is invalid or has already been used.</p>
        </div>
      </div>
    );
  }

  if (booking.status === "cancelled") {
    return (
      <div style={container}>
        <div style={card}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Already cancelled</h1>
          <p style={{ color: "#888", fontSize: 14, margin: 0 }}>This appointment has already been cancelled.</p>
        </div>
      </div>
    );
  }

  const businessName = Array.isArray(booking.businesses)
    ? booking.businesses[0]?.name
    : (booking.businesses as { name: string } | null)?.name;

  const formattedDate = new Date(booking.appointment_date + "T12:00:00").toLocaleDateString("en-IL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const time = (booking.appointment_time as string).slice(0, 5);

  return (
    <div style={container}>
      <div style={card}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Cancel appointment?</h1>
        <p style={{ color: "#888", fontSize: 14, margin: "0 0 24px" }}>This cannot be undone.</p>
        <div style={{ background: "#FAF5EC", borderRadius: 12, padding: "16px 18px", marginBottom: 24, fontSize: 14, lineHeight: 1.7 }}>
          <div><strong>Business:</strong> {businessName || "—"}</div>
          <div><strong>Name:</strong> {booking.customer_name}</div>
          <div><strong>Date:</strong> {formattedDate}</div>
          <div><strong>Time:</strong> {time}</div>
        </div>
        <CancelConfirm token={token} />
      </div>
    </div>
  );
}
