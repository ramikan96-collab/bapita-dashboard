"use client";

interface Props {
  photos: string[];
}

export function SectionGallery({ photos }: Props) {
  if (!photos.length) return null;
  const [main, ...rest] = photos;

  const imgStyle: React.CSSProperties = {
    width:"100%", height:"100%", objectFit:"cover",
    transition:"transform 0.3s ease",
  };

  function onEnter(e: React.MouseEvent<HTMLImageElement>) {
    e.currentTarget.style.transform = "scale(1.04)";
  }
  function onLeave(e: React.MouseEvent<HTMLImageElement>) {
    e.currentTarget.style.transform = "scale(1.0)";
  }

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns: rest.length ? "2fr 1fr" : "1fr",
      gap:8,
    }}>
      <div style={{ borderRadius:10, overflow:"hidden", aspectRatio:"4/3" }}>
        <img src={main} alt="" style={imgStyle} onMouseEnter={onEnter} onMouseLeave={onLeave} />
      </div>
      {rest.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {rest.map((photo, i) => (
            <div key={i} style={{ borderRadius:10, overflow:"hidden", flex:1, minHeight:80 }}>
              <img src={photo} alt="" style={{ ...imgStyle, height:"100%" }} onMouseEnter={onEnter} onMouseLeave={onLeave} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
