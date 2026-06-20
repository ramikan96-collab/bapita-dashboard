"use client";

type ThemeKey = "classic" | "clean" | "dark";

const THEMES: { key: ThemeKey; label: string }[] = [
  { key: "clean",   label: "Clean"   },
  { key: "classic", label: "Classic" },
  { key: "dark",    label: "Dark"    },
];

interface Props {
  active: ThemeKey;
  onSwitch: (key: ThemeKey) => void;
}

export function DemoThemeSwitcher({ active, onSwitch }: Props) {
  return (
    <div style={{
      position: "fixed",
      bottom: 96,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 90,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      pointerEvents: "none",
    }}>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.75)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}>
        Pick a style · בחר סגנון
      </span>
      <div style={{
        display: "flex",
        background: "rgba(0,0,0,0.52)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 999,
        padding: 3,
        gap: 2,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        pointerEvents: "auto",
      }}>
        {THEMES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSwitch(key)}
            style={{
              height: 32,
              padding: "0 16px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              transition: "background 0.18s, color 0.18s",
              background: active === key ? "rgba(255,255,255,0.95)" : "transparent",
              color: active === key ? "#111" : "rgba(255,255,255,0.75)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
