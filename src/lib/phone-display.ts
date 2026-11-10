// Human-readable Israeli phone for public pages: "972534379176" → "053-437-9176".
// Anything that is not a recognisable Israeli mobile/landline comes back as typed.
export function displayIlPhone(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  let d = s.replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  if (/^05\d{8}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (/^0[2-9]\d{7}$/.test(d)) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return s;
}
