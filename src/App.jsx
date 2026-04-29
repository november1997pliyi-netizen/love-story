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

  if (typeof document !== "undefined") {
    const root = document.getElementById("root");
    document.documentElement.style.background = T.cloudDancer;
    document.body.style.background = T.cloudDancer;
    document.documentElement.style.width = "100%";
    document.body.style.width = "100%";
    document.documentElement.style.maxWidth = "100%";
    document.body.style.maxWidth = "100%";
    document.documentElement.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";
    document.documentElement.style.position = "relative";
    document.body.style.position = "relative";
    document.body.style.margin = "0";
    document.documentElement.style.overscrollBehaviorX = "none";
    document.body.style.overscrollBehaviorX = "none";
    if (root) {
      root.style.background = T.cloudDancer;
      root.style.width = "100%";
      root.style.maxWidth = "100%";
      root.style.overflowX = "hidden";
      root.style.minHeight = "100vh";
    }
  }
}
const DISPLAY = "'Cormorant Garamond', 'Times New Roman', serif";
const SANS    = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── Moods ───────────────────────────────────────────────
const MOODS = [
  { n:1, label:"rough"     },
  { n:2, label:"okay"      },
  { n:3, label:"pretty good" },
  { n:4, label:"wonderful" },
];

// ─── Face SVGs ───────────────────────────────────────────
function FaceSvg({ index, size = 22, color }) {
  const safeIndex = Math.max(0, Math.min(3, index));
  const faces = [
    // 1 rough
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="7.8" cy="10" r="1" fill="currentColor"/>
      <circle cx="14.2" cy="10" r="1" fill="currentColor"/>
      <path d="M8 15 Q11 12 14 15" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/></>,
    // 2 okay
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <circle cx="7.8" cy="10" r="1" fill="currentColor"/>
      <circle cx="14.2" cy="10" r="1" fill="currentColor"/>
      <path d="M8 14 L14 14" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/></>,
    // 3 pretty good
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <path d="M7.2 9.4 Q8 8.7 8.8 9.4" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round"/>
      <path d="M13.2 9.4 Q14 8.7 14.8 9.4" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round"/>
      <path d="M7.9 13.4 Q11 16.2 14.1 13.4" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/></>,
    // 4 wonderful — line-art heart eyes inspired by 🥰, no yellow emoji
    <><circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
      <path d="M7.75 11.2C6.35 10.15 5.72 9.35 5.72 8.42C5.72 7.66 6.27 7.12 6.98 7.12C7.36 7.12 7.62 7.3 7.75 7.62C7.9 7.3 8.18 7.12 8.56 7.12C9.27 7.12 9.82 7.66 9.82 8.42C9.82 9.35 9.15 10.15 7.75 11.2Z" fill="none" strokeWidth="1.05" stroke="currentColor" strokeLinejoin="round"/>
      <path d="M14.25 11.2C12.85 10.15 12.18 9.35 12.18 8.42C12.18 7.66 12.73 7.12 13.44 7.12C13.82 7.12 14.1 7.3 14.25 7.62C14.38 7.3 14.64 7.12 15.02 7.12C15.73 7.12 16.28 7.66 16.28 8.42C16.28 9.35 15.65 10.15 14.25 11.2Z" fill="none" strokeWidth="1.05" stroke="currentColor" strokeLinejoin="round"/>
      <path d="M7.1 13.45 Q11 17.35 14.9 13.45" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
      <path d="M6.2 12.45 L5.35 12.05 M15.8 12.45 L16.65 12.05" fill="none" strokeWidth="1" stroke="currentColor" strokeLinecap="round"/></>,
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"
      style={{ color, display:"block", flexShrink:0 }}>
      {faces[safeIndex]}
    </svg>
  );
}

// ─── Utils ───────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function today() { return new Date().toISOString().split("T")[0]; }
function normalizeMoodValue(n) {
  const v = Number(n) || 3;
  if (v >= MOODS.length) return MOODS.length; // keep old 5-star records as wonderful
  return Math.max(1, v);
}
function moodOf(n) { return MOODS.find(m => m.n === normalizeMoodValue(n)) || MOODS[2]; }

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
  display:"block", width:"100%", maxWidth:"100%", minWidth:0, height:44,
  background:T.cloudDancer, border:`1.5px solid ${T.border}`,
  borderRadius:11, padding:"11px 14px", fontSize:15, fontFamily:SANS,
  color:T.ink, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s",
  appearance:"none", WebkitAppearance:"none",
};
function Field({ label, icon, value, onChange, placeholder, type="text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:"1rem", width:"100%", maxWidth:"100%", boxSizing:"border-box" }}>
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
  { key:"haha",  emoji:"😄"  },
  { key:"cheer", emoji:"💪"  },
  { key:"hug",   emoji:"🤗"  },
];
function ReactionBar({ entryId, reactions={}, compact = false }) {
  async function toggle(key) {
    const current = reactions[key] || 0;
    await updateDoc(doc(db,"entries",entryId), {
      [`reactions.${key}`]: current > 0 ? 0 : 1
    });
  }
  return (
    <div style={{ display:"flex", gap:compact ? 4 : 6, marginTop:compact ? 6 : 8, flexWrap:"wrap" }}>
      {REACTION_LIST.map(r => {
        const count = reactions[r.key] || 0;
        const active = count > 0;
        return (
          <button key={r.key} onClick={()=>toggle(r.key)}
            style={{ background: active ? "rgba(196,122,72,0.12)" : "transparent",
              border:`1.5px solid ${active ? T.caramel : T.border}`,
              borderRadius:20, padding:compact ? "2px 6px" : "3px 9px", fontSize:compact ? 12 : 14, cursor:"pointer",
              display:"flex", alignItems:"center", gap:compact ? 2 : 4, transition:"all 0.18s" }}>
            <span>{r.emoji}</span>
            {active && <span style={{ fontSize:11, color:T.caramel, fontFamily:SANS, fontWeight:500 }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Single entry card ───────────────────────────────────
function MoodBadge({ mood, color = T.ink, glass = false, compact = false }) {
  const moodColor = color;
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:compact ? 1 : 2, minWidth:compact ? 38 : 48,
      padding:glass ? 0 : (compact ? "5px 7px 4px" : "6px 8px 5px"),
      borderRadius:compact ? 12 : 14,
      background: glass ? "transparent" : T.surface,
      border: glass ? "none" : `1px solid ${T.border}`,
      boxShadow: glass ? "none" : "0 4px 14px rgba(60,48,36,0.08)",
      pointerEvents:"none"
    }}>
      <FaceSvg index={mood.n-1} size={compact ? 18 : 21} color={moodColor}/>
      <span style={{
        fontSize:compact ? 8.5 : 10, lineHeight:1, color:moodColor, fontFamily:SANS,
        letterSpacing:"0.035em", textTransform:"lowercase", whiteSpace:"nowrap",
        textShadow: glass ? "0 1px 3px rgba(0,0,0,0.72), 0 0 8px rgba(0,0,0,0.36)" : "none",
        fontWeight:500
      }}>
        {mood.label}
      </span>
    </div>
  );
}

function EntryCard({ e, names, onEdit, onRemove, onPreview, onPhotoClick, compact = false }) {
  const [hov, setHov] = useState(false);
  const c = COL[e.writer];
  const mood = moodOf(e.hearts);
  const photos = getPhotos(e);
  const hasPhoto = photos.length > 0;

  const cardRadius = compact ? 15 : 18;
  const innerPad = compact ? 7 : 12;
  const photoRadius = compact ? 12 : 15;

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background: T.cloudDancer, border:`1.5px solid ${hov?c.border:T.border}`,
        borderRadius:cardRadius, overflow:"hidden", transition:"all 0.25s",
        transform:hov?"translateY(-2px)":"none",
        boxShadow:hov?"0 8px 28px rgba(60,48,36,0.12)":"0 1px 4px rgba(60,48,36,0.06)",
        marginBottom:compact ? 10 : 14, width:"100%", maxWidth:"100%", minWidth:0, boxSizing:"border-box" }}>

      {/* Accent line */}
      <div style={{ height:3, background:`linear-gradient(90deg,${c.text}88,transparent)` }}/>

      {hasPhoto ? (
        <div>
          {/* Main photo */}
          <div style={{ padding:`${innerPad}px ${innerPad}px 0` }}>
            <div style={{
              position:"relative", overflow:"hidden", borderRadius:photoRadius, background:"white",
              boxShadow:"0 4px 16px rgba(60,48,36,0.14)"
            }}>
              <img
                src={photos[0]}
                onClick={()=>onPhotoClick&&onPhotoClick(photos[0])}
                style={{ display:"block", width:"100%", height:compact ? 178 : "auto", maxHeight:compact ? 178 : 300,
                  objectFit:"cover", cursor:"zoom-in" }}
              />

              <PhotoAuthorBadge e={e} c={c} names={names} compact={compact}/>
              <PhotoInfoOverlay e={e} compact={compact}/>

              <div style={{ position:"absolute", top:compact ? 7 : 10, right:compact ? 7 : 10 }}>
                <MoodBadge mood={mood} color="white" glass={true} compact={compact}/>
              </div>

              {photos.length > 1 && (
                <div style={{
                  position:"absolute", right:compact ? 7 : 10, bottom:compact ? 7 : 10,
                  color:"white", border:"1px solid rgba(255,255,255,0.24)", borderRadius:999,
                  padding:compact ? "2px 6px" : "3px 9px", fontSize:compact ? 9 : 11,
                  fontFamily:SANS, letterSpacing:"0.05em", background:"rgba(28,24,20,0.20)",
                  textShadow:"0 1px 4px rgba(0,0,0,0.65)", pointerEvents:"none"
                }}>
                  +{photos.length-1}
                </div>
              )}
            </div>
          </div>

          {/* Extra photos as a compact strip */}
          {photos.length > 1 && (
            <div style={{ display:"flex", gap:compact ? 4 : 6, margin:`${compact ? 7 : 10}px ${innerPad}px 0`, overflowX:"auto",
              scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", paddingBottom:4 }}>
              {photos.slice(1).map((src,i)=>(
                <div key={i} onClick={()=>onPhotoClick&&onPhotoClick(src)}
                  style={{ flexShrink:0, scrollSnapAlign:"start",
                    background:"white", padding:compact ? "3px 3px 9px" : "4px 4px 12px",
                    boxShadow:"0 2px 8px rgba(60,48,36,0.14)",
                    transform:`rotate(${TILTS[(i+1)%TILTS.length]}deg)`,
                    cursor:"zoom-in", width:compact ? 46 : 64 }}>
                  <img src={src} style={{ display:"block", width:"100%", height:compact ? 36 : 50, objectFit:"cover" }}/>
                </div>
              ))}
            </div>
          )}

          {/* Notes + actions below image */}
          <div style={{ margin:`${compact ? 7 : 10}px ${innerPad}px 0`, background:T.surface,
            border:`1px solid ${T.border}`, borderRadius:compact ? 12 : 14,
            padding:compact ? "8px 8px 10px" : "10px 14px 12px",
            boxShadow:"0 4px 12px rgba(60,48,36,0.06)" }}>
            <HeaderRow e={e} c={c} names={names} mood={mood} showMood={false} showAuthor={false} compact={compact}/>
            <TextBody e={e} hideMeta={true} compact={compact}/>
            <ActionRow e={e} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview} compact={compact}/>
          </div>
        </div>
      ) : (
        // ── Text only layout ──
        <div style={{ padding:compact ? "10px 9px 9px" : "12px 15px 11px" }}>
          <HeaderRow e={e} c={c} names={names} mood={mood} compact={compact}/>
          <TextBody e={e} compact={compact}/>
          <ActionRow e={e} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview} compact={compact}/>
        </div>
      )}

      {/* Reactions */}
      <div style={{ padding:compact ? "0 8px 9px" : "0 15px 11px" }}>
        <ReactionBar entryId={e.id} reactions={e.reactions} compact={compact}/>
      </div>
    </div>
  );
}


function HeaderRow({ e, c, names, mood, showMood = true, showAuthor = true, compact = false }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:compact ? 6 : 8, flexWrap:"wrap", gap:4, minWidth:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:compact ? 5 : 8, minWidth:0 }}>
        {showAuthor && (
          <span style={{ fontSize:compact ? 9 : 11, fontFamily:SANS, letterSpacing:"0.1em", textTransform:"uppercase",
            color:c.text, background:c.dim, padding:compact ? "2px 7px" : "3px 9px", borderRadius:20,
            maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {e.writer==="a" ? names.a : names.b}
          </span>
        )}
        {showMood && (
          <>
            <FaceSvg index={normalizeMoodValue(e.hearts)-1} size={compact ? 16 : 18} color={c.text}/>
            <span style={{ fontSize:compact ? 10 : 11, color:T.inkLight, fontFamily:SANS }}>{mood.label}</span>
          </>
        )}
      </div>
      <span style={{ fontSize:compact ? 10 : 12, color:T.inkLight, fontFamily:SANS, marginLeft:"auto" }}>
        {fmtTime(e.at)}
      </span>
    </div>
  );
}

function PhotoAuthorBadge({ e, c, names, compact = false }) {
  const displayName = e.writer === "a" ? names.a : names.b;
  return (
    <div style={{
      position:"absolute", top:compact ? 7 : 10, left:compact ? 7 : 10,
      display:"inline-flex", alignItems:"center", gap:compact ? 4 : 5,
      maxWidth:compact ? "58%" : "62%", padding:compact ? "4px 7px" : "5px 9px",
      borderRadius:999, background:c.text, color:T.cloudDancer,
      border:"1px solid rgba(255,255,255,0.34)",
      boxShadow:"0 3px 10px rgba(0,0,0,0.14)",
      pointerEvents:"none"
    }}>
      <span style={{
        width:compact ? 4 : 5, height:compact ? 4 : 5, borderRadius:"50%",
        background:T.cloudDancer, opacity:0.9, flexShrink:0
      }}/>
      <span style={{
        fontSize:compact ? 8.5 : 10, fontFamily:SANS, letterSpacing:"0.13em",
        textTransform:"uppercase", lineHeight:1, overflow:"hidden", textOverflow:"ellipsis",
        whiteSpace:"nowrap", fontWeight:600
      }}>
        {displayName}
      </span>
    </div>
  );
}


function PhotoInfoOverlay({ e, compact = false }) {
  if (!e.location && !e.food) return null;

  const rowStyle = {
    display:"flex", gap:compact ? 4 : 6, alignItems:"flex-start",
    minWidth:0, maxWidth:"100%"
  };
  const iconStyle = {
    fontSize:compact ? 9.5 : 11, lineHeight:compact ? "14px" : "17px",
    color:"rgba(255,255,255,0.92)", textShadow:"0 1px 5px rgba(0,0,0,0.75)",
    flexShrink:0
  };
  const textStyle = {
    fontSize:compact ? 10.5 : 13, lineHeight:1.32, fontFamily:SANS, color:"white",
    textShadow:"0 1px 3px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.55)",
    overflowWrap:"anywhere", fontWeight:500
  };

  return (
    <div style={{
      position:"absolute", left:compact ? 8 : 12, right:compact ? 8 : 12, bottom:compact ? 8 : 12,
      color:"white", pointerEvents:"none", display:"flex", flexDirection:"column",
      gap:compact ? 3 : 4, alignItems:"flex-start", maxWidth:"calc(100% - 24px)"
    }}>
      {e.location && (
        <div style={rowStyle}>
          <span style={iconStyle}>◎</span>
          <span style={textStyle}>{e.location}</span>
        </div>
      )}
      {e.food && (
        <div style={rowStyle}>
          <span style={iconStyle}>◈</span>
          <span style={textStyle}>{e.food}</span>
        </div>
      )}
    </div>
  );
}


function TextBody({ e, hideMeta = false, compact = false }) {
  return (
    <>
      {!hideMeta && e.location && <div style={{ display:"flex", gap:compact ? 5 : 8, marginBottom:4 }}><span style={{ fontSize:compact ? 10 : 12, color:T.inkLight }}>◎</span><span style={{ fontSize:compact ? 12 : 14, color:T.ink, fontFamily:SANS, lineHeight:1.45, overflowWrap:"anywhere" }}>{e.location}</span></div>}
      {!hideMeta && e.food     && <div style={{ display:"flex", gap:compact ? 5 : 8, marginBottom:4 }}><span style={{ fontSize:compact ? 10 : 12, color:T.inkLight }}>◈</span><span style={{ fontSize:compact ? 12 : 14, color:T.ink, fontFamily:SANS, lineHeight:1.45, overflowWrap:"anywhere" }}>{e.food}</span></div>}
      {e.notes    && <div style={{ marginTop:hideMeta?0:8, paddingTop:hideMeta?0:8, borderTop:hideMeta?"none":`1px solid ${T.border}`, fontSize:compact ? 13 : 16, color:T.inkMid, fontFamily:DISPLAY, fontStyle:"italic", lineHeight:1.55, overflowWrap:"anywhere" }}>"{e.notes}"</div>}
    </>
  );
}


function ActionRow({ e, onEdit, onRemove, onPreview, compact = false }) {
  const btnStyle = (col) => ({
    background:"none", border:"none", fontSize:compact ? 9.5 : 11, color:T.inkLight, cursor:"pointer",
    padding:0, fontFamily:SANS, letterSpacing:"0.04em", transition:"color 0.15s",
    whiteSpace:"nowrap"
  });
  return (
    <div style={{
      display:"flex", gap:compact ? 8 : 12, marginTop:compact ? 7 : 8, paddingTop:compact ? 7 : 8,
      borderTop:`1px solid ${T.border}`, minWidth:0, overflow:"hidden", flexWrap:"wrap"
    }}>
      <button style={btnStyle(T.teal)} onClick={()=>onPreview(e)}
        onMouseEnter={ev=>ev.target.style.color=T.teal} onMouseLeave={ev=>ev.target.style.color=T.inkLight}>preview ↗</button>
      <button style={btnStyle(T.caramel)} onClick={()=>onEdit(e)}
        onMouseEnter={ev=>ev.target.style.color=T.caramel} onMouseLeave={ev=>ev.target.style.color=T.inkLight}>edit</button>
      <button style={btnStyle(T.rose)} onClick={()=>onRemove(e.id)}
        onMouseEnter={ev=>ev.target.style.color=T.rose} onMouseLeave={ev=>ev.target.style.color=T.inkLight}>remove</button>
    </div>
  );
}

// ─── Responsive helper ─────────────────────────────────────
function useIsMobile() {
  const getMobile = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640;
  };

  const [mobile, setMobile] = useState(getMobile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setMobile(getMobile());
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return mobile;
}

// ─── Day group (same day, both people) ───────────────────
function DayGroup({ date, entries, names, onEdit, onRemove, onPreview, onPhotoClick }) {
  const isMobile = useIsMobile();
  const aEntries = entries.filter(e=>e.writer==="a");
  const bEntries = entries.filter(e=>e.writer==="b");
  const bothWrote = aEntries.length > 0 && bEntries.length > 0;
  const compact = isMobile;

  return (
    <div style={{ marginBottom:compact ? 18 : 24, width:"100%", maxWidth:"100%", minWidth:0, boxSizing:"border-box", overflowX:"hidden" }}>
      {/* Day header */}
      <div style={{ display:"flex", alignItems:"center", gap:compact ? 7 : 10, marginBottom:compact ? 9 : 12, width:"100%" }}>
        <div style={{ height:1, flex:1, background:T.border }}/>
        <span style={{ fontSize:compact ? 11 : 12, color:T.inkMid, fontFamily:SANS, letterSpacing:"0.08em",
          background:T.cloudDancer, padding:compact ? "3px 10px" : "3px 12px", border:`1.5px solid ${T.border}`,
          borderRadius:20, whiteSpace:"nowrap" }}>
          {dayLabel(date)}
        </span>
        <div style={{ height:1, flex:1, background:T.border }}/>
      </div>

      {bothWrote ? (
        <div style={{
          display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",
          gap:compact ? 6 : 10, width:"100%", maxWidth:"100%", minWidth:0, boxSizing:"border-box"
        }}>
          <div style={{ minWidth:0, maxWidth:"100%", overflow:"hidden" }}>
            {aEntries.map(e=><EntryCard key={e.id} e={e} names={names} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview} onPhotoClick={onPhotoClick} compact={compact}/>)}
          </div>
          <div style={{ minWidth:0, maxWidth:"100%", overflow:"hidden" }}>
            {bEntries.map(e=><EntryCard key={e.id} e={e} names={names} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview} onPhotoClick={onPhotoClick} compact={compact}/>)}
          </div>
        </div>
      ) : (
        <div style={{ width:"100%", maxWidth:"100%", minWidth:0 }}>
          {entries.map(e=><EntryCard key={e.id} e={e} names={names} onEdit={onEdit} onRemove={onRemove} onPreview={onPreview} onPhotoClick={onPhotoClick} compact={compact}/>)}
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
          <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24"
            style={{ color:T.rose, opacity:0.82, flexShrink:0, marginRight:4 }}>
            <path d="M12 21.1C8.2 17.75 3.1 14.2 3.1 9.6C3.1 6.9 5.15 5 7.65 5C9.35 5 10.75 5.86 12 7.48C13.25 5.86 14.65 5 16.35 5C18.85 5 20.9 6.9 20.9 9.6C20.9 14.2 15.8 17.75 12 21.1Z"
              fill="currentColor" />
          </svg>
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
  function handleOpen(ev) {
    ev.preventDefault();
    if (typeof onClick === "function") onClick();
  }

  return (
    <div role="button" tabIndex={0} onClick={handleOpen}
      onKeyDown={(ev)=>{ if (ev.key === "Enter" || ev.key === " ") handleOpen(ev); }}
      style={{
        width:"100%", textAlign:"left", padding:0, borderRadius:20, overflow:"hidden",
        background:T.surface, borderWidth:1.5, borderStyle:"solid", borderColor:T.border,
        boxShadow:"0 8px 24px rgba(60,48,36,0.08)", cursor:"pointer",
        touchAction:"manipulation", WebkitTapHighlightColor:"transparent", boxSizing:"border-box"
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
    </div>
  );
}

function ArchivePage({ entries, filtered, names, loveStartDate, filter, setFilter, search, setSearch, showSearch, setShowSearch, onSetup, onAdd, onOpenMonth }) {
  const monthDayGroups = groupByMonthDay(filtered);
  return (
    <div style={{ minHeight:"100vh", width:"100%", maxWidth:"100%", overflowX:"hidden", background:T.cloudDancer, fontFamily:SANS, boxSizing:"border-box" }}>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"1.5rem clamp(0.55rem, 3vw, 1rem) 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.2rem" }}>
          <div>
            <div style={{ fontFamily:DISPLAY, fontSize:46, color:T.ink, fontStyle:"italic", fontWeight:500, lineHeight:1 }}>Chapters</div>
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

      <div style={{ maxWidth:680, margin:"0 auto", padding:"0 clamp(0.55rem, 3vw, 1rem) 6rem" }}>
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

function MonthPage({ month, filtered, entries, names, filter, setFilter, search, setSearch, showSearch, setShowSearch, onBack, onAdd, onEdit, onRemove, onPreview, onPhotoClick }) {
  const monthEntries = filtered.filter(e=>(e.date ? e.date.slice(0,7) : "~") === month);
  const dayEntries = (groupByMonthDay(monthEntries)[0] || [month, []])[1];
  return (
    <div style={{ minHeight:"100vh", width:"100%", maxWidth:"100%", overflowX:"hidden", background:T.cloudDancer, fontFamily:SANS, boxSizing:"border-box" }}>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"1.5rem clamp(0.55rem, 3vw, 1rem) 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.2rem" }}>
          <div>
            <div style={{ display:"flex", gap:12, marginBottom:8 }}>
              <button onClick={onBack} style={{ background:"none", border:"none", padding:0, color:T.inkLight, fontSize:12, cursor:"pointer" }}>← all collections</button>
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

      <div style={{ maxWidth:680, margin:"0 auto", padding:"0 clamp(0.55rem, 3vw, 1rem) 6rem" }}>
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
  const [form, setForm] = useState({...initial, hearts: normalizeMoodValue(initial.hearts)});
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
    <div style={{ minHeight:"100vh", width:"100%", maxWidth:"100%", overflowX:"hidden", background:T.cloudDancer, fontFamily:SANS, padding:"1rem", boxSizing:"border-box" }}>
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
              const active=normalizeMoodValue(form.hearts)===m.n; const c=COL[form.writer];
              return (
                <button key={m.n} onClick={()=>f({hearts:m.n})}
                  style={{ flex:1, padding:"12px 4px 8px", borderRadius:12,
                    border:`1.5px solid ${active?c.border:T.border}`,
                    background:active?c.dim:"transparent", cursor:"pointer",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:6, transition:"all 0.18s" }}>
                  <FaceSvg index={i} size={26} color={active?c.text:T.inkLight}/>
                  <span style={{ fontSize:10, color:active?c.text:T.inkLight, fontFamily:SANS, letterSpacing:"0.03em", textAlign:"center", whiteSpace:"nowrap" }}>
                    {m.label}
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
    <div style={{ minHeight:"100vh", width:"100%", maxWidth:"100%", overflowX:"hidden", background:T.cloudDancer, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem", fontFamily:SANS, boxSizing:"border-box" }}>
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
            ✦ &nbsp; Fall in love since
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
  const [page, setPage]                   = useState("archive");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [editEntry, setEditEntry]         = useState(null);
  const [filter, setFilter]               = useState("all");
  const [search, setSearch]               = useState("");
  const [showSearch, setShowSearch]       = useState(false);
  const [loaded, setLoaded]               = useState(false);
  const [lightboxSrc, setLightboxSrc]     = useState(null);
  const [previewEntry, setPreviewEntry]   = useState(null);

  useEffect(() => {
    if (!document.getElementById("chapters-fonts")) {
      const preconnect1 = document.createElement("link");
      preconnect1.rel = "preconnect";
      preconnect1.href = "https://fonts.googleapis.com";
      document.head.appendChild(preconnect1);

      const preconnect2 = document.createElement("link");
      preconnect2.rel = "preconnect";
      preconnect2.href = "https://fonts.gstatic.com";
      preconnect2.crossOrigin = "anonymous";
      document.head.appendChild(preconnect2);

      const link=document.createElement("link");
      link.id="chapters-fonts";
      link.rel="stylesheet";
      link.href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap";
      document.head.appendChild(link);
    }
    document.documentElement.style.fontFamily=SANS;
    document.body.style.fontFamily=SANS;
    document.body.style.webkitFontSmoothing="antialiased";
    document.body.style.mozOsxFontSmoothing="grayscale";
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
    await setDoc(doc(db,"entries",id),{...form,hearts:normalizeMoodValue(form.hearts),at:Date.now()});
    const month = form.date ? form.date.slice(0,7) : "~";
    setSelectedMonth(month);
    setPage("month");
  }

  async function handleSaveEdit(form) {
    if (!editEntry) return;
    await setDoc(doc(db,"entries",editEntry.id),{...form,hearts:normalizeMoodValue(form.hearts),at:editEntry.at||Date.now()});
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
    setPage("archive");
  }

  function startEdit(e) { setEditEntry(e); setPage("edit"); }
  function goArchive() { setSelectedMonth(null); setPage("archive"); }
  function openMonth(month) {
    if (!month) return;
    setSelectedMonth(String(month));
    setPage("month");
    if (typeof window !== "undefined") window.requestAnimationFrame(()=>window.scrollTo({ top:0, behavior:"smooth" }));
  }

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
      onSave={handleSaveSettings} onCancel={()=>setPage("archive")}
    />
  );

  if (page==="add") return (
    <EntryForm
      initial={EMPTY_FORM()} names={names} onSave={handleSaveNew}
      onCancel={()=>setPage(selectedMonth ? "month" : "archive")} isEdit={false}
    />
  );

  if (page==="edit"&&editEntry) return (
    <EntryForm
      initial={{ writer:editEntry.writer, date:editEntry.date||today(), location:editEntry.location||"",
        food:editEntry.food||"", notes:editEntry.notes||"", hearts:normalizeMoodValue(editEntry.hearts||3),
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
        onSetup={()=>setPage("setup")} onAdd={()=>setPage("add")} onOpenMonth={openMonth}
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
        onBack={goArchive} onAdd={()=>setPage("add")}
        onEdit={startEdit} onRemove={handleRemove}
        onPreview={setPreviewEntry} onPhotoClick={setLightboxSrc}
      />
    </>
  );

  return (
    <>
      {modal}
      <ArchivePage
        entries={entries} filtered={filtered} names={names} loveStartDate={loveStartDate}
        filter={filter} setFilter={setFilter} search={search} setSearch={setSearch}
        showSearch={showSearch} setShowSearch={setShowSearch}
        onSetup={()=>setPage("setup")} onAdd={()=>setPage("add")} onOpenMonth={openMonth}
      />
    </>
  );
}
