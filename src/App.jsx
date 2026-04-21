import { useState, useEffect, useRef } from "react";
import {
  collection, doc, setDoc, deleteDoc, getDoc, onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Pantone 2026 Cloud Dancer palette ──────────────────
// Base: Cloud Dancer #F0EEE9
// Powdered Pastels: dusty rose, ice mint
// Glamour & Gleam: deep ink, wine, graphite
// Atmospheric: soft teal, mist blue

const T = {
  cloudDancer: "#F0EEE9",   // Pantone 11-4201 — the hero
  surface:     "#FAFAF8",   // slightly brighter white
  surface2:    "#EAE6DE",   // warm stone (cards)
  surface3:    "#E0DCD4",   // deeper stone (hover)
  border:      "rgba(60,48,36,0.11)",
  borderHov:   "rgba(60,48,36,0.22)",
  ink:         "#1C1814",   // Glamour & Gleam deep ink
  inkMid:      "#5A5048",   // mid ink
  inkLight:    "#A0948A",   // muted ink
  // Person A — Raindrops on Roses (Powdered Pastels)
  rose:        "#BC5C58",
  roseDim:     "rgba(188,92,88,0.10)",
  roseBorder:  "rgba(188,92,88,0.28)",
  // Person B — Nantucket Breeze (Atmospheric)
  teal:        "#3D7E8A",
  tealDim:     "rgba(61,126,138,0.10)",
  tealBorder:  "rgba(61,126,138,0.28)",
  // Cloud Level accent — warm caramel (Take a Break)
  caramel:     "#C47A48",
};

const COL = {
  a: { text: T.rose,  dim: T.roseDim,  border: T.roseBorder },
  b: { text: T.teal,  dim: T.tealDim,  border: T.tealBorder },
};

const DISPLAY = "'Cormorant Garamond', serif";
const SANS    = "'DM Sans', sans-serif";

// ─── Utils ───────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function today() { return new Date().toISOString().split("T")[0]; }

function resizeImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 700;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });
}

function groupByMonth(entries) {
  const groups = {};
  entries.forEach(e => {
    const key = e.date ? e.date.slice(0, 7) : "~";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function monthLabel(ym) {
  if (ym === "~") return "Unknown";
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Shared input style ──────────────────────────────────
const fieldBase = {
  width: "100%",
  background: T.surface,
  border: `1.5px solid ${T.border}`,
  borderRadius: 11,
  padding: "11px 14px",
  fontSize: 15,
  fontFamily: SANS,
  color: T.ink,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

function Field({ label, icon, value, onChange, placeholder, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 7, fontFamily: SANS }}>
        {icon}&nbsp;&nbsp;{label}
      </div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...fieldBase, borderColor: focused ? T.caramel : T.border, background: focused ? T.surface : T.cloudDancer }}
      />
    </div>
  );
}

// ─── Stats Strip ─────────────────────────────────────────
// Replaces the boring 3-box layout
// Layout: [A pill] [divider] [B pill] [cloud level]
function StatsStrip({ entries, names }) {
  const countA = entries.filter(e => e.writer === "a").length;
  const countB = entries.filter(e => e.writer === "b").length;
  const avg = entries.length ? (entries.reduce((s, e) => s + e.hearts, 0) / entries.length) : 0;
  const cloudSymbols = avg > 0 ? "☁".repeat(Math.round(avg)) + "·".repeat(5 - Math.round(avg)) : "· · · · ·";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 0,
      background: T.surface,
      border: `1.5px solid ${T.border}`,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: "1.25rem",
    }}>
      {/* Person A */}
      <div style={{ flex: 1, padding: "14px 16px", borderRight: `1.5px solid ${T.border}` }}>
        <div style={{ fontSize: 22, fontFamily: DISPLAY, fontWeight: 600, color: T.rose, lineHeight: 1 }}>{countA}</div>
        <div style={{ fontSize: 11, color: T.inkLight, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: T.rose, flexShrink: 0 }} />
          {names.a}
        </div>
      </div>

      {/* Person B */}
      <div style={{ flex: 1, padding: "14px 16px", borderRight: `1.5px solid ${T.border}` }}>
        <div style={{ fontSize: 22, fontFamily: DISPLAY, fontWeight: 600, color: T.teal, lineHeight: 1 }}>{countB}</div>
        <div style={{ fontSize: 11, color: T.inkLight, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: T.teal, flexShrink: 0 }} />
          {names.b}
        </div>
      </div>

      {/* Cloud Level — fun avg rating */}
      <div style={{ flex: 1.4, padding: "14px 16px", background: "rgba(201,149,107,0.05)" }}>
        <div style={{ fontSize: 16, color: T.caramel, letterSpacing: 2, lineHeight: 1 }}>{cloudSymbols}</div>
        <div style={{ fontSize: 11, color: T.inkLight, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          ☁ cloud level
        </div>
      </div>
    </div>
  );
}

// ─── Entry Card ──────────────────────────────────────────
function EntryCard({ e, names, setExpandedPhoto, removeEntry, i }) {
  const [hov, setHov] = useState(false);
  const c = COL[e.writer];

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? T.surface : T.cloudDancer,
        border: `1.5px solid ${hov ? c.border : T.border}`,
        borderRadius: 18,
        overflow: "hidden",
        transition: "all 0.25s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? `0 8px 28px rgba(60,48,36,0.10)` : "0 1px 4px rgba(60,48,36,0.06)",
        breakInside: "avoid",
        marginBottom: 14,
      }}>
      {/* Accent strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${c.text}66, transparent)` }} />

      {e.photo && (
        <div style={{ position: "relative", overflow: "hidden" }}>
          <img src={e.photo} onClick={() => setExpandedPhoto(e.photo)}
            style={{ width: "100%", height: 150, objectFit: "cover", cursor: "zoom-in", display: "block" }} />
          {/* Soft vignette */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 55%, rgba(240,238,233,0.6))" }} />
        </div>
      )}

      <div style={{ padding: "12px 15px 11px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
          <span style={{ fontSize: 11, fontFamily: SANS, letterSpacing: "0.1em", textTransform: "uppercase", color: c.text, background: c.dim, padding: "3px 9px", borderRadius: 20 }}>
            {e.writer === "a" ? names.a : names.b}
          </span>
          <span style={{ fontSize: 13, color: T.inkLight, fontFamily: SANS }}>{fmtDate(e.date)}</span>
        </div>

        {/* Cloud hearts */}
        <div style={{ fontSize: 13, letterSpacing: 3, marginBottom: 9, color: c.text }}>
          {"☁".repeat(e.hearts)}{"·".repeat(5 - e.hearts)}
        </div>

        {e.location && (
          <div style={{ display: "flex", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: T.inkLight, marginTop: 2, flexShrink: 0 }}>◎</span>
            <span style={{ fontSize: 14, color: T.ink, fontFamily: SANS, lineHeight: 1.45 }}>{e.location}</span>
          </div>
        )}
        {e.food && (
          <div style={{ display: "flex", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: T.inkLight, marginTop: 2, flexShrink: 0 }}>◈</span>
            <span style={{ fontSize: 14, color: T.ink, fontFamily: SANS, lineHeight: 1.45 }}>{e.food}</span>
          </div>
        )}

        {e.notes && (
          <div style={{
            marginTop: 10, paddingTop: 9,
            borderTop: `1px solid ${T.border}`,
            fontSize: 16, color: T.inkMid,
            fontFamily: DISPLAY, fontStyle: "italic",
            lineHeight: 1.6, letterSpacing: "0.01em",
          }}>
            "{e.notes}"
          </div>
        )}

        <button onClick={() => removeEntry(e.id)}
          style={{ marginTop: 9, background: "none", border: "none", fontSize: 11, color: T.inkLight, cursor: "pointer", padding: 0, fontFamily: SANS, letterSpacing: "0.05em", transition: "color 0.15s" }}
          onMouseEnter={ev => ev.target.style.color = T.rose}
          onMouseLeave={ev => ev.target.style.color = T.inkLight}>
          remove
        </button>
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

// ─── Main App ────────────────────────────────────────────
export default function App() {
  const [entries, setEntries]             = useState([]);
  const [names, setNames]                 = useState({ a: "A", b: "B" });
  const [page, setPage]                   = useState("list");
  const [viewMode, setViewMode]           = useState("grid");
  const [filter, setFilter]               = useState("all");
  const [search, setSearch]               = useState("");
  const [showSearch, setShowSearch]       = useState(false);
  const [loaded, setLoaded]               = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [nameInput, setNameInput]         = useState({ a: "", b: "" });
  const [form, setForm]                   = useState({ writer: "a", date: today(), location: "", food: "", notes: "", hearts: 3 });
  const [photoPreview, setPhotoPreview]   = useState(null);
  const [photoData, setPhotoData]         = useState(null);
  const [uploading, setUploading]         = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    // Fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(link);
    document.body.style.background = T.cloudDancer;
    document.body.style.margin = "0";

    getDoc(doc(db, "config", "names")).then(snap => {
      if (snap.exists()) setNames(snap.data());
    });

    const unsub = onSnapshot(collection(db, "entries"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.at || 0) - (a.at || 0));
      setEntries(data);
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  async function addEntry() {
    if (!form.location && !form.food && !form.notes && !photoData) return alert("Fill in at least one field.");
    const id = uid();
    const entry = { ...form, at: Date.now() };
    if (photoData) entry.photo = photoData;
    await setDoc(doc(db, "entries", id), entry);
    setForm(p => ({ ...p, date: today(), location: "", food: "", notes: "", hearts: 3 }));
    setPhotoPreview(null); setPhotoData(null);
    setPage("list");
  }

  async function removeEntry(id) {
    if (!confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, "entries", id));
  }

  async function saveNames() {
    const n = { a: nameInput.a.trim() || "A", b: nameInput.b.trim() || "B" };
    await setDoc(doc(db, "config", "names"), n);
    setNames(n); setPage("list");
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const b64 = await resizeImage(file);
    setPhotoPreview(b64); setPhotoData(b64);
    setUploading(false);
  }

  const filtered = entries
    .filter(e => filter === "all" || e.writer === filter)
    .filter(e => !search.trim() || [e.location, e.food, e.notes].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  // ── Lightbox ──
  if (expandedPhoto) return (
    <div onClick={() => setExpandedPhoto(null)}
      style={{ position: "fixed", inset: 0, background: "rgba(28,24,20,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, cursor: "zoom-out", padding: "1.5rem" }}>
      <img src={expandedPhoto} style={{ maxWidth: "100%", maxHeight: "92vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }} />
    </div>
  );

  // ── Loading ──
  if (!loaded) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: T.cloudDancer, gap: 12 }}>
      <div style={{ fontSize: 44, fontFamily: DISPLAY, fontStyle: "italic", color: T.ink, letterSpacing: "0.02em" }}>Chapters</div>
      <div style={{ fontSize: 12, color: T.inkLight, fontFamily: SANS, letterSpacing: "0.14em" }}>connecting ☁</div>
    </div>
  );

  // ── Setup ──
  if (page === "setup") return (
    <div style={{ minHeight: "100vh", background: T.cloudDancer, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: SANS }}>
      <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 22, padding: "2.5rem 2rem", maxWidth: 380, width: "100%", boxShadow: "0 16px 48px rgba(60,48,36,0.12)" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 32, color: T.ink, fontStyle: "italic", marginBottom: 6 }}>The two of you</div>
        <div style={{ fontSize: 13, color: T.inkLight, marginBottom: "2rem", letterSpacing: "0.03em" }}>Name the two narrators</div>
        {[["a", T.rose], ["b", T.teal]].map(([w, col]) => (
          <div key={w} style={{ marginBottom: "1.1rem" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: col }} />
              {w === "a" ? "first person" : "second person"}
            </div>
            <input value={nameInput[w]} onChange={ev => setNameInput(p => ({ ...p, [w]: ev.target.value }))} placeholder={names[w]}
              style={{ ...fieldBase, borderColor: col + "44" }} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: "2rem" }}>
          <button onClick={() => setPage("list")} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", fontSize: 14, fontFamily: SANS, cursor: "pointer", color: T.inkMid }}>Cancel</button>
          <button onClick={saveNames} style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: T.ink, color: T.cloudDancer, fontSize: 14, fontWeight: 500, fontFamily: SANS, cursor: "pointer", letterSpacing: "0.04em" }}>Save</button>
        </div>
      </div>
    </div>
  );

  // ── Add entry ──
  if (page === "add") return (
    <div style={{ minHeight: "100vh", background: T.cloudDancer, fontFamily: SANS, padding: "1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "1rem 0 2rem" }}>
          <button onClick={() => { setPage("list"); setPhotoPreview(null); setPhotoData(null); }}
            style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer", color: T.inkMid, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: T.ink, fontStyle: "italic" }}>New entry</div>
            <div style={{ fontSize: 11, color: T.inkLight, letterSpacing: "0.12em", textTransform: "uppercase" }}>add a chapter</div>
          </div>
        </div>

        {/* Writer toggle */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 10 }}>Written by</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["a", "b"].map(w => {
              const c = COL[w];
              const active = form.writer === w;
              return (
                <button key={w} onClick={() => setForm(p => ({ ...p, writer: w }))}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 14, fontFamily: SANS, fontWeight: 500, cursor: "pointer", border: `1.5px solid ${active ? c.border : T.border}`, background: active ? c.dim : "transparent", color: active ? c.text : T.inkLight, transition: "all 0.2s", letterSpacing: "0.03em" }}>
                  {w === "a" ? names.a : names.b}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Date"          icon="—" value={form.date}     onChange={v => setForm(p => ({ ...p, date: v }))}     type="date" />
        <Field label="Location"      icon="—" value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))} placeholder="Where did you go?" />
        <Field label="Food & drinks" icon="—" value={form.food}     onChange={v => setForm(p => ({ ...p, food: v }))}     placeholder="What did you have?" />

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 7 }}>— &nbsp; Notes</div>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Something you want to remember..." rows={3}
            style={{ ...fieldBase, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {/* Photo */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 10 }}>— &nbsp; Photo</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
          {!photoPreview ? (
            <button onClick={() => fileRef.current.click()}
              style={{ width: "100%", padding: "22px", borderRadius: 12, border: `1.5px dashed ${T.border}`, background: "transparent", color: T.inkLight, fontSize: 13, fontFamily: SANS, cursor: "pointer", letterSpacing: "0.06em", transition: "all 0.2s" }}
              onMouseEnter={ev => { ev.currentTarget.style.borderColor = T.caramel; ev.currentTarget.style.color = T.inkMid; }}
              onMouseLeave={ev => { ev.currentTarget.style.borderColor = T.border; ev.currentTarget.style.color = T.inkLight; }}>
              {uploading ? "processing..." : "+ add photo"}
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <img src={photoPreview} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, border: `1.5px solid ${T.border}` }} />
              <button onClick={() => { setPhotoPreview(null); setPhotoData(null); }}
                style={{ position: "absolute", top: 10, right: 10, background: "rgba(240,238,233,0.85)", border: `1.5px solid ${T.border}`, color: T.inkMid, borderRadius: "50%", width: 30, height: 30, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          )}
        </div>

        {/* Cloud level rating */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkLight, marginBottom: 12 }}>— &nbsp; Cloud level</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setForm(p => ({ ...p, hearts: n }))}
                style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: n <= form.hearts ? T.caramel : T.inkLight, opacity: n <= form.hearts ? 1 : 0.3, transition: "all 0.15s", padding: 0 }}>
                ☁
              </button>
            ))}
            <span style={{ marginLeft: 8, fontSize: 15, color: T.inkLight, fontStyle: "italic", fontFamily: DISPLAY }}>
              {["", "partly cloudy", "light breeze", "clear skies", "floating", "cloud nine ✦"][form.hearts]}
            </span>
          </div>
        </div>

        <button onClick={addEntry}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: T.ink, color: T.cloudDancer, fontSize: 14, fontWeight: 500, fontFamily: SANS, cursor: "pointer", letterSpacing: "0.08em", transition: "opacity 0.2s" }}
          onMouseEnter={ev => ev.currentTarget.style.opacity = "0.85"}
          onMouseLeave={ev => ev.currentTarget.style.opacity = "1"}>
          SAVE THIS CHAPTER
        </button>
      </div>
    </div>
  );

  // ── Main list ──────────────────────────────────────────
  const monthGroups = groupByMonth(filtered);

  return (
    <div style={{ minHeight: "100vh", background: T.cloudDancer, fontFamily: SANS }}>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "1.5rem 1rem 0" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 46, color: T.ink, fontStyle: "italic", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.01em" }}>
              Chapters
            </div>
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

        {/* ── Search ── */}
        {showSearch && (
          <div style={{ marginBottom: "1.1rem" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." autoFocus
              style={{ ...fieldBase, fontSize: 14, borderColor: search ? T.caramel : T.border }} />
            {search && <div style={{ fontSize: 12, color: T.inkLight, marginTop: 6 }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>}
          </div>
        )}

        {/* ── Stats Strip (new) ── */}
        {entries.length > 0 && !search && <StatsStrip entries={entries} names={names} />}

        {/* ── Filter + view toggle ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[["all", "All"], ["a", names.a], ["b", names.b]].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: SANS, cursor: "pointer", border: `1.5px solid ${filter === k ? T.caramel : T.border}`, background: filter === k ? "rgba(196,122,72,0.08)" : "transparent", color: filter === k ? T.caramel : T.inkLight, letterSpacing: "0.06em", transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", border: `1.5px solid ${T.border}`, borderRadius: 9, overflow: "hidden" }}>
            {[["grid", "▦"], ["timeline", "☰"]].map(([m, icon]) => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: "6px 12px", border: "none", background: viewMode === m ? T.surface2 : "transparent", color: viewMode === m ? T.ink : T.inkLight, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 1rem 6rem" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 64, color: T.inkLight, fontStyle: "italic", opacity: 0.3 }}>☁</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: T.inkMid, marginTop: 16, fontStyle: "italic" }}>
              {search ? `Nothing found for "${search}"` : "Your story starts here"}
            </div>
            <div style={{ fontSize: 13, color: T.inkLight, marginTop: 8, letterSpacing: "0.06em" }}>
              {search ? "Try different keywords" : "Tap + to write the first chapter"}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div style={{ columns: "2 200px", gap: 14 }}>
            {filtered.map((e, i) => <EntryCard key={e.id} e={e} i={i} names={names} setExpandedPhoto={setExpandedPhoto} removeEntry={removeEntry} />)}
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
                  {group.map((e, i) => <EntryCard key={e.id} e={e} i={i} names={names} setExpandedPhoto={setExpandedPhoto} removeEntry={removeEntry} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button onClick={() => setPage("add")}
        style={{ position: "fixed", bottom: "2rem", right: "2rem", width: 54, height: 54, borderRadius: "50%", background: T.ink, border: "none", color: T.cloudDancer, fontSize: 26, cursor: "pointer", boxShadow: "0 8px 24px rgba(28,24,20,0.20)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, transition: "transform 0.2s, box-shadow 0.2s" }}
        onMouseEnter={ev => { ev.currentTarget.style.transform = "scale(1.08)"; ev.currentTarget.style.boxShadow = "0 12px 32px rgba(28,24,20,0.28)"; }}
        onMouseLeave={ev => { ev.currentTarget.style.transform = "scale(1)"; ev.currentTarget.style.boxShadow = "0 8px 24px rgba(28,24,20,0.20)"; }}>
        +
      </button>
    </div>
  );
}
