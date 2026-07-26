import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement | Bapita",
  description: "Bapita accessibility statement — WCAG 2.0 Level AA / Israeli Standard 5568 compliance.",
};

const LAST_REVIEWED = "2026-07-26";

export default function AccessibilityPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px", lineHeight: 1.7, color: "#1C1917" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Accessibility Statement</h1>
      <p style={{ fontSize: 13, color: "#6B6259", marginBottom: 32 }}>Last reviewed: {LAST_REVIEWED}</p>

      <p style={{ marginBottom: 20 }}>
        Bapita is committed to ensuring digital accessibility for people with disabilities.
        We are actively working to conform our booking pages and dashboard to the
        Web Content Accessibility Guidelines (WCAG) 2.0 Level AA, in line with
        Israeli Standard 5568 (תקן ישראלי 5568) and the Equal Rights for Persons
        with Disabilities Regulations (Accessibility Adjustments for Services), 2013.
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 10 }}>What we&apos;ve done</h2>
      <ul style={{ paddingInlineStart: 20, marginBottom: 20 }}>
        <li>Accessibility settings available on every public booking page (text size, high contrast, reduced motion, stronger keyboard focus outline) — click &quot;Accessibility&quot; in the page footer.</li>
        <li>Semantic labels and ARIA attributes on booking forms, calendars, and time/staff selection controls.</li>
        <li>Keyboard-operable booking flow (calendar, time slots, staff selection, contact form).</li>
        <li>Descriptive alt text on staff and service images.</li>
        <li>Respect for reduced-motion preferences (both system-level and in-page toggle).</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 10 }}>Known limitations</h2>
      <p style={{ marginBottom: 20 }}>
        This is an ongoing effort. Some older pages or third-party embedded content
        may not yet fully conform. We review and improve the site on a rolling
        basis and prioritize the public booking flow, since it&apos;s used directly
        by our customers&apos; clients.
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 10 }}>Feedback &amp; contact</h2>
      <p style={{ marginBottom: 8 }}>
        If you encounter an accessibility barrier on any Bapita-powered site, please contact us:
      </p>
      <ul style={{ paddingInlineStart: 20, marginBottom: 20 }}>
        <li>Email: <a href="mailto:info.bapita@gmail.com" style={{ color: "#E8920A" }}>info.bapita@gmail.com</a></li>
      </ul>
      <p>
        We aim to respond to accessibility feedback within a reasonable time and
        to provide the information or service you were seeking through an
        alternative accessible method where needed.
      </p>
    </div>
  );
}
