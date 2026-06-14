interface Props {
  address: string;
  darkColor: string;
  accentColor: string;
}

export function SectionLocation({ address, darkColor, accentColor }: Props) {
  const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:15, color:darkColor, lineHeight:1.6 }}>{address}</div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        style={{ fontSize:14, fontWeight:700, color:accentColor, textDecoration:"none" }}>
        Get Directions →
      </a>
    </div>
  );
}
