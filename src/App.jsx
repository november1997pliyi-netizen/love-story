import { useState, useEffect, useRef, useCallback } from "react";
import { collection, doc, setDoc, deleteDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// ─── Pantone Cloud Dancer 2026 palette ──────────────────
const T = {
  cloudDancer: "#F0EEE9",
  surface:     "#FAFAF8",
  surface2:    "#EAE6DE",
  surface3:    "#E0DCD4",
  border:      "rgba(60,48,36,0.11)",
  borderHov:   "rgba(60,48,36,0.22)",
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

const COL = {
  a: { text: T.rose, dim: T.roseDim, border: T.roseBorder },
  b: { text: T.teal, dim: T.tealDim, border: T.tealBorder },
};

const DISPLAY = "'Cormorant Garamond', serif";
const SANS    = "'DM Sans', sans-serif";

// ─── Mood options — SVG line faces ──────────────────────
const MOODS = [
  { n: 1, label: "rough day"    },
  { n: 2, label: "it was okay"  },
  { n: 3, label: "pretty good"  },
  { n: 4, label: "so sweet"     },
  { n: 5, label: "unforgettable"},
];

// SVG path sets for each face (pure stroke, hand-drawn feel)
const FACE_PATHS = [
  // 1 — sad
  <>
    <circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
    <circle cx="7.8" cy="10" r="1" fill="currentColor"/>
    <circle cx="14.2" cy="10" r="1" fill="currentColor"/>
    <path d="M8 15 Q11 12 14 15" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/>
  </>,
  // 2 — meh
  <>
    <circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
    <circle cx="7.8" cy="10" r="1" fill="currentColor"/>
    <circle cx="14.2" cy="10" r="1" fill="currentColor"/>
    <path d="M8 14 L14 14" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/>
  </>,
  // 3 — simple smile
  <>
    <circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
    <circle cx="7.8" cy="10" r="1" fill="currentColor"/>
    <circle cx="14.2" cy="10" r="1" fill="currentColor"/>
    <path d="M8 13.5 Q11 16.5 14 13.5" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/>
  </>,
  // 4 — big smile + raised brows
  <>
    <circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
    <path d="M7.5 8.8 Q8 7.8 9 8.8" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round"/>
    <path d="M13 8.8 Q14 7.8 14.5 8.8" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round"/>
    <path d="M7.5 13.2 Q11 17.5 14.5 13.2" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/>
  </>,
  // 5 — star eyes + big smile
  <>
    <circle cx="11" cy="11" r="9.5" fill="none" strokeWidth="1.4" stroke="currentColor"/>
    <path d="M8 8.2 L8.35 9.3 L9.5 9.3 L8.6 10 L8.9 11.1 L8 10.4 L7.1 11.1 L7.4 10 L6.5 9.3 L7.65 9.3Z" fill="currentColor" stroke="none"/>
    <path d="M14 8.2 L14.35 9.3 L15.5 9.3 L14.6 10 L14.9 11.1 L14 10.4 L13.1 11.1 L13.4 10 L12.5 9.3 L13.65 9.3Z" fill="currentColor" stroke="none"/>
    <path d="M7.2 14 Q11 18 14.8 14" fill="none" strokeWidth="1.4" stroke="currentColor" strokeLinecap="round"/>
  </>,
];

function FaceSvg({ index, size = 22, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"
      style={{ color, display: "block", flexShrink: 0 }}>
      {FACE_PATHS[index]}
    </svg>
  );
}

// ─── Utils ───────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function today() { return new Date().toISOString().split("T")[0]; }

function resizeImage(file, maxPx = 1200) {
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
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.src = url;
  });
}

function groupByMonth(entries) {
  const g = {};
  entries.forEach(e => {
    const k = e.date ? e.date.slice(0, 7) : "~";
    if (!g[k]) g[k] = [];
    g[k].push(e);
  });
  return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
}
function monthLabel(ym) {
  if (ym === "~") return "Unknown";
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function moodOf(n) { return MOODS.find(m => m.n === n) || MOODS[2]; }

// ─── Sticker photo component ─────────────────────────────
// Gives a polaroid-stamp feel: white border, shadow, slight tilt
const TILTS = [-2.5, 1.8, -1.2, 2.2, -0.8, 1.5, -2.0, 0.9];
function StickerPhoto({ src, index = 0, onClick, fullWidth = false }) {
  const tilt = fullWidth ? 0 : TILTS[index % TILTS.length];
  return (
    <div
      onClick={onClick}
      style={{
        display: "inline-block",
        background: "white",
        padding: fullWidth ? "10px 10px 32px" : "7px 7px 22px",
        boxShadow: "0 4px 18px rgba(60,48,36,0.18), 0 1px 3px rgba(60,48,36,0.10)",
        transform: `rotate(${tilt}deg)`,
        cursor: onClick ? "zoom-in" : "default",
        transition: "transform 0.25s, box-shadow 0.25s",
        width: fullWidth ? "100%" : undefined,
        boxSizing: "border-box",
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = `rotate(0deg) scale(1.03)`; e.currentTarget.style.boxShadow = "0 10px 32px rgba(60,48,36,0.22)"; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${tilt}deg)`; e.currentTarget.style.boxShadow = "0 4px 18px rgba(60,48,36,0.18), 0 1px 3px rgba(60,48,36,0.10)"; }}
    >
      <img
        src={src}
        style={{
          display: "block",
          width: fullWidth ? "100%" : "auto",
          maxWidth: fullWidth ? "100%" : 220,
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

// ─── Field input ─────────────────────────────────────────
const fieldBase = {
  width: "100%", background: T.cloudDancer, border: `1.5px solid ${T.border}`,
  borderRadius: 11, padding: "11px 14px", fontSize: 15, fontFamily: SANS,
  color: T.ink, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};
function Field({ label, icon, value, onChange, placeholder, type = "text", small }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: small ? "0.7rem" : "1rem" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 6, fontFamily: SANS }}>{icon}&nbsp;&nbsp;{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...fieldBase, borderColor: focused ? T.caramel : T.border, fontSize: small ? 14 : 15 }} />
    </div>
  );
}

// ─── Card download helper ────────────────────────────────
async function downloadCard(entry, names) {
  const W = 640, PAD = 40;
  const canvas = document.createElement("canvas");
  const mood = moodOf(entry.hearts);
  const c = COL[entry.writer];

  // Load photo first to get height
  let photoImg = null;
  let photoH = 0;
  if (entry.photo) {
    photoImg = await new Promise(res => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = entry.photo;
    });
    if (photoImg) photoH = Math.round((photoImg.height / photoImg.width) * (W - PAD * 2));
  }

  const H = 320 + (photoImg ? photoH + 24 : 0);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#F0EEE9";
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, entry.writer === "a" ? "#BC5C58" : "#3D7E8A");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 4);

  // Title "Chapters"
  ctx.font = "italic 500 42px 'Georgia', serif";
  ctx.fillStyle = "#1C1814";
  ctx.fillText("Chapters", PAD, 60);

  // Author + date chip
  const authorColor = entry.writer === "a" ? "#BC5C58" : "#3D7E8A";
  ctx.fillStyle = authorColor + "22";
  ctx.beginPath();
  ctx.roundRect(PAD, 76, 120, 24, 12);
  ctx.fill();
  ctx.fillStyle = authorColor;
  ctx.font = "500 11px 'Arial', sans-serif";
  ctx.fillText((entry.writer === "a" ? names.a : names.b).toUpperCase(), PAD + 12, 92);
  if (entry.date) {
    ctx.fillStyle = "#A0948A";
    ctx.font = "13px 'Arial', sans-serif";
    ctx.fillText(fmtDate(entry.date), W - PAD - 140, 92);
  }

  // Mood
  ctx.font = "20px 'Arial', sans-serif";
  ctx.fillText(mood.emoji + "  " + mood.label, PAD, 128);

  // Photo (sticker style)
  let y = 148;
  if (photoImg) {
    const pw = W - PAD * 2;
    // White polaroid frame
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(60,48,36,0.18)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(PAD - 8, y - 8, pw + 16, photoH + 30);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.drawImage(photoImg, PAD, y, pw, photoH);
    y += photoH + 46;
  }

  // Location / food / notes
  ctx.fillStyle = "#1C1814";
  ctx.font = "15px 'Arial', sans-serif";
  let textY = y;
  if (entry.location) { ctx.fillText("◎  " + entry.location, PAD, textY); textY += 26; }
  if (entry.food)     { ctx.fillText("◈  " + entry.food,     PAD, textY); textY += 26; }
  if (entry.notes) {
    ctx.fillStyle = "#5A5048";
    ctx.font = "italic 16px 'Georgia', serif";
    const maxW = W - PAD * 2;
    // Simple word wrap
    const words = ("\"" + entry.notes + "\"").split(" ");
    let line = "", ly = textY + 8;
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, PAD, ly); ly += 22; line = word + " ";
      } else line = test;
    }
    if (line) ctx.fillText(line, PAD, ly);
  }

  // Download
  const a = document.createElement("a");
  a.download = `chapters-${entry.date || "entry"}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

// ─── Edit / Add Form ─────────────────────────────────────
function EntryForm({ initial, names, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState(initial);
  const [photoPreview, setPhotoPreview] = useState(initial.photo || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const f = v => setForm(p => ({ ...p, ...v }));

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const b64 = await resizeImage(file);
    setPhotoPreview(b64); f({ photo: b64 });
    setUploading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: T.cloudDancer, fontFamily: SANS, padding: "1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: "3rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "1rem 0 2rem" }}>
          <button onClick={onCancel}
            style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer", color: T.inkMid, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: T.ink, fontStyle: "italic" }}>{isEdit ? "Edit entry" : "New entry"}</div>
            <div style={{ fontSize: 11, color: T.inkLight, letterSpacing: "0.12em", textTransform: "uppercase" }}>{isEdit ? "make changes" : "add a chapter"}</div>
          </div>
        </div>

        {/* Writer toggle */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 10 }}>Written by</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["a","b"].map(w => {
              const c = COL[w]; const active = form.writer === w;
              return (
                <button key={w} onClick={() => f({ writer: w })}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 14, fontFamily: SANS, fontWeight: 500, cursor: "pointer", border: `1.5px solid ${active ? c.border : T.border}`, background: active ? c.dim : "transparent", color: active ? c.text : T.inkLight, transition: "all 0.2s", letterSpacing: "0.03em" }}>
                  {w === "a" ? names.a : names.b}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Date"          icon="—" value={form.date}     onChange={v => f({ date: v })}     type="date" />
        <Field label="Location"      icon="—" value={form.location} onChange={v => f({ location: v })} placeholder="Where did you go?" />
        <Field label="Food & drinks" icon="—" value={form.food}     onChange={v => f({ food: v })}     placeholder="What did you have?" />

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 7 }}>— &nbsp; Notes</div>
          <textarea value={form.notes} onChange={e => f({ notes: e.target.value })} placeholder="Something you want to remember..." rows={3}
            style={{ ...fieldBase, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {/* Photo — sticker preview */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 12 }}>— &nbsp; Photo</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
          {!photoPreview ? (
            <button onClick={() => fileRef.current.click()}
              style={{ width: "100%", padding: "22px", borderRadius: 12, border: `1.5px dashed ${T.border}`, background: "transparent", color: T.inkLight, fontSize: 13, fontFamily: SANS, cursor: "pointer", letterSpacing: "0.06em", transition: "all 0.2s" }}
              onMouseEnter={ev => { ev.currentTarget.style.borderColor = T.caramel; ev.currentTarget.style.color = T.inkMid; }}
              onMouseLeave={ev => { ev.currentTarget.style.borderColor = T.border; ev.currentTarget.style.color = T.inkLight; }}>
              {uploading ? "processing..." : "+ add photo"}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <StickerPhoto src={photoPreview} index={0} fullWidth />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => fileRef.current.click()}
                  style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "transparent", fontSize: 12, fontFamily: SANS, color: T.inkMid, cursor: "pointer" }}>
                  replace photo
                </button>
                <button onClick={() => { setPhotoPreview(null); f({ photo: null }); }}
                  style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "transparent", fontSize: 12, fontFamily: SANS, color: T.rose, cursor: "pointer" }}>
                  remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mood picker — line faces */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 14 }}>— &nbsp; How was it?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {MOODS.map((m, i) => {
              const active = form.hearts === m.n;
              const c = COL[form.writer];
              return (
                <button key={m.n} onClick={() => f({ hearts: m.n })}
                  style={{ flex: 1, padding: "12px 4px 8px", borderRadius: 12, border: `1.5px solid ${active ? c.border : T.border}`, background: active ? c.dim : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.18s" }}>
                  <FaceSvg index={i} size={26} color={active ? c.text : T.inkLight} />
                  <span style={{ fontSize: 10, color: active ? c.text : T.inkLight, fontFamily: SANS, letterSpacing: "0.03em", lineHeight: 1.2, textAlign: "center" }}>
                    {m.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={() => onSave(form)}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: T.ink, color: T.cloudDancer, fontSize: 14, fontWeight: 500, fontFamily: SANS, cursor: "pointer", letterSpacing: "0.08em" }}>
          {isEdit ? "SAVE CHANGES" : "SAVE THIS CHAPTER"}
        </button>
      </div>
    </div>
  );
}

// ─── Card Preview / Share Modal ──────────────────────────
function CardPreviewModal({ entry, names, onClose }) {
  const mood = moodOf(entry.hearts);
  const c = COL[entry.writer];
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(28,24,20,0.80)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 998, padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: T.cloudDancer, borderRadius: 20, maxWidth: 420, width: "100%", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.35)" }}>
        {/* Accent */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${c.text}, transparent)` }} />
        <div style={{ padding: "20px 22px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, fontStyle: "italic", color: T.ink }}>Chapters</div>
            <span style={{ fontSize: 11, fontFamily: SANS, letterSpacing: "0.1em", textTransform: "uppercase", color: c.text, background: c.dim, padding: "3px 10px", borderRadius: 20 }}>
              {entry.writer === "a" ? names.a : names.b}
            </span>
          </div>
          <div style={{ fontSize: 13, color: T.inkLight, fontFamily: SANS, marginBottom: 14 }}>{fmtDate(entry.date)}</div>

          {/* Mood */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <FaceSvg index={mood.n - 1} size={28} color={c.text} />
            <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 18, color: T.inkMid }}>{mood.label}</span>
          </div>

          {/* Sticker photo — full ratio */}
          {entry.photo && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <StickerPhoto src={entry.photo} index={0} fullWidth />
            </div>
          )}

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {entry.location && (
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ color: T.inkLight, fontSize: 13 }}>◎</span>
                <span style={{ fontFamily: SANS, fontSize: 15, color: T.ink }}>{entry.location}</span>
              </div>
            )}
            {entry.food && (
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ color: T.inkLight, fontSize: 13 }}>◈</span>
                <span style={{ fontFamily: SANS, fontSize: 15, color: T.ink }}>{entry.food}</span>
              </div>
            )}
          </div>
          {entry.notes && (
            <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 17, color: T.inkMid, lineHeight: 1.6, borderTop: `1px solid ${T.border}`, paddingTop: 12, marginBottom: 12 }}>
              "{entry.notes}"
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", fontFamily: SANS, fontSize: 13, color: T.inkMid, cursor: "pointer" }}>
              close
            </button>
            <button onClick={() => downloadCard(entry, names)}
              style={{ flex: 2, padding: "10px", borderRadius: 10, border: "none", background: T.ink, color: T.cloudDancer, fontFamily: SANS, fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "0.06em" }}>
              ↓ download card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Entry Card (list view) ──────────────────────────────
function EntryCard({ e, idx, names, onEdit, onRemove, onPreview }) {
  const [hov, setHov] = useState(false);
  const c = COL[e.writer];
  const mood = moodOf(e.hearts);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.surface : T.cloudDancer, border: `1.5px solid ${hov ? c.border : T.border}`, borderRadius: 18, overflow: "hidden", transition: "all 0.25s", transform: hov ? "translateY(-2px)" : "none", boxShadow: hov ? "0 8px 28px rgba(60,48,36,0.10)" : "0 1px 4px rgba(60,48,36,0.06)", breakInside: "avoid", marginBottom: 14 }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${c.text}66, transparent)` }} />

      {/* Photo — full ratio sticker */}
      {e.photo && (
        <div style={{ padding: "14px 14px 0", display: "flex", justifyContent: "center" }}>
          <StickerPhoto src={e.photo} index={idx} onClick={() => onPreview(e)} />
        </div>
      )}

      <div style={{ padding: "12px 15px 11px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontFamily: SANS, letterSpacing: "0.1em", textTransform: "uppercase", color: c.text, background: c.dim, padding: "3px 9px", borderRadius: 20 }}>
            {e.writer === "a" ? names.a : names.b}
          </span>
          <span style={{ fontSize: 13, color: T.inkLight, fontFamily: SANS }}>{fmtDate(e.date)}</span>
        </div>

        {/* Mood */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
          <FaceSvg index={e.hearts - 1} size={20} color={c.text} />
          <span style={{ fontSize: 12, color: T.inkLight, fontFamily: SANS, letterSpacing: "0.04em" }}>{mood.label}</span>
        </div>

        {e.location && <div style={{ display: "flex", gap: 8, marginBottom: 5 }}><span style={{ fontSize: 12, color: T.inkLight }}>◎</span><span style={{ fontSize: 14, color: T.ink, fontFamily: SANS, lineHeight: 1.45 }}>{e.location}</span></div>}
        {e.food    && <div style={{ display: "flex", gap: 8, marginBottom: 5 }}><span style={{ fontSize: 12, color: T.inkLight }}>◈</span><span style={{ fontSize: 14, color: T.ink, fontFamily: SANS, lineHeight: 1.45 }}>{e.food}</span></div>}
        {e.notes   && <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${T.border}`, fontSize: 16, color: T.inkMid, fontFamily: DISPLAY, fontStyle: "italic", lineHeight: 1.6 }}>"{e.notes}"</div>}

        {/* Card actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => onPreview(e)}
            style={{ background: "none", border: "none", fontSize: 11, color: T.inkLight, cursor: "pointer", padding: 0, fontFamily: SANS, letterSpacing: "0.05em", transition: "color 0.15s" }}
            onMouseEnter={ev => ev.target.style.color = T.teal} onMouseLeave={ev => ev.target.style.color = T.inkLight}>
            preview ↗
          </button>
          <button onClick={() => onEdit(e)}
            style={{ background: "none", border: "none", fontSize: 11, color: T.inkLight, cursor: "pointer", padding: 0, fontFamily: SANS, letterSpacing: "0.05em", transition: "color 0.15s" }}
            onMouseEnter={ev => ev.target.style.color = T.caramel} onMouseLeave={ev => ev.target.style.color = T.inkLight}>
            edit
          </button>
          <button onClick={() => onRemove(e.id)}
            style={{ background: "none", border: "none", fontSize: 11, color: T.inkLight, cursor: "pointer", padding: 0, fontFamily: SANS, letterSpacing: "0.05em", transition: "color 0.15s" }}
            onMouseEnter={ev => ev.target.style.color = T.rose} onMouseLeave={ev => ev.target.style.color = T.inkLight}>
            remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Strip ─────────────────────────────────────────
function StatsStrip({ entries, names }) {
  const cA = entries.filter(e => e.writer === "a").length;
  const cB = entries.filter(e => e.writer === "b").length;
  const avg = entries.length ? entries.reduce((s, e) => s + e.hearts, 0) / entries.length : 0;
  const topMood = moodOf(Math.round(avg));
  return (
    <div style={{ display: "flex", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 16, overflow: "hidden", marginBottom: "1.25rem" }}>
      {[
        { val: cA, label: names.a, col: T.rose },
        { val: cB, label: names.b, col: T.teal },
      ].map((s, i) => (
        <div key={i} style={{ flex: 1, padding: "13px 15px", borderRight: `1.5px solid ${T.border}` }}>
          <div style={{ fontSize: 22, fontFamily: DISPLAY, fontWeight: 600, color: s.col, lineHeight: 1 }}>{s.val}</div>
          <div style={{ fontSize: 11, color: T.inkLight, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.col, display: "inline-block", flexShrink: 0 }} />
            {s.label}
          </div>
        </div>
      ))}
      <div style={{ flex: 1.4, padding: "13px 15px", background: "rgba(196,122,72,0.04)" }}>
        <div style={{ marginBottom: 4 }}>
          {entries.length
            ? <FaceSvg index={topMood.n - 1} size={26} color={T.caramel} />
            : <span style={{ fontSize: 20, color: T.inkLight }}>—</span>}
        </div>
        <div style={{ fontSize: 11, color: T.inkLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {entries.length ? topMood.label : "no entries yet"}
        </div>
      </div>
    </div>
  );
}

// ─── Icon Button ─────────────────────────────────────────
function IconBtn({ children, onClick, active }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: active || hov ? T.surface2 : "transparent", border: `1.5px solid ${active ? T.caramel : T.border}`, borderRadius: 10, width: 40, height: 40, cursor: "pointer", color: active ? T.caramel : T.inkMid, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
      {children}
    </button>
  );
}

// ─── Lightbox ────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(28,24,20,0.94)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, cursor: "zoom-out", padding: "1.5rem" }}>
      <StickerPhoto src={src} index={0} />
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────
const EMPTY_FORM = () => ({ writer: "a", date: today(), location: "", food: "", notes: "", hearts: 3, photo: null });

export default function App() {
  const [entries, setEntries]           = useState([]);
  const [names, setNames]               = useState({ a: "A", b: "B" });
  const [page, setPage]                 = useState("list");   // list | add | edit | setup
  const [editEntry, setEditEntry]       = useState(null);
  const [viewMode, setViewMode]         = useState("grid");
  const [filter, setFilter]             = useState("all");
  const [search, setSearch]             = useState("");
  const [showSearch, setShowSearch]     = useState(false);
  const [loaded, setLoaded]             = useState(false);
  const [lightboxSrc, setLightboxSrc]   = useState(null);
  const [previewEntry, setPreviewEntry] = useState(null);
  const [nameInput, setNameInput]       = useState({ a: "", b: "" });

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(link);
    document.body.style.background = T.cloudDancer;
    document.body.style.margin = "0";

    getDoc(doc(db, "config", "names")).then(s => { if (s.exists()) setNames(s.data()); });

    const unsub = onSnapshot(collection(db, "entries"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.at || 0) - (a.at || 0));
      setEntries(data);
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  // ── Save new entry ──
  async function handleSaveNew(form) {
    if (!form.location && !form.food && !form.notes && !form.photo) return alert("Fill in at least one field.");
    const id = uid();
    await setDoc(doc(db, "entries", id), { ...form, at: Date.now() });
    setPage("list");
  }

  // ── Save edit ──
  async function handleSaveEdit(form) {
    if (!editEntry) return;
    await setDoc(doc(db, "entries", editEntry.id), { ...form, at: editEntry.at || Date.now() });
    setEditEntry(null);
    setPage("list");
  }

  // ── Remove ──
  async function handleRemove(id) {
    if (!confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, "entries", id));
  }

  // ── Save names ──
  async function saveNames() {
    const n = { a: nameInput.a.trim() || "A", b: nameInput.b.trim() || "B" };
    await setDoc(doc(db, "config", "names"), n);
    setNames(n); setPage("list");
  }

  // ── Start edit ──
  function startEdit(e) {
    setEditEntry(e);
    setPage("edit");
  }

  const filtered = entries
    .filter(e => filter === "all" || e.writer === filter)
    .filter(e => !search.trim() || [e.location, e.food, e.notes].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  // ── Lightbox ──
  if (lightboxSrc) return <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />;

  // ── Loading ──
  if (!loaded) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: T.cloudDancer, gap: 12 }}>
      <div style={{ fontSize: 44, fontFamily: DISPLAY, fontStyle: "italic", color: T.ink }}>Chapters</div>
      <div style={{ fontSize: 12, color: T.inkLight, fontFamily: SANS, letterSpacing: "0.14em" }}>connecting…</div>
    </div>
  );

  // ── Setup page ──
  if (page === "setup") return (
    <div style={{ minHeight: "100vh", background: T.cloudDancer, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: SANS }}>
      <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 22, padding: "2.5rem 2rem", maxWidth: 380, width: "100%", boxShadow: "0 16px 48px rgba(60,48,36,0.12)" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 32, color: T.ink, fontStyle: "italic", marginBottom: 6 }}>The two of you</div>
        <div style={{ fontSize: 13, color: T.inkLight, marginBottom: "2rem" }}>Name the two narrators</div>
        {[["a", T.rose],["b", T.teal]].map(([w, col]) => (
          <div key={w} style={{ marginBottom: "1.1rem" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: col, display: "inline-block" }} />
              {w === "a" ? "first person" : "second person"}
            </div>
            <input value={nameInput[w]} onChange={ev => setNameInput(p => ({ ...p, [w]: ev.target.value }))} placeholder={names[w]}
              style={{ ...fieldBase, borderColor: col + "44" }} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: "2rem" }}>
          <button onClick={() => setPage("list")} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", fontSize: 14, fontFamily: SANS, cursor: "pointer", color: T.inkMid }}>Cancel</button>
          <button onClick={saveNames} style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: T.ink, color: T.cloudDancer, fontSize: 14, fontWeight: 500, fontFamily: SANS, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );

  // ── Add / Edit page ──
  if (page === "add") return (
    <EntryForm
      initial={EMPTY_FORM()}
      names={names}
      onSave={handleSaveNew}
      onCancel={() => setPage("list")}
      isEdit={false}
    />
  );
  if (page === "edit" && editEntry) return (
    <EntryForm
      initial={{ writer: editEntry.writer, date: editEntry.date || today(), location: editEntry.location || "", food: editEntry.food || "", notes: editEntry.notes || "", hearts: editEntry.hearts || 3, photo: editEntry.photo || null }}
      names={names}
      onSave={handleSaveEdit}
      onCancel={() => { setEditEntry(null); setPage("list"); }}
      isEdit={true}
    />
  );

  // ── Main list ──────────────────────────────────────────
  const monthGroups = groupByMonth(filtered);

  return (
    <div style={{ minHeight: "100vh", background: T.cloudDancer, fontFamily: SANS }}>
      {/* Card preview modal */}
      {previewEntry && <CardPreviewModal entry={previewEntry} names={names} onClose={() => setPreviewEntry(null)} />}

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "1.5rem 1rem 0" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 46, color: T.ink, fontStyle: "italic", fontWeight: 500, lineHeight: 1 }}>Chapters</div>
            <div style={{ fontSize: 12, color: T.inkLight, letterSpacing: "0.13em", textTransform: "uppercase", marginTop: 5 }}>
              {entries.length > 0 ? `${entries.length} entries · ${names.a} & ${names.b}` : `${names.a} & ${names.b}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <IconBtn active={showSearch} onClick={() => setShowSearch(s => !s)}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            </IconBtn>
            <IconBtn onClick={() => { setNameInput({ a: names.a, b: names.b }); setPage("setup"); }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </IconBtn>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div style={{ marginBottom: "1.1rem" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." autoFocus
              style={{ ...fieldBase, fontSize: 14, borderColor: search ? T.caramel : T.border }} />
            {search && <div style={{ fontSize: 12, color: T.inkLight, marginTop: 6 }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>}
          </div>
        )}

        {/* Stats */}
        {entries.length > 0 && !search && <StatsStrip entries={entries} names={names} />}

        {/* Filter + View toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[["all","All"],["a", names.a],["b", names.b]].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: SANS, cursor: "pointer", border: `1.5px solid ${filter === k ? T.caramel : T.border}`, background: filter === k ? "rgba(196,122,72,0.08)" : "transparent", color: filter === k ? T.caramel : T.inkLight, letterSpacing: "0.06em", transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", border: `1.5px solid ${T.border}`, borderRadius: 9, overflow: "hidden" }}>
            {[["grid","▦"],["timeline","☰"]].map(([m, icon]) => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: "6px 12px", border: "none", background: viewMode === m ? T.surface2 : "transparent", color: viewMode === m ? T.ink : T.inkLight, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 1rem 6rem" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 64, color: T.inkLight, fontStyle: "italic", opacity: 0.25 }}>✦</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: T.inkMid, marginTop: 16, fontStyle: "italic" }}>
              {search ? `Nothing found for "${search}"` : "Your story starts here"}
            </div>
            <div style={{ fontSize: 13, color: T.inkLight, marginTop: 8, letterSpacing: "0.06em" }}>
              {search ? "Try different keywords" : "Tap + to write the first chapter"}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div style={{ columns: "2 200px", gap: 14 }}>
            {filtered.map((e, i) => (
              <EntryCard key={e.id} e={e} idx={i} names={names}
                onEdit={startEdit}
                onRemove={handleRemove}
                onPreview={setPreviewEntry}
              />
            ))}
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 16, top: 8, bottom: 0, width: 1, background: `linear-gradient(180deg, ${T.rose}44, ${T.teal}33, transparent)` }} />
            {monthGroups.map(([ym, group]) => (
              <div key={ym} style={{ marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "1.2rem" }}>
                  <div style={{ width: 33, height: 33, borderRadius: "50%", background: T.surface, border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: T.caramel }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 22, color: T.ink, fontStyle: "italic" }}>{monthLabel(ym)}</div>
                    <div style={{ fontSize: 11, color: T.inkLight, letterSpacing: "0.1em", textTransform: "uppercase" }}>{group.length} {group.length === 1 ? "entry" : "entries"}</div>
                  </div>
                </div>
                <div style={{ marginLeft: 49 }}>
                  {group.map((e, i) => (
                    <EntryCard key={e.id} e={e} idx={i} names={names}
                      onEdit={startEdit} onRemove={handleRemove} onPreview={setPreviewEntry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setPage("add")}
        style={{ position: "fixed", bottom: "2rem", right: "2rem", width: 54, height: 54, borderRadius: "50%", background: T.ink, border: "none", color: T.cloudDancer, fontSize: 26, cursor: "pointer", boxShadow: "0 8px 24px rgba(28,24,20,0.22)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, transition: "transform 0.2s" }}
        onMouseEnter={ev => ev.currentTarget.style.transform = "scale(1.08)"}
        onMouseLeave={ev => ev.currentTarget.style.transform = "scale(1)"}>+</button>
    </div>
  );
}
