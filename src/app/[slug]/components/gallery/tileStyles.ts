import type React from "react";

export const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "transform 0.3s ease",
  cursor: "pointer",
  display: "block",
  position: "absolute",
  inset: 0,
};

export function focalPos(focal: Record<string, string> | undefined, url: string): string {
  return focal?.[url] ?? "center";
}
