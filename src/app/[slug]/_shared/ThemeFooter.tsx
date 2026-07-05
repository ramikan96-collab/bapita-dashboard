import type { Business } from "@/types";
import { IgIcon, WaIcon, FbIcon, TkIcon } from "./icons";

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
  /** Show paddingTop + borderTop (Clean + Dark). Classic omits. */
  topBorder?: boolean;
  /** Extra styles for the "powered by" label (Dark: Oswald/uppercase) */
  footerLabelStyle?: React.CSSProperties;
}

export function ThemeFooter({
  business, accent, colors, socialShape, socialBg, iconColor,
  footerLabel, brandLabel, topBorder, footerLabelStyle,
}: Props) {
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
      <div style={{ fontSize: 12, color: colors.muted, ...footerLabelStyle }}>
        {footerLabel}{" "}
        <a href="https://bapita.com" style={{ color: accent, textDecoration: "none", fontWeight: 700 }}>
          {brandLabel}
        </a>
      </div>
    </footer>
  );
}
