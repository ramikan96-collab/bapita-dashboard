"use client";

import { useState, useEffect } from "react";

interface Props {
  shopName: string;
  onBook: () => void;
  bgColor: string;
  textColor: string;
}

export function FloatingCTA({ shopName, onBook, bgColor, textColor }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 0.7);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{
      position:"fixed", bottom:0,
      insetInlineStart:0, insetInlineEnd:0,
      padding:"12px 20px 20px",
      background:"linear-gradient(to top, rgba(0,0,0,0.08) 0%, transparent 100%)",
      zIndex:50,
      transform: visible ? "translateY(0)" : "translateY(100%)",
      opacity: visible ? 1 : 0,
      transition:"transform 0.35s ease, opacity 0.35s ease",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <button
        onClick={onBook}
        style={{
          width:"100%", height:52, borderRadius:9999,
          background: bgColor, color: textColor,
          fontSize:15, fontWeight:800,
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          gap:6, boxShadow:"0 4px 20px rgba(0,0,0,0.18)",
        }}
      >
        {shopName} · Book Appointment →
      </button>
    </div>
  );
}
