import { useState, useEffect, useRef } from "react";
import {
  collection, doc, setDoc, deleteDoc, getDoc, onSnapshot, updateDoc
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Palette ─────────────────────────────────────────────
const T = {
  cloudDancer: "#F0EEE9",
  surface:     "#FAFAF8",
  surface2:    "#EAE6DE",
  border:      "rgba(60,48,36,0.11)",
  ink:         "#1C1814",
  inkMid:      "#5A5048",
  inkLight:    "#A0948A",
  rose:        "#BC5C58",
  roseDim:     "rgba(188,92,88,0.10)",
  roseBorder:  "rgba(188,92,88,0.28)",
  teal:        "#3D7E8A",
  tealDim:     "rgba(61,126,138,0.10)",
  tealBorder:  "rgba(61,126,138,0.28)",
  caramel:     "#C47A48",
};

const THEME_PALETTES = {
  warm: {
    label: "Warm Paper",
    note: "soft cream · rose · teal",
    values: {
      cloudDancer: "#F0EEE9", surface: "#FAFAF8", surface2: "#EAE6DE", border: "rgba(60,48,36,0.11)",
      ink: "#1C1814", inkMid: "#5A5048", inkLight: "#A0948A",
      rose: "#BC5C58", roseDim: "rgba(188,92,88,0.10)", roseBorder: "rgba(188,92,88,0.28)",
      teal: "#3D7E8A", tealDim: "rgba(61,126,138,0.10)", tealBorder: "rgba(61,126,138,0.28)",
      caramel: "#C47A48",
    },
  },
  blush: {
    label: "Blush Pink",
    note: "romantic · light · gentle",
    values: {
      cloudDancer: "#FFF3F5", surface: "#FFF9FA", surface2: "#F7DDE3", border: "rgba(120,58,72,0.12)",
      ink: "#2A171B", inkMid: "#6F4A52", inkLight: "#B58C95",
      rose: "#D65A76", roseDim: "rgba(214,90,118,0.12)", roseBorder: "rgba(214,90,118,0.30)",
      teal: "#8A6FAF", tealDim: "rgba(138,111,175,0.12)", tealBorder: "rgba(138,111,175,0.30)",
      caramel: "#C46A86",
    },
  },
  sage: {
    label: "Sage Garden",
    note: "calm · green · natural",
    values: {
      cloudDancer: "#EEF3EA", surface: "#FAFCF7", surface2: "#DEE8D7", border: "rgba(55,74,49,0.12)",
      ink: "#1C2418", inkMid: "#53604B", inkLight: "#94A08C",
      rose: "#A96C5B", roseDim: "rgba(169,108,91,0.12)", roseBorder: "rgba(169,108,91,0.30)",
      teal: "#5F8B6E", tealDim: "rgba(95,139,110,0.12)", tealBorder: "rgba(95,139,110,0.30)",
      caramel: "#B48755",
    },
  },
  midnight: {
    label: "Midnight",
    note: "dark · cinematic · cozy",
    values: {
      cloudDancer: "#171513", surface: "#211E1B", surface2: "#2D2824", border: "rgba(255,244,230,0.13)",
      ink: "#F5EDE3", inkMid: "#D7C8B8", inkLight: "#9F9183",
      rose: "#F08A8A", roseDim: "rgba(240,138,138,0.14)", roseBorder: "rgba(240,138,138,0.36)",
      teal: "#83CAD3", tealDim: "rgba(131,202,211,0.14)", tealBorder: "rgba(131,202,211,0.34)",
      caramel: "#E4A15D",
    },
  },
};

const COL = {
  a: { text: T.rose, dim: T.roseDim, border: T.roseBorder },
  b: { text: T.teal, dim: T.tealDim, border: T.tealBorder },
};

function applyTheme(themeId = "warm") {
  const theme = THEME_PALETTES[themeId] || THEME_PALETTES.warm;
  Object.assign(T, theme.values);
  Object.assign(COL.a, { text: T.rose, dim: T.roseDim, border: T.roseBorder });
  Object.assign(COL.b, { text: T.teal, dim: T.tealDim, border: T.tealBorder });
  if (typeof document !== "undefined") document.body.style.background = T.cloudDancer;
}
const DISPLAY = "'Cormorant Garamond', serif";
const SANS    = "'DM Sans', sans-serif";

// ─── Moods ───────────────────────────────────────────────
const MOODS = [
  { n:1, label:"rough day"   },
  { n:2, label:"it was okay" },
  { n:3, label:"pretty good" },
  { n:4, label:"so sweet"    },
  { n:5, label:"wonderful"   },
];

// ─── Face SVGs ───────────────────────────────────────────
function FaceSvg({ index, size = 22, color }) {
  const faces = [
    // 1 sad
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="7.8" cy="10" r="1" fill="currentColor"/>
      <circle cx="14.2" cy="10" r="1" fill="currentColor"/>
      <path d="M8 15 Q11 12 14 15" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/></>,
    // 2 meh
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="7.8" cy="10" r="1" fill="currentColor"/>
      <circle cx="14.2" cy="10" r="1" fill="currentColor"/>
      <path d="M8 14 L14 14" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/></>,
    // 3 smile
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="7.8" cy="10" r="1" fill="currentColor"/>
      <circle cx="14.2" cy="10" r="1" fill="currentColor"/>
      <path d="M8 13.5 Q11 16.5 14 13.5" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/></>,
    // 4 big smile
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <path d="M7.5 8.8 Q8 7.8 9 8.8" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round"/>
      <path d="M13 8.8 Q14 7.8 14.5 8.8" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round"/>
      <path d="M7.5 13.2 Q11 17.5 14.5 13.2" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/></>,
    // 5 wonderful — heart eyes + huge grin
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <path d="M7.8 11.25C6.35 10.15 5.65 9.35 5.65 8.35C5.65 7.55 6.25 7.02 6.98 7.02C7.38 7.02 7.66 7.22 7.8 7.55C7.96 7.22 8.25 7.02 8.65 7.02C9.38 7.02 9.98 7.55 9.98 8.35C9.98 9.35 9.25 10.15 7.8 11.25Z" fill="currentColor" stroke="none"/>
      <path d="M14.2 11.25C12.75 10.15 12.02 9.35 12.02 8.35C12.02 7.55 12.62 7.02 13.35 7.02C13.75 7.02 14.04 7.22 14.2 7.55C14.34 7.22 14.62 7.02 15.02 7.02C15.75 7.02 16.35 7.55 16.35 8.35C16.35 9.35 15.65 10.15 14.2 11.25Z" fill="currentColor" stroke="none"/>
      <path d="M6.6 13.4 Q11 18.2 15.4 13.4" fill="none" strokeWidth="1.55" stroke="currentColor" strokeLinecap="round"/>
      <path d="M3.1 5.2 L3.55 6.15 M3.95 4.1 L3.8 5.25 M5 4.75 L4.1 5.45" fill="none" strokeWidth="1" stroke="currentColor" strokeLinecap="round"/>
      <path d="M18.9 5.2 L18.45 6.15 M18.05 4.1 L18.2 5.25 M17 4.75 L17.9 5.45" fill="none" strokeWidth="1" stroke="currentColor" strokeLinecap="round"/></>,
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"
      style={{ color, display:"block", flexShrink:0 }}>
      {faces[Math.max(0, Math.min(4, index))]}
    </svg>
  );
}

// ─── Utils ───────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function today() { return new Date().toISOString().split("T")[0]; }
function moodOf(n) { return MOODS.find(m => m.n === n) || MOODS[2]; }

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function fmtDateShort(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" });
}
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", hour12:false });
}
function calcDays(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  const diff = Math.floor((now - start) / 86400000);
  return diff >= 0 ? diff : null;
}

function resizeImage(file, maxPx = 1100) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxPx) { h = Math.round(h * maxPx / w); w = maxPx; }
      if (h > maxPx) { w = Math.round(w * maxPx / h); h = maxPx; }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.80));
    };
    img.src = url;
  });
}

// Normalize: support both old `photo` string and new `photos` array
function getPhotos(e) {
  if (e.photos && e.photos.length) return e.photos;
  if (e.photo) return [e.photo];
  return [];
}

// Group entries: { "YYYY-MM": { "YYYY-MM-DD": [entries] } }
function groupByMonthDay(entries) {
  const months = {};
  entries.forEach(e => {
    const month = e.date ? e.date.slice(0,7) : "~";
    const day   = e.date || "~";
    if (!months[month]) months[month] = {};
    if (!months[month][day]) months[month][day] = [];
    months[month][day].push(e);
  });
  // Sort months desc, days desc within each month
  return Object.entries(months)
    .sort((a,b) => b[0].localeCompare(a[0]))
    .map(([month, days]) => [
      month,
      Object.entries(days).sort((a,b) => b[0].localeCompare(a[0]))
    ]);
}

function monthLabel(ym) {
  if (ym === "~") return "Unknown";
  const [y, m] = ym.split("-");
  return new Date(+y, +m-1, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" });
}
function dayLabel(d) {
  if (d === "~") return "Unknown date";
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}

// ─── Field ───────────────────────────────────────────────
const fieldBase = {
  width:"100%", background:T.cloudDancer, border:`1.5px solid ${T.border}`,
  borderRadius:11, padding:"11px 14px", fontSize:15, fontFamily:SANS,
  color:T.ink, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s",
};
function Field({ label, icon, value, onChange, placeholder, type="text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:"1rem" }}>
      <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:T.inkLight, marginBottom:6, fontFamily:SANS }}>{icon}&nbsp;&nbsp;{label}</div>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{...fieldBase, borderColor:focused?T.caramel:T.border}}/>
    </div>
  );
}

// ─── Photo strip (swipeable stickers) ────────────────────
const TILTS = [-2.5, 1.8, -1.2, 2.2, -0.8, 1.5];
function PhotoStrip({ photos, onPhotoClick, compact=false }) {
  if (!photos.length) return null;
  if (photos.length === 1) {
    const tilt = compact ? TILTS[0] : 0;
    return (
      <div style={{ display:"flex", justifyContent:"center", padding: compact ? "10px 10px 0" : "12px 12px 0" }}>
        <div onClick={()=>onPhotoClick&&onPhotoClick(photos[0])}
          style={{ background:"white", padding: compact ? "6px 6px 18px" : "8px 8px 26px",
            boxShadow:"0 4px 16px rgba(60,48,36,0.16)", transform:`rotate(${tilt}deg)`,
            cursor:onPhotoClick?"zoom-in":"default", transition:"transform 0.25s, box-shadow 0.25s",
            maxWidth: compact ? 180 : "100%", width: compact ? undefined : "calc(100% - 24px)", boxSizing:"border-box" }}
          onMouseEnter={e=>{ if(onPhotoClick){e.currentTarget.style.transform="rotate(0deg) scale(1.03)"; e.currentTarget.style.boxShadow="0 10px 28px rgba(60,48,36,0.22)"; }}}
          onMouseLeave={e=>{ e.currentTarget.style.transform=`rotate(${tilt}deg)`; e.currentTarget.style.boxShadow="0 4px 16px rgba(60,48,36,0.16)"; }}>
          <img src={photos[0]} style={{ display:"block", width:"100%", height:"auto", objectFit:"contain" }}/>
        </div>
      </div>
    );
  }
  // Multiple photos — horizontal scroll strip
  return (
    <div style={{ padding: compact ? "10px 0 0" : "12px 0 0" }}>
      <div style={{ overflowX:"auto", display:"flex", gap:10, paddingLeft:12, paddingRight:12,
        scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch",
        scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {photos.map((src, i) => (
          <div key={i} onClick={()=>onPhotoClick&&onPhotoClick(src)}
            style={{ flexShrink:0, scrollSnapAlign:"start",
              background:"white", padding: compact ? "5px 5px 16px" : "7px 7px 22px",
              boxShadow:"0 4px 14px rgba(60,48,36,0.14)",
              transform:`rotate(${TILTS[i % TILTS.length]}deg)`,
              cursor:onPhotoClick?"zoom-in":"default",
              transition:"transform 0.2s, box-shadow 0.2s",
              width: compact ? 140 : 200 }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="rotate(0deg) scale(1.04)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(60,48,36,0.2)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=`rotate(${TILTS[i%TILTS.length]}deg)`; e.currentTarget.style.boxShadow="0 4px 14px rgba(60,48,36,0.14)"; }}>
            <img src={src} style={{ display:"block", width:"100%", height: compact ? 100 : 140, objectFit:"cover" }}/>
          </div>
        ))}
        {/* Trailing spacer for last card visibility */}
        <div style={{ flexShrink:0, width:4 }}/>
      </div>
      <div style={{ textAlign:"center", marginTop:6, fontSize:11, color:T.inkLight, fontFamily:SANS, letterSpacing:"0.08em" }}>
        ← swipe · {photos.length} photos
      </div>
    </div>
  );
}

// ─── Reaction bar ────────────────────────────────────────
const REACTION_LIST = [
  { key:"heart", emoji:"❤️"  },
  { key:"haha",  emoji:"😂"  },
  { key:"cheer", emoji:"💪"  },
  { key:"hug",   emoji:"🤗"  },
];
function ReactionBar({ entryId, reactions={} }) {
  async function toggle(key) {
    const current = reactions[key] || 0;
    await updateDoc(doc(db,"entries",entryId), {
      [`reactions.${key}`]: current > 0 ? 0 : 1
    });
  }
  return (
    <div style={{ display:"flex", gap:6, marginTop:8 }}>
      {REACTION_LIST.map(r => {
        const count = reactions[r.key] || 0;
        const active = count > 0;
        return (
          <button key={r.key} onClick={()=>toggle(r.key)}
            style={{ background: active ? "rgba(196,122,72,0.12)" : "transparent",
              border:`1.5px solid ${active ? T.caramel : T.border}`,
              borderRadius:20, padding:"3px 9px", fontSize:14, cursor:"pointer",
              display:"flex", alignItems:"center", gap:4, transition:"all 0.18s" }}>
            <span>{r.emoji}</span>
            {active && <span style={{ fontSize:11, color:T.caramel, fontFamily:SANS, fontWeight:500 }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Single entry card ───────────────────────────────────
function MoodBadge({ mood, color = T.ink, glass = false }) {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
      minWidth:64, padding:"7px 9px 6px", borderRadius:16,
      background: glass ? "rgba(28,24,20,0.46)" : T.surface,
      border:`1px solid ${glass ? "rgba(255,255,255,0.34)" : T.border}`,
      boxShadow: glass ? "0 8px 22px rgba(0,0,0,0.18)" : "0 4px 14px rgba(60,48,36,0.08)",
      backdropFilter: glass ? "blur(10px)" : "none",
      WebkitBackdropFilter: glass ? "blur(10px)" : "none",
      pointerEvents:"none"
    }}>
      <FaceSvg index={mood.n-1} size={22} color={color}/>
      <span style={{
        fontSize:10, lineHeight:1, color, fontFamily:SANS, letterSpacing:"0.04em",
        textTransform:"lowercase", whiteSpace:"nowrap", textShadow: glass ? "0 1px 5px rgba(0,0,0,0.35)" : "none"
      }}>
        {mood.label}
      </span>
    </div>
  );
}

function EntryCard({ e, names, onEdit, onRemove, onPreview, onPhotoClick }) {
  const [hov, setHov] = useState(false);
  const c = COL[e.writer];
  const mood = moodOf(e.hearts);
  const photos = getPhotos(e);
  const hasPhoto = photos.length > 0;

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background: T.cloudDancer, border:`1.5px solid ${hov?c.border:T.border}`,
        borderRadius:18, overflow:"hidden", transition:"all 0.25s",
        transform:hov?"translateY(-2px)":"none",
        boxShadow:hov?"0 8px 28px rgba(60,48,36,0.12)":"0 1px 4px rgba(60,48,36,0.06)",
        marginBottom:14 }}>

      {/* Accent line */}
      <div style={{ height:3, background:`linear-gradient(90deg,${c.text}88,transparent)` }}/>

      {hasPhoto ? (
        <div>
          {/* Main photo with mood badge at upper-right */}
          <div style={{ padding:"12px 12px 0" }}>
            <div style={{
              position:"relative", overflow:"hidden", borderRadius:15, background:"white",
              boxShadow:"0 4px 16px rgba(60,48,36,0.14)"
            }}>
              <img
                src={photos[0]}
                onClick={()=>onPhotoClick&&onPhotoClick(photos[0])}
                style={{ display:"block", width:"100%", height:"auto", maxHeight:300,
                  objectFit:"cover", cursor:"zoom-in" }}
              />

              <div style={{ position:"absolute", top:10, right:10 }}>
                <MoodBadge mood={mood} color="white" glass={true}/>
              </div>

              {photos.length > 1 && (
                <div style={{
                  position:"absolute", left:10, bottom:10, background:"rgba(28,24,20,0.52)",
                  color:"white", border:"1px solid rgba(255,255,255,0.30)", borderRadius:999,
                  padding:"3px 9px", fontSize:11, fontFamily:SANS, letterSpacing:"0.06em",
                  backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)"
                }}>
                  +{photos.length-1} photos
                </div>
              )}
            </div>
          </div>

          {/* Extra photos as a compact strip */}
          {photos.length > 1 && (
            <div style={{ display:"flex", gap:6, margin:"10px 12px 0", overflowX:"auto",
              scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", paddingBottom:4 }}>
              {photos.slice(1).map((src,i)=>(
                <div key={i} onClick={()=>onPhotoClick&&onPhotoClick(src)}
                  style={{ flexShrink:0, scrollSnapAlign:"start",
                    background:"white", padding:"4px 4px 12px",
                    boxShadow:"0 2px 8px rgba(60,48,36,0.14)",
                    transform:`rotate(${TILTS[(i+1)%TILTS.length]}deg)`,
                    cursor:"zoom-in", width:64 }}>
                  <img src={src} style={{ display:"block", width:"100%", height:50, objectFit:"cover" }}/>
                </div>
              ))}
            </div>
          )}

          {/* Text below image */}
          <div style={{ margin:"10px 12px 0", background:T.surface,
            border:`1px solid ${T.border}`, borderRadius:14, padding:"10px 14px 12px",
            boxShadow:"0 4px 12px rgba(60,48,36,0.06)" }}>
            <HeaderRow e={e} c={c} names={names} mood={mood} showMood={false}/>
            <TextBody e={e}/>
            <ActionRow e={e} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview}/>
          </div>
        </div>
      ) : (
        // ── Text only layout ──
        <div style={{ padding:"12px 15px 11px" }}>
          <HeaderRow e={e} c={c} names={names} mood={mood}/>
          <TextBody e={e}/>
          <ActionRow e={e} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview}/>
        </div>
      )}

      {/* Reactions */}
      <div style={{ padding:"0 15px 11px" }}>
        <ReactionBar entryId={e.id} reactions={e.reactions}/>
      </div>
    </div>
  );
}

function HeaderRow({ e, c, names, mood, showMood = true }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:4 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:11, fontFamily:SANS, letterSpacing:"0.1em", textTransform:"uppercase",
          color:c.text, background:c.dim, padding:"3px 9px", borderRadius:20 }}>
          {e.writer==="a" ? names.a : names.b}
        </span>
        {showMood && (
          <>
            <FaceSvg index={e.hearts-1} size={18} color={c.text}/>
            <span style={{ fontSize:11, color:T.inkLight, fontFamily:SANS }}>{mood.label}</span>
          </>
        )}
      </div>
      <span style={{ fontSize:12, color:T.inkLight, fontFamily:SANS }}>
        {fmtTime(e.at)}
      </span>
    </div>
  );
}

function TextBody({ e }) {
  return (
    <>
      {e.location && <div style={{ display:"flex", gap:8, marginBottom:4 }}><span style={{ fontSize:12, color:T.inkLight }}>◎</span><span style={{ fontSize:14, color:T.ink, fontFamily:SANS, lineHeight:1.45 }}>{e.location}</span></div>}
      {e.food     && <div style={{ display:"flex", gap:8, marginBottom:4 }}><span style={{ fontSize:12, color:T.inkLight }}>◈</span><span style={{ fontSize:14, color:T.ink, fontFamily:SANS, lineHeight:1.45 }}>{e.food}</span></div>}
      {e.notes    && <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}`, fontSize:16, color:T.inkMid, fontFamily:DISPLAY, fontStyle:"italic", lineHeight:1.6 }}>"{e.notes}"</div>}
    </>
  );
}

function ActionRow({ e, onEdit, onRemove, onPreview }) {
  const btnStyle = (col) => ({
    background:"none", border:"none", fontSize:11, color:T.inkLight, cursor:"pointer",
    padding:0, fontFamily:SANS, letterSpacing:"0.05em", transition:"color 0.15s"
  });
  return (
    <div style={{ display:"flex", gap:12, marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}` }}>
      <button style={btnStyle(T.teal)} onClick={()=>onPreview(e)}
        onMouseEnter={ev=>ev.target.style.color=T.teal} onMouseLeave={ev=>ev.target.style.color=T.inkLight}>preview ↗</button>
      <button style={btnStyle(T.caramel)} onClick={()=>onEdit(e)}
        onMouseEnter={ev=>ev.target.style.color=T.caramel} onMouseLeave={ev=>ev.target.style.color=T.inkLight}>edit</button>
      <button style={btnStyle(T.rose)} onClick={()=>onRemove(e.id)}
        onMouseEnter={ev=>ev.target.style.color=T.rose} onMouseLeave={ev=>ev.target.style.color=T.inkLight}>remove</button>
    </div>
  );
}

// ─── Day group (same day, both people) ───────────────────
function DayGroup({ date, entries, names, onEdit, onRemove, onPreview, onPhotoClick }) {
  const aEntries = entries.filter(e=>e.writer==="a");
  const bEntries = entries.filter(e=>e.writer==="b");

  return (
    <div style={{ marginBottom:24 }}>
      {/* Day header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ height:1, flex:1, background:T.border }}/>
        <span style={{ fontSize:12, color:T.inkMid, fontFamily:SANS, letterSpacing:"0.08em",
          background:T.cloudDancer, padding:"3px 12px", border:`1.5px solid ${T.border}`,
          borderRadius:20, whiteSpace:"nowrap" }}>
          {dayLabel(date)}
        </span>
        <div style={{ height:1, flex:1, background:T.border }}/>
      </div>

      {/* If both wrote: show side-by-side on wide, stacked on narrow */}
      {aEntries.length > 0 && bEntries.length > 0 ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            {aEntries.map(e=><EntryCard key={e.id} e={e} names={names} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview} onPhotoClick={onPhotoClick}/>)}
          </div>
          <div>
            {bEntries.map(e=><EntryCard key={e.id} e={e} names={names} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview} onPhotoClick={onPhotoClick}/>)}
          </div>
        </div>
      ) : (
        <div>
          {entries.map(e=><EntryCard key={e.id} e={e} names={names} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview} onPhotoClick={onPhotoClick}/>)}
        </div>
      )}
    </div>
  );
}

// ─── Stats strip ─────────────────────────────────────────
function StatsStrip({ entries, names, loveStartDate }) {
  const cA = entries.filter(e=>e.writer==="a").length;
  const cB = entries.filter(e=>e.writer==="b").length;
  const avg = entries.length ? entries.reduce((s,e)=>s+e.hearts,0)/entries.length : 0;
  const topMood = moodOf(Math.round(avg));
  const days = calcDays(loveStartDate);

  return (
    <div style={{ marginBottom:"1.2rem" }}>
      {/* Love counter banner */}
      {days !== null && (
        <div style={{ background:`linear-gradient(135deg, ${T.roseDim}, ${T.tealDim})`,
          border:`1.5px solid ${T.border}`, borderRadius:14, padding:"12px 18px",
          marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:DISPLAY, fontSize:32, fontStyle:"italic", color:T.ink, lineHeight:1 }}>
              {days} <span style={{ fontSize:20 }}>days</span>
            </div>
            <div style={{ fontSize:11, color:T.inkLight, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:3 }}>
              fall in love
            </div>
          </div>
          <div style={{ fontSize:32 }}>🌸</div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:"flex", background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
        {[{val:cA,label:names.a,col:T.rose},{val:cB,label:names.b,col:T.teal}].map((s,i)=>(
          <div key={i} style={{ flex:1, padding:"12px 14px", borderRight:`1.5px solid ${T.border}` }}>
            <div style={{ fontSize:22, fontFamily:DISPLAY, fontWeight:600, color:s.col, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:11, color:T.inkLight, marginTop:4, letterSpacing:"0.08em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:s.col, display:"inline-block" }}/>
              {s.label}
            </div>
          </div>
        ))}
        <div style={{ flex:1.4, padding:"12px 14px" }}>
          {entries.length
            ? <FaceSvg index={topMood.n-1} size={24} color={T.caramel}/>
            : <span style={{ fontSize:18, color:T.inkLight }}>—</span>}
          <div style={{ fontSize:11, color:T.inkLight, marginTop:4, letterSpacing:"0.08em", textTransform:"uppercase" }}>
            {entries.length ? topMood.label : "no entries"}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Home / Archive pages ────────────────────────────────
function PrimaryButton({ children, onClick, variant = "dark" }) {
  const dark = variant === "dark";
  return (
    <button onClick={onClick}
      style={{
        border:"none", borderRadius:999, padding:"13px 18px", cursor:"pointer",
        background: dark ? T.ink : T.surface, color: dark ? T.cloudDancer : T.inkMid,
        fontFamily:SANS, fontSize:13, letterSpacing:"0.06em", fontWeight:500,
        boxShadow: dark ? "0 10px 28px rgba(28,24,20,0.18)" : "none",
        borderWidth: dark ? 0 : 1.5, borderStyle: dark ? "none" : "solid", borderColor: T.border
      }}>
      {children}
    </button>
  );
}

function countPhotos(entries) {
  return entries.reduce((sum, e)=>sum + getPhotos(e).length, 0);
}
function flattenDayEntries(dayEntries) {
  return dayEntries.flatMap(([, entries])=>entries);
}
function getCover(entries) {
  const withPhoto = entries.find(e=>getPhotos(e).length > 0);
  return withPhoto ? getPhotos(withPhoto)[0] : null;
}

function HomePage({ entries, names, loveStartDate, onOpenArchive, onAdd, onSetup }) {
  const recent = entries[0];
  const recentMood = recent ? moodOf(recent.hearts) : null;
  const days = calcDays(loveStartDate);

  return (
    <div style={{ minHeight:"100vh", background:T.cloudDancer, fontFamily:SANS, padding:"1.5rem 1rem 5rem" }}>
      <div style={{ maxWidth:680, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:"1.5rem" }}>
          <IconBtn onClick={onSetup}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </IconBtn>
        </div>

        <div style={{ minHeight:"58vh", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <div style={{ fontSize:12, color:T.inkLight, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:8 }}>
            {names.a} & {names.b}
          </div>
          <div style={{ fontFamily:DISPLAY, fontSize:72, color:T.ink, fontStyle:"italic", fontWeight:500, lineHeight:0.95 }}>
            Chapters
          </div>
          <div style={{ fontFamily:DISPLAY, fontSize:24, color:T.inkMid, fontStyle:"italic", marginTop:14, lineHeight:1.35 }}>
            A private little place for the dates, food, photos, and tiny feelings worth keeping.
          </div>

          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:28 }}>
            <PrimaryButton onClick={onOpenArchive}>OPEN ARCHIVE</PrimaryButton>
            <PrimaryButton onClick={onAdd} variant="light">+ NEW CHAPTER</PrimaryButton>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginTop:28 }}>
            <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:16, padding:"13px 14px" }}>
              <div style={{ fontFamily:DISPLAY, fontSize:26, color:T.rose, lineHeight:1 }}>{entries.length}</div>
              <div style={{ fontSize:10, color:T.inkLight, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:5 }}>entries</div>
            </div>
            <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:16, padding:"13px 14px" }}>
              <div style={{ fontFamily:DISPLAY, fontSize:26, color:T.teal, lineHeight:1 }}>{countPhotos(entries)}</div>
              <div style={{ fontSize:10, color:T.inkLight, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:5 }}>photos</div>
            </div>
            <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:16, padding:"13px 14px" }}>
              <div style={{ fontFamily:DISPLAY, fontSize:26, color:T.caramel, lineHeight:1 }}>{days !== null ? days : "—"}</div>
              <div style={{ fontSize:10, color:T.inkLight, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:5 }}>days</div>
            </div>
          </div>
        </div>

        {recent && (
          <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:20, padding:"16px 18px", boxShadow:"0 10px 30px rgba(60,48,36,0.08)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <div>
                <div style={{ fontSize:11, color:T.inkLight, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:5 }}>latest chapter</div>
                <div style={{ fontFamily:DISPLAY, fontSize:24, color:T.ink, fontStyle:"italic" }}>{fmtDate(recent.date)}</div>
                <div style={{ fontSize:13, color:T.inkMid, marginTop:4 }}>
                  {[recent.location, recent.food].filter(Boolean).join(" · ") || recent.notes || "A saved memory"}
                </div>
              </div>
              <MoodBadge mood={recentMood} color={COL[recent.writer]?.text || T.caramel}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSearchControls({ entries, filtered, names, filter, setFilter, search, setSearch, showSearch, setShowSearch }) {
  return (
    <>
      {showSearch && (
        <div style={{ marginBottom:"1rem" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search entries..." autoFocus
            style={{...fieldBase, fontSize:14, borderColor:search?T.caramel:T.border}}/>
          {search && <div style={{ fontSize:12, color:T.inkLight, marginTop:6 }}>{filtered.length} result{filtered.length!==1?"s":""}</div>}
        </div>
      )}

      <div style={{ display:"flex", gap:6, marginBottom:"1.2rem", flexWrap:"wrap" }}>
        {[["all","All"],["a",names.a],["b",names.b]].map(([k,label])=>(
          <button key={k} onClick={()=>setFilter(k)}
            style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontFamily:SANS, cursor:"pointer",
              border:`1.5px solid ${filter===k?T.caramel:T.border}`,
              background:filter===k?"rgba(196,122,72,0.08)":"transparent",
              color:filter===k?T.caramel:T.inkLight, letterSpacing:"0.06em", transition:"all 0.2s" }}>
            {label}
          </button>
        ))}
        <button onClick={()=>setShowSearch(s=>!s)}
          style={{ marginLeft:"auto", padding:"6px 12px", borderRadius:20, fontSize:12, fontFamily:SANS, cursor:"pointer",
            border:`1.5px solid ${showSearch?T.caramel:T.border}`, background:showSearch?"rgba(196,122,72,0.08)":"transparent",
            color:showSearch?T.caramel:T.inkLight, letterSpacing:"0.06em" }}>
          search
        </button>
      </div>
    </>
  );
}

function MonthCard({ month, dayEntries, onClick }) {
  const all = flattenDayEntries(dayEntries);
  const cover = getCover(all);
  const avg = all.length ? Math.round(all.reduce((s,e)=>s+e.hearts,0)/all.length) : 3;
  const mood = moodOf(avg);
  const days = dayEntries.length;
  return (
    <button onClick={onClick}
      style={{
        width:"100%", textAlign:"left", border:"none", padding:0, borderRadius:20, overflow:"hidden",
        background:T.surface, borderWidth:1.5, borderStyle:"solid", borderColor:T.border,
        boxShadow:"0 8px 24px rgba(60,48,36,0.08)", cursor:"pointer"
      }}>
      {cover ? (
        <div style={{ position:"relative", height:150, overflow:"hidden" }}>
          <img src={cover} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(28,24,20,0.08), rgba(28,24,20,0.60))" }}/>
          <div style={{ position:"absolute", right:12, top:12 }}>
            <MoodBadge mood={mood} color="white" glass={true}/>
          </div>
          <div style={{ position:"absolute", left:14, bottom:12, color:"white" }}>
            <div style={{ fontFamily:DISPLAY, fontSize:30, fontStyle:"italic", lineHeight:1 }}>{monthLabel(month)}</div>
            <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", opacity:0.82, marginTop:3 }}>
              {all.length} entries · {countPhotos(all)} photos
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding:"18px 18px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
            <div>
              <div style={{ fontFamily:DISPLAY, fontSize:30, color:T.ink, fontStyle:"italic", lineHeight:1 }}>{monthLabel(month)}</div>
              <div style={{ fontSize:11, color:T.inkLight, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:7 }}>
                {all.length} entries · {days} day{days!==1?"s":""}
              </div>
            </div>
            <MoodBadge mood={mood} color={T.caramel}/>
          </div>
        </div>
      )}
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, color:T.inkMid, fontFamily:SANS }}>Open this month</span>
        <span style={{ color:T.inkLight }}>→</span>
      </div>
    </button>
  );
}

function ArchivePage({ entries, filtered, names, loveStartDate, filter, setFilter, search, setSearch, showSearch, setShowSearch, onHome, onSetup, onAdd, onOpenMonth }) {
  const monthDayGroups = groupByMonthDay(filtered);
  return (
    <div style={{ minHeight:"100vh", background:T.cloudDancer, fontFamily:SANS }}>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"1.5rem 1rem 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.2rem" }}>
          <div>
            <button onClick={onHome} style={{ background:"none", border:"none", padding:0, color:T.inkLight, fontSize:12, cursor:"pointer", marginBottom:8 }}>← home</button>
            <div style={{ fontFamily:DISPLAY, fontSize:46, color:T.ink, fontStyle:"italic", fontWeight:500, lineHeight:1 }}>Archive</div>
            <div style={{ fontSize:12, color:T.inkLight, letterSpacing:"0.13em", textTransform:"uppercase", marginTop:5 }}>
              {entries.length>0?`${entries.length} entries · ${names.a} & ${names.b}`:`${names.a} & ${names.b}`}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, paddingTop:4 }}>
            <IconBtn active={showSearch} onClick={()=>setShowSearch(s=>!s)}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            </IconBtn>
            <IconBtn onClick={onSetup}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </IconBtn>
          </div>
        </div>

        {entries.length>0&&!search && <StatsStrip entries={entries} names={names} loveStartDate={loveStartDate}/>}
        <FilterSearchControls entries={entries} filtered={filtered} names={names} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} showSearch={showSearch} setShowSearch={setShowSearch}/>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"0 1rem 6rem" }}>
        {filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:"6rem 2rem" }}>
            <div style={{ fontFamily:DISPLAY, fontSize:60, color:T.inkLight, opacity:0.2, fontStyle:"italic" }}>✦</div>
            <div style={{ fontFamily:DISPLAY, fontSize:28, color:T.inkMid, marginTop:16, fontStyle:"italic" }}>
              {search?`Nothing found for "${search}"`:"Your story starts here"}
            </div>
            <div style={{ fontSize:13, color:T.inkLight, marginTop:8, letterSpacing:"0.06em" }}>
              {search?"Try different keywords":"Tap + to write the first chapter"}
            </div>
          </div>
        ) : (
          <div style={{ display:"grid", gap:14 }}>
            {monthDayGroups.map(([month, dayEntries])=>(
              <MonthCard key={month} month={month} dayEntries={dayEntries} onClick={()=>onOpenMonth(month)}/>
            ))}
          </div>
        )}
      </div>

      <button onClick={onAdd}
        style={{ position:"fixed", bottom:"2rem", right:"2rem", width:54, height:54, borderRadius:"50%",
          background:T.ink, border:"none", color:T.cloudDancer, fontSize:26, cursor:"pointer",
          boxShadow:"0 8px 24px rgba(28,24,20,0.22)", display:"flex", alignItems:"center",
          justifyContent:"center", zIndex:100, transition:"transform 0.2s" }}
        onMouseEnter={ev=>ev.currentTarget.style.transform="scale(1.08)"}
        onMouseLeave={ev=>ev.currentTarget.style.transform="scale(1)"}>+</button>
    </div>
  );
}

function MonthPage({ month, filtered, entries, names, filter, setFilter, search, setSearch, showSearch, setShowSearch, onBack, onHome, onAdd, onEdit, onRemove, onPreview, onPhotoClick }) {
  const monthEntries = filtered.filter(e=>(e.date ? e.date.slice(0,7) : "~") === month);
  const dayEntries = (groupByMonthDay(monthEntries)[0] || [month, []])[1];
  return (
    <div style={{ minHeight:"100vh", background:T.cloudDancer, fontFamily:SANS }}>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"1.5rem 1rem 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.2rem" }}>
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:8 }}>
              <button onClick={onBack} style={{ background:"none", border:"none", padding:0, color:T.inkLight, fontSize:12, cursor:"pointer" }}>← archive</button>
              <button onClick={onHome} style={{ background:"none", border:"none", padding:0, color:T.inkLight, fontSize:12, cursor:"pointer" }}>home</button>
            </div>
            <div style={{ fontFamily:DISPLAY, fontSize:42, color:T.ink, fontStyle:"italic", fontWeight:500, lineHeight:1 }}>{monthLabel(month)}</div>
            <div style={{ fontSize:12, color:T.inkLight, letterSpacing:"0.13em", textTransform:"uppercase", marginTop:5 }}>
              {monthEntries.length} entries in this collection
            </div>
          </div>
          <IconBtn active={showSearch} onClick={()=>setShowSearch(s=>!s)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          </IconBtn>
        </div>
        <FilterSearchControls entries={entries} filtered={monthEntries} names={names} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} showSearch={showSearch} setShowSearch={setShowSearch}/>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"0 1rem 6rem" }}>
        {monthEntries.length===0 ? (
          <div style={{ textAlign:"center", padding:"5rem 2rem" }}>
            <div style={{ fontFamily:DISPLAY, fontSize:28, color:T.inkMid, fontStyle:"italic" }}>No entries in this view</div>
            <div style={{ fontSize:13, color:T.inkLight, marginTop:8 }}>Try clearing search or changing the filter.</div>
          </div>
        ) : dayEntries.map(([date, dayEnts]) => (
          <DayGroup
            key={date} date={date} entries={dayEnts} names={names}
            onEdit={onEdit} onRemove={onRemove}
            onPreview={onPreview} onPhotoClick={onPhotoClick}
          />
        ))}
      </div>

      <button onClick={onAdd}
        style={{ position:"fixed", bottom:"2rem", right:"2rem", width:54, height:54, borderRadius:"50%",
          background:T.ink, border:"none", color:T.cloudDancer, fontSize:26, cursor:"pointer",
          boxShadow:"0 8px 24px rgba(28,24,20,0.22)", display:"flex", alignItems:"center",
          justifyContent:"center", zIndex:100, transition:"transform 0.2s" }}
        onMouseEnter={ev=>ev.currentTarget.style.transform="scale(1.08)"}
        onMouseLeave={ev=>ev.currentTarget.style.transform="scale(1)"}>+</button>
    </div>
  );
}

// ─── Preview modal ───────────────────────────────────────
function PreviewModal({ entry, names, onClose }) {
  const c = COL[entry.writer];
  const mood = moodOf(entry.hearts);
  const photos = getPhotos(entry);
  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(28,24,20,0.82)", display:"flex",
        alignItems:"center", justifyContent:"center", zIndex:998, padding:"1.5rem" }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:T.cloudDancer, borderRadius:20, maxWidth:420, width:"100%",
          maxHeight:"90vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ height:4, background:`linear-gradient(90deg,${c.text},transparent)` }}/>
        <div style={{ padding:"20px 22px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:DISPLAY, fontSize:26, fontStyle:"italic", color:T.ink }}>Chapters</div>
            <span style={{ fontSize:11, fontFamily:SANS, letterSpacing:"0.1em", textTransform:"uppercase",
              color:c.text, background:c.dim, padding:"3px 10px", borderRadius:20 }}>
              {entry.writer==="a"?names.a:names.b}
            </span>
          </div>
          <div style={{ fontSize:13, color:T.inkLight, fontFamily:SANS, marginBottom:10 }}>
            {fmtDate(entry.date)} {entry.at ? "· " + fmtTime(entry.at) : ""}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <FaceSvg index={mood.n-1} size={26} color={c.text}/>
            <span style={{ fontFamily:DISPLAY, fontStyle:"italic", fontSize:17, color:T.inkMid }}>{mood.label}</span>
          </div>
          {photos.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <PhotoStrip photos={photos} compact={false}/>
            </div>
          )}
          {entry.location && <div style={{ display:"flex", gap:10, marginBottom:8 }}><span style={{ color:T.inkLight }}>◎</span><span style={{ fontFamily:SANS, fontSize:15, color:T.ink }}>{entry.location}</span></div>}
          {entry.food     && <div style={{ display:"flex", gap:10, marginBottom:8 }}><span style={{ color:T.inkLight }}>◈</span><span style={{ fontFamily:SANS, fontSize:15, color:T.ink }}>{entry.food}</span></div>}
          {entry.notes    && <div style={{ fontFamily:DISPLAY, fontStyle:"italic", fontSize:16, color:T.inkMid, lineHeight:1.6, borderTop:`1px solid ${T.border}`, paddingTop:12, marginTop:8, marginBottom:12 }}>"{entry.notes}"</div>}
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button onClick={onClose}
              style={{ flex:1, padding:10, borderRadius:10, border:`1.5px solid ${T.border}`, background:"transparent", fontFamily:SANS, fontSize:13, color:T.inkMid, cursor:"pointer" }}>close</button>
            <button onClick={()=>downloadCard(entry,names)}
              style={{ flex:2, padding:10, borderRadius:10, border:"none", background:T.ink, color:T.cloudDancer, fontFamily:SANS, fontSize:13, fontWeight:500, cursor:"pointer" }}>↓ download</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Download card ───────────────────────────────────────
async function downloadCard(entry, names) {
  const W=640, PAD=40;
  const photos = getPhotos(entry);
  const mood = moodOf(entry.hearts);
  let photoImg=null, photoH=0;
  if (photos.length) {
    photoImg = await new Promise(res => {
      const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=photos[0];
    });
    if (photoImg) photoH=Math.round((photoImg.height/photoImg.width)*(W-PAD*2));
  }
  const H=300+(photoImg?photoH+24:0);
  const canvas=document.createElement("canvas");
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#F0EEE9"; ctx.fillRect(0,0,W,H);
  const grad=ctx.createLinearGradient(0,0,W,0);
  grad.addColorStop(0, entry.writer==="a"?"#BC5C58":"#3D7E8A");
  grad.addColorStop(1,"transparent");
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,4);
  ctx.font="italic 500 40px Georgia,serif"; ctx.fillStyle="#1C1814";
  ctx.fillText("Chapters",PAD,56);
  const aC=entry.writer==="a"?"#BC5C58":"#3D7E8A";
  ctx.fillStyle=aC+"22"; ctx.beginPath();
  try { ctx.roundRect(PAD,70,130,24,12); } catch { ctx.rect(PAD,70,130,24); }
  ctx.fill(); ctx.fillStyle=aC; ctx.font="500 11px Arial,sans-serif";
  ctx.fillText((entry.writer==="a"?names.a:names.b).toUpperCase(),PAD+12,88);
  ctx.fillStyle="#A0948A"; ctx.font="13px Arial,sans-serif";
  ctx.fillText(fmtDate(entry.date)+(entry.at?" · "+fmtTime(entry.at):""),W-PAD-200,88);
  ctx.font="14px Arial"; ctx.fillText(mood.label,PAD,118);
  let y=138;
  if (photoImg) {
    const pw=W-PAD*2;
    ctx.fillStyle="white"; ctx.shadowColor="rgba(60,48,36,0.18)"; ctx.shadowBlur=16; ctx.shadowOffsetY=4;
    ctx.fillRect(PAD-8,y-8,pw+16,photoH+30); ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    ctx.drawImage(photoImg,PAD,y,pw,photoH); y+=photoH+44;
  }
  ctx.fillStyle="#1C1814"; ctx.font="15px Arial,sans-serif";
  if (entry.location){ctx.fillText("◎  "+entry.location,PAD,y);y+=26;}
  if (entry.food){ctx.fillText("◈  "+entry.food,PAD,y);y+=26;}
  if (entry.notes){
    ctx.fillStyle="#5A5048"; ctx.font="italic 15px Georgia,serif";
    const words=("\""+entry.notes+"\"").split(" "); let line="",ly=y+8;
    for (const w of words){const t=line+w+" ";if(ctx.measureText(t).width>W-PAD*2&&line){ctx.fillText(line,PAD,ly);ly+=22;line=w+" ";}else line=t;}
    if(line)ctx.fillText(line,PAD,ly);
  }
  const a=document.createElement("a");
  a.download=`chapters-${entry.date||"entry"}.png`;
  a.href=canvas.toDataURL("image/png"); a.click();
}

// ─── Entry form (add / edit) ─────────────────────────────
function EntryForm({ initial, names, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState(initial);
  const [previews, setPreviews] = useState(initial.photos || (initial.photo ? [initial.photo] : []));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const f = v => setForm(p=>({...p,...v}));

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const results = await Promise.all(files.map(file => resizeImage(file)));
    const merged = [...previews, ...results].slice(0, 6); // max 6 photos
    setPreviews(merged);
    f({ photos: merged, photo: null });
    setUploading(false);
  }

  function removePhoto(i) {
    const next = previews.filter((_,idx)=>idx!==i);
    setPreviews(next); f({ photos: next });
  }

  return (
    <div style={{ minHeight:"100vh", background:T.cloudDancer, fontFamily:SANS, padding:"1rem" }}>
      <div style={{ maxWidth:520, margin:"0 auto", paddingBottom:"3rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, padding:"1rem 0 2rem" }}>
          <button onClick={onCancel}
            style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:10,
              width:40, height:40, fontSize:18, cursor:"pointer", color:T.inkMid,
              display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <div>
            <div style={{ fontFamily:DISPLAY, fontSize:28, color:T.ink, fontStyle:"italic" }}>{isEdit?"Edit entry":"New entry"}</div>
            <div style={{ fontSize:11, color:T.inkLight, letterSpacing:"0.12em", textTransform:"uppercase" }}>{isEdit?"make changes":"add a chapter"}</div>
          </div>
        </div>

        {/* Writer */}
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:T.inkLight, marginBottom:10 }}>Written by</div>
          <div style={{ display:"flex", gap:10 }}>
            {["a","b"].map(w=>{
              const c=COL[w]; const active=form.writer===w;
              return (
                <button key={w} onClick={()=>f({writer:w})}
                  style={{ flex:1, padding:"12px 0", borderRadius:12, fontSize:14, fontFamily:SANS, fontWeight:500, cursor:"pointer",
                    border:`1.5px solid ${active?c.border:T.border}`, background:active?c.dim:"transparent",
                    color:active?c.text:T.inkLight, transition:"all 0.2s" }}>
                  {w==="a"?names.a:names.b}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Date"          icon="—" value={form.date}     onChange={v=>f({date:v})}     type="date"/>
        <Field label="Location"      icon="—" value={form.location} onChange={v=>f({location:v})} placeholder="Where did you go?"/>
        <Field label="Food & drinks" icon="—" value={form.food}     onChange={v=>f({food:v})}     placeholder="What did you have?"/>

        <div style={{ marginBottom:"1rem" }}>
          <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:T.inkLight, marginBottom:7 }}>— &nbsp; Notes</div>
          <textarea value={form.notes} onChange={e=>f({notes:e.target.value})} placeholder="Something you want to remember..." rows={3}
            style={{...fieldBase, resize:"vertical", lineHeight:1.6}}/>
        </div>

        {/* Multi-photo */}
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:T.inkLight, marginBottom:10 }}>— &nbsp; Photos ({previews.length}/6)</div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotos} style={{ display:"none" }}/>

          {previews.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ overflowX:"auto", display:"flex", gap:10, paddingBottom:8, scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch" }}>
                {previews.map((src,i)=>(
                  <div key={i} style={{ flexShrink:0, scrollSnapAlign:"start", position:"relative",
                    background:"white", padding:"6px 6px 18px",
                    boxShadow:"0 3px 10px rgba(60,48,36,0.14)", width:130 }}>
                    <img src={src} style={{ display:"block", width:"100%", height:90, objectFit:"cover" }}/>
                    <button onClick={()=>removePhoto(i)}
                      style={{ position:"absolute", top:4, right:4, background:"rgba(28,24,20,0.6)",
                        border:"none", color:"white", borderRadius:"50%", width:20, height:20,
                        fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previews.length < 6 && (
            <button onClick={()=>fileRef.current.click()}
              style={{ width:"100%", padding:"18px", borderRadius:12, border:`1.5px dashed ${T.border}`,
                background:"transparent", color:T.inkLight, fontSize:13, fontFamily:SANS, cursor:"pointer",
                letterSpacing:"0.06em", transition:"all 0.2s" }}
              onMouseEnter={ev=>{ev.currentTarget.style.borderColor=T.caramel;ev.currentTarget.style.color=T.inkMid;}}
              onMouseLeave={ev=>{ev.currentTarget.style.borderColor=T.border;ev.currentTarget.style.color=T.inkLight;}}>
              {uploading?"processing…":`+ add photo${previews.length>0?" (add more)":""}`}
            </button>
          )}
        </div>

        {/* Mood */}
        <div style={{ marginBottom:"2.5rem" }}>
          <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:T.inkLight, marginBottom:14 }}>— &nbsp; How was it?</div>
          <div style={{ display:"flex", gap:8 }}>
            {MOODS.map((m,i)=>{
              const active=form.hearts===m.n; const c=COL[form.writer];
              return (
                <button key={m.n} onClick={()=>f({hearts:m.n})}
                  style={{ flex:1, padding:"12px 4px 8px", borderRadius:12,
                    border:`1.5px solid ${active?c.border:T.border}`,
                    background:active?c.dim:"transparent", cursor:"pointer",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:6, transition:"all 0.18s" }}>
                  <FaceSvg index={i} size={26} color={active?c.text:T.inkLight}/>
                  <span style={{ fontSize:10, color:active?c.text:T.inkLight, fontFamily:SANS, letterSpacing:"0.03em", textAlign:"center" }}>
                    {m.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={()=>onSave(form)}
          style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:T.ink,
            color:T.cloudDancer, fontSize:14, fontWeight:500, fontFamily:SANS, cursor:"pointer", letterSpacing:"0.08em" }}>
          {isEdit?"SAVE CHANGES":"SAVE THIS CHAPTER"}
        </button>
      </div>
    </div>
  );
}

// ─── Icon button ─────────────────────────────────────────
function IconBtn({ children, onClick, active }) {
  const [hov,setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:active||hov?T.surface2:"transparent", border:`1.5px solid ${active?T.caramel:T.border}`,
        borderRadius:10, width:40, height:40, cursor:"pointer", color:active?T.caramel:T.inkMid,
        display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
      {children}
    </button>
  );
}

// ─── Lightbox ─────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(28,24,20,0.94)", display:"flex",
        alignItems:"center", justifyContent:"center", zIndex:999, cursor:"zoom-out", padding:"1.5rem" }}>
      <div style={{ background:"white", padding:"10px 10px 32px", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
        <img src={src} style={{ display:"block", maxWidth:"85vw", maxHeight:"80vh", objectFit:"contain" }}/>
      </div>
    </div>
  );
}

// ─── Setup page ───────────────────────────────────────────
function SetupPage({ names, loveStartDate, themeId, onSave, onCancel }) {
  const [na, setNa] = useState(names.a);
  const [nb, setNb] = useState(names.b);
  const [startDate, setStartDate] = useState(loveStartDate || "");
  const [selectedTheme, setSelectedTheme] = useState(themeId || "warm");

  return (
    <div style={{ minHeight:"100vh", background:T.cloudDancer, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem", fontFamily:SANS }}>
      <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:22,
        padding:"2.5rem 2rem", maxWidth:430, width:"100%", boxShadow:"0 16px 48px rgba(60,48,36,0.12)" }}>
        <div style={{ fontFamily:DISPLAY, fontSize:32, color:T.ink, fontStyle:"italic", marginBottom:6 }}>Settings</div>
        <div style={{ fontSize:13, color:T.inkLight, marginBottom:"1.8rem" }}>Names, love counter & custom theme</div>

        {[["a",T.rose,na,setNa],["b",T.teal,nb,setNb]].map(([w,col,val,set])=>(
          <div key={w} style={{ marginBottom:"1rem" }}>
            <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:T.inkLight, marginBottom:7, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:7,height:7,borderRadius:"50%",background:col,display:"inline-block" }}/>
              {w==="a"?"first person":"second person"}
            </div>
            <input value={val} onChange={e=>set(e.target.value)} placeholder={names[w]}
              style={{...fieldBase, borderColor:col+"44"}}/>
          </div>
        ))}

        <div style={{ marginBottom:"1.5rem", marginTop:"1.4rem" }}>
          <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:T.inkLight, marginBottom:7 }}>
            🌸 &nbsp; Fall in love since
          </div>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
            style={{...fieldBase}}/>
          {startDate && (
            <div style={{ fontSize:13, color:T.caramel, marginTop:6, fontFamily:DISPLAY, fontStyle:"italic" }}>
              {calcDays(startDate)} days together ✦
            </div>
          )}
        </div>

        <div style={{ marginBottom:"1.8rem" }}>
          <div style={{ fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:T.inkLight, marginBottom:10 }}>
            ✦ &nbsp; Theme
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {Object.entries(THEME_PALETTES).map(([id, theme])=>{
              const active = selectedTheme === id;
              return (
                <button key={id} onClick={()=>setSelectedTheme(id)}
                  style={{
                    textAlign:"left", padding:12, borderRadius:14, cursor:"pointer",
                    border:`1.5px solid ${active ? theme.values.caramel : T.border}`,
                    background: active ? theme.values.surface2 : "transparent",
                    transition:"all 0.2s"
                  }}>
                  <div style={{ display:"flex", gap:5, marginBottom:9 }}>
                    {[theme.values.cloudDancer, theme.values.rose, theme.values.teal, theme.values.caramel].map((color,i)=>(
                      <span key={i} style={{ width:18, height:18, borderRadius:"50%", background:color, border:"1px solid rgba(0,0,0,0.08)", display:"inline-block" }}/>
                    ))}
                  </div>
                  <div style={{ fontSize:13, color: active ? theme.values.ink : T.ink, fontFamily:SANS, fontWeight:500 }}>
                    {theme.label}
                  </div>
                  <div style={{ fontSize:10, color: active ? theme.values.inkMid : T.inkLight, fontFamily:SANS, marginTop:3, letterSpacing:"0.04em" }}>
                    {theme.note}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:11, borderRadius:10, border:`1.5px solid ${T.border}`, background:"transparent", fontSize:14, fontFamily:SANS, cursor:"pointer", color:T.inkMid }}>Cancel</button>
          <button onClick={()=>onSave({a:na.trim()||"A",b:nb.trim()||"B"},startDate,selectedTheme)}
            style={{ flex:2, padding:11, borderRadius:10, border:"none", background:T.ink, color:T.cloudDancer, fontSize:14, fontWeight:500, fontFamily:SANS, cursor:"pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
const EMPTY_FORM = () => ({ writer:"a", date:today(), location:"", food:"", notes:"", hearts:3, photos:[], photo:null });

export default function App() {
  const [entries, setEntries]             = useState([]);
  const [names, setNames]                 = useState({ a:"A", b:"B" });
  const [loveStartDate, setLoveStartDate] = useState("");
  const [themeId, setThemeId]             = useState("warm");
  const [page, setPage]                   = useState("home");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [editEntry, setEditEntry]         = useState(null);
  const [filter, setFilter]               = useState("all");
  const [search, setSearch]               = useState("");
  const [showSearch, setShowSearch]       = useState(false);
  const [loaded, setLoaded]               = useState(false);
  const [lightboxSrc, setLightboxSrc]     = useState(null);
  const [previewEntry, setPreviewEntry]   = useState(null);

  useEffect(() => {
    const link=document.createElement("link"); link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(link);
    document.body.style.margin="0";

    getDoc(doc(db,"config","names")).then(s=>{ if(s.exists()) setNames(s.data()); });
    getDoc(doc(db,"config","settings")).then(s=>{
      if (!s.exists()) return;
      const settings = s.data();
      if (settings.loveStartDate) setLoveStartDate(settings.loveStartDate);
      if (settings.themeId) {
        applyTheme(settings.themeId);
        setThemeId(settings.themeId);
      }
    });

    const unsub = onSnapshot(collection(db,"entries"), snap=>{
      const data=snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(b.at||0)-(a.at||0));
      setEntries(data); setLoaded(true);
    });
    return ()=>unsub();
  }, []);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  async function handleSaveNew(form) {
    if (!form.location&&!form.food&&!form.notes&&!(form.photos?.length)&&!form.photo) return alert("Fill in at least one field.");
    const id=uid();
    await setDoc(doc(db,"entries",id),{...form,at:Date.now()});
    const month = form.date ? form.date.slice(0,7) : "~";
    setSelectedMonth(month);
    setPage("month");
  }

  async function handleSaveEdit(form) {
    if (!editEntry) return;
    await setDoc(doc(db,"entries",editEntry.id),{...form,at:editEntry.at||Date.now()});
    const month = form.date ? form.date.slice(0,7) : "~";
    setSelectedMonth(month);
    setEditEntry(null);
    setPage("month");
  }

  async function handleRemove(id) {
    if (!confirm("Delete this entry?")) return;
    await deleteDoc(doc(db,"entries",id));
  }

  async function handleSaveSettings(newNames, newStartDate, newThemeId) {
    await setDoc(doc(db,"config","names"), newNames);
    await setDoc(doc(db,"config","settings"), { loveStartDate: newStartDate, themeId: newThemeId }, { merge:true });
    setNames(newNames);
    setLoveStartDate(newStartDate);
    setThemeId(newThemeId || "warm");
    setPage("home");
  }

  function startEdit(e) { setEditEntry(e); setPage("edit"); }
  function goHome() { setSelectedMonth(null); setPage("home"); }
  function goArchive() { setPage("archive"); }
  function openMonth(month) { setSelectedMonth(month); setPage("month"); }

  const filtered = entries
    .filter(e=>filter==="all"||e.writer===filter)
    .filter(e=>!search.trim()||[e.location,e.food,e.notes].some(f=>f?.toLowerCase().includes(search.toLowerCase())));

  // Render
  if (lightboxSrc) return <Lightbox src={lightboxSrc} onClose={()=>setLightboxSrc(null)}/>;

  if (!loaded) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:T.cloudDancer,gap:12 }}>
      <div style={{ fontSize:44,fontFamily:DISPLAY,fontStyle:"italic",color:T.ink }}>Chapters</div>
      <div style={{ fontSize:12,color:T.inkLight,fontFamily:SANS,letterSpacing:"0.14em" }}>connecting…</div>
    </div>
  );

  if (page==="setup") return (
    <SetupPage
      names={names} loveStartDate={loveStartDate} themeId={themeId}
      onSave={handleSaveSettings} onCancel={()=>setPage("home")}
    />
  );

  if (page==="add") return (
    <EntryForm
      initial={EMPTY_FORM()} names={names} onSave={handleSaveNew}
      onCancel={()=>setPage(selectedMonth ? "month" : "home")} isEdit={false}
    />
  );

  if (page==="edit"&&editEntry) return (
    <EntryForm
      initial={{ writer:editEntry.writer, date:editEntry.date||today(), location:editEntry.location||"",
        food:editEntry.food||"", notes:editEntry.notes||"", hearts:editEntry.hearts||3,
        photos:editEntry.photos||(editEntry.photo?[editEntry.photo]:[]), photo:null }}
      names={names} onSave={handleSaveEdit}
      onCancel={()=>{setEditEntry(null);setPage(selectedMonth ? "month" : "archive");}} isEdit={true}/>
  );

  const modal = previewEntry && <PreviewModal entry={previewEntry} names={names} onClose={()=>setPreviewEntry(null)}/>;

  if (page==="archive") return (
    <>
      {modal}
      <ArchivePage
        entries={entries} filtered={filtered} names={names} loveStartDate={loveStartDate}
        filter={filter} setFilter={setFilter} search={search} setSearch={setSearch}
        showSearch={showSearch} setShowSearch={setShowSearch}
        onHome={goHome} onSetup={()=>setPage("setup")} onAdd={()=>setPage("add")} onOpenMonth={openMonth}
      />
    </>
  );

  if (page==="month" && selectedMonth) return (
    <>
      {modal}
      <MonthPage
        month={selectedMonth} filtered={filtered} entries={entries} names={names}
        filter={filter} setFilter={setFilter} search={search} setSearch={setSearch}
        showSearch={showSearch} setShowSearch={setShowSearch}
        onBack={goArchive} onHome={goHome} onAdd={()=>setPage("add")}
        onEdit={startEdit} onRemove={handleRemove}
        onPreview={setPreviewEntry} onPhotoClick={setLightboxSrc}
      />
    </>
  );

  return (
    <HomePage
      entries={entries} names={names} loveStartDate={loveStartDate}
      onOpenArchive={goArchive} onAdd={()=>setPage("add")} onSetup={()=>setPage("setup")}
    />
  );
}
