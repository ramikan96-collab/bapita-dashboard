"use client";
import { useState, useEffect } from "react";

export function useCountUp(target: number | null, durationMs: number, enabled: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled || target == null) return;
    let current = 0;
    const steps = Math.floor(durationMs / 16);
    const inc = target / steps;
    const id = setInterval(() => {
      current = Math.min(current + inc, target);
      setValue(Math.round(current));
      if (current >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [enabled, target, durationMs]);
  return value;
}
