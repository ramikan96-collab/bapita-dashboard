import Link from "next/link";
import type { Business } from "@/types";
import { IgIcon, WaIcon, FbIcon, TkIcon } from "./icons";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { displayIlPhone } from "@/lib/phone-display";

interface Props {
  business: Business;
  accent: string;
  /** Passed as { text, muted, surface, border }. Set border:"transparent" to suppress circle borders. */
  colors: { text: string; muted: string; surface: string; border: string };
  socialShape: "circle" | "square";
  /** Background color of each social icon container */
  socialBg: string;
  /** Icon fill color */
  iconColor: string;
  /** t.footer.poweredBy */
  footerLabel: string;
  /** t.footer.brand */
  brandLabel: string;
  /** t.footer.privacy */
  privacyLabel: string;
  /** t.footer.terms */
  termsLabel: string;
  /** Show paddingTop + borderTop (Clean + Dark). Classic omits. */
  topBorder?: boolean;
  /** Extra styles for the "powered by" label (Dark: Oswald/uppercase) */
  footerLabelStyle?: React.CSSProperties;
  /** Page language — picks the seller-line labels and the booking-terms URL. */
  lang?: "en" | "he";
}

// Stays take payment through host pay links, so their footer names the legal
// seller and links to the business's own booking terms (Grow's site review and
// Israeli distance-sale rules). Custom-domain sites keep the old links: the
// tenant /legal route is not mapped on custom domains.
const SELLER = {
  en: { by: "Operated by", id: "Business ID", tel: "Tel", terms: "Booking terms" },
  he: { by: "מופעל על ידי", id: "מספר עוסק", tel: "טל׳", terms: "תנאי הזמנה" },
};

export function ThemeFooter({
  business, accent, colors, socialShape, socialBg, iconColor,
  footerLabel, brandLabel, privacyLabel, termsLabel, topBorder, footerLabelStyle, lang = "en",
}: Props) {
  const stayLegal = business.business_type === "stay" && !business.custom_domain_verified;
  const seller = SELLER[lang];
  const termsHref = stayLegal ? `/${business.slug}/legal/terms${lang === "he" ? "?lang=he" : ""}` : "/terms";
  const radius    = socialShape === "circle" ? "50%" : 2;
  const showBorder = socialShape === "circle" && colors.border !== "transparent";
  const hasSocials = !!(business.instagram_url || business.whatsapp_number || business.facebook_url || business.tiktok_url);

  function socialStyle(): React.CSSProperties {
    return {
      width: 36, height: 36, borderRadius: radius, background: socialBg,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: showBorder ? "border-color 0.2s" : "opacity 0.2s",
      ...(showBorder ? { border: `1px solid ${colors.border}` } : {}),
    };
  }
  function onEnter(e: React.MouseEvent<HTMLAnchorElement>) {
    if (showBorder) e.currentTarget.style.borderColor = accent;
    else            e.currentTarget.style.opacity = "0.7";
  }
  function onLeave(e: React.MouseEvent<HTMLAnchorElement>) {
    if (showBorder) e.currentTarget.style.borderColor = colors.border;
    else            e.currentTarget.style.opacity = "1";
  }

  return (
    <footer style={{ marginTop: 64, textAlign: "center", ...(topBorder ? { paddingTop: 32, borderTop: `1px solid ${colors.border}` } : {}) }}>
      {business.phone && (
        <a href={`tel:${business.phone}`} style={{ display: "block", fontSize: 13, color: colors.muted, textDecoration: "none", marginBottom: 14 }}>
          {business.phone}
        </a>
      )}
      {hasSocials && (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          {business.instagram_url && (
            <a href={business.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={socialStyle()} onMouseEnter={onEnter} onMouseLeave={onLeave}>
              <IgIcon size={16} color={iconColor} />
            </a>
          )}
          {business.whatsapp_number && (
            <a href={`https://wa.me/${business.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={socialStyle()} onMouseEnter={onEnter} onMouseLeave={onLeave}>
              <WaIcon size={16} color={iconColor} />
            </a>
          )}
          {business.facebook_url && (
            <a href={business.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={socialStyle()} onMouseEnter={onEnter} onMouseLeave={onLeave}>
              <FbIcon size={16} color={iconColor} />
            </a>
          )}
          {business.tiktok_url && (
            <a href={business.tiktok_url} target="_blank" rel="noopener noreferrer" aria-label="TikTok" style={socialStyle()} onMouseEnter={onEnter} onMouseLeave={onLeave}>
              <TkIcon size={16} color={iconColor} />
            </a>
          )}
        </div>
      )}
      {stayLegal && (business.legal_name || business.business_id_number || business.email) && (
        <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.7, marginBottom: 14 }}>
          {(business.legal_name || business.business_id_number) && (
            <div>
              {business.legal_name && <>{seller.by} {business.legal_name}</>}
              {business.legal_name && business.business_id_number && " · "}
              {business.business_id_number && <>{seller.id} {business.business_id_number}</>}
            </div>
          )}
          {(business.whatsapp_number || business.email) && (
            <div>
              {business.whatsapp_number && !business.phone && (
                <a href={`tel:${business.whatsapp_number.replace(/[^\d+]/g, "")}`} dir="ltr" style={{ color: "inherit", textDecoration: "none" }}>
                  {seller.tel} {displayIlPhone(business.whatsapp_number)}
                </a>
              )}
              {business.whatsapp_number && !business.phone && business.email && " · "}
              {business.email && (
                <a href={`mailto:${business.email}`} dir="ltr" style={{ color: "inherit", textDecoration: "none" }}>{business.email}</a>
              )}
            </div>
          )}
        </div>
      )}
      <div style={{ fontSize: 12, color: colors.muted, ...footerLabelStyle }}>
        {footerLabel}{" "}
        <a href="https://bapita.com" style={{ color: accent, textDecoration: "none", fontWeight: 700 }}>
          {brandLabel}
        </a>
      </div>

      <div style={{ marginTop: 14, color: colors.muted, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, fontSize: 12 }}>
        <AccessibilityMenu />
        <span style={{ opacity: 0.4 }}>·</span>
        <Link href="/privacy" style={{ color: "inherit", opacity: 0.6, textDecoration: "underline", textUnderlineOffset: 2 }}>
          {privacyLabel}
        </Link>
        <span style={{ opacity: 0.4 }}>·</span>
        <Link href={termsHref} style={{ color: "inherit", opacity: 0.6, textDecoration: "underline", textUnderlineOffset: 2 }}>
          {stayLegal ? seller.terms : termsLabel}
        </Link>
      </div>
    </footer>
  );
}
