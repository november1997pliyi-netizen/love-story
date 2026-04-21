import { useState, useEffect, useRef } from "react";
import {
  collection, doc, getDocs, setDoc, deleteDoc, getDoc, onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Design tokens ──────────────────────────────────────
const T = {
  bg:       "#0F0D0B",
  surface:  "#1C1916",
  surface2: "#252119",
  surface3: "#2E2A25",
  border:   "rgba(255,220,160,0.10)",
  borderHov:"rgba(255,220,160,0.22)",
  textPri:  "#F0E8DC",
  textSec:  "#8A7D70",
  textMuted:"#52483E",
  gold:     "#C9956B",
  goldDim:  "rgba(201,149,107,0.15)",
  blue:     "#7B9EBF",
  blueDim:  "rgba(123,158,191,0.15)",
};

const COL = {
  a: { text: T.gold,  dim: T.goldDim, border: "rgba(201,149,107,0.30)" },
  b: { text: T.blue,  dim: T.blueDim, border: "rgba(123,158,191,0.30)" },
};

const DISPLAY = "'Cormorant Garamond', 'Noto Serif SC', serif";
const SANS    = "'DM Sans', 'Noto Sans SC', sans-serif";

// ─── Util ───────────────────────────────────────────────
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

// ─── Shared styles ──────────────────────────────────────
const fieldStyle = {
  width: "100%",
  background: T.surface2,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "11px 14px",
  fontSize: 15,
  fontFamily: SANS,
  color: T.textPri,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

function Field({ label, icon, value, onChange, placeholder, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: 7, fontFamily: SANS }}>
        {icon}&nbsp;&nbsp;{label}
      </div>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...fieldStyle, borderColor: focused ? "rgba(255,220,160,0.35)" : T.border }}
      />
    </div>
  );
}

// ─── Card components ─────────────────────────────────────
function EntryCard({ e, names, setExpandedPhoto, removeEntry, i }) {
  const [hov, setHov] = useState(false);
  const c = COL[e.writer];
  const delay = `${(i % 8) * 35}ms`;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.surface,
        border: `1px solid ${hov ? c.border : T.border}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "border-color 0.25s, transform 0.25s, box-shadow 0.25s",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? `0 12px 36px rgba(0,0,0,0.45), 0 0 0 1px ${c.border}` : "none",
        breakInside: "avoid",
        marginBottom: 14,
        animationDelay: delay,
      }}>
      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${c.text}, transparent)` }} />

      {e.photo && (
        <div style={{ position: "relative", overflow: "hidden" }}>
          <img
            src={e.photo}
            onClick={() => setExpandedPhoto(e.photo)}
            style={{ width: "100%", height: 160, objectFit: "cover", cursor: "zoom-in", display: "block", filter: "brightness(0.92) saturate(0.9)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(15,13,11,0.8))" }} />
        </div>
      )}

      <div style={{ padding: "14px 16px 12px" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontFamily: SANS, letterSpacing: "0.1em", textTransform: "uppercase",
            color: c.text, background: c.dim, padding: "3px 10px", borderRadius: 20,
          }}>
            {e.writer === "a" ? names.a : names.b}
          </span>
          <span style={{ fontSize: 13, color: T.textMuted, fontFamily: SANS }}>{fmtDate(e.date)}</span>
        </div>

        {/* Hearts */}
        <div style={{ fontSize: 11, letterSpacing: 3, marginBottom: 10, color: c.text, opacity: 0.8 }}>
          {"◆".repeat(e.hearts)}{"◇".repeat(5 - e.hearts)}
        </div>

        {e.location && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: T.textMuted, marginTop: 1 }}>⊙</span>
            <span style={{ fontSize: 15, color: T.textPri, fontFamily: SANS, lineHeight: 1.4 }}>{e.location}</span>
          </div>
        )}
        {e.food && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: T.textMuted, marginTop: 1 }}>◎</span>
            <span style={{ fontSize: 15, color: T.textPri, fontFamily: SANS, lineHeight: 1.4 }}>{e.food}</span>
          </div>
        )}

        {e.notes && (
          <div style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${T.border}`,
            fontSize: 14,
            color: T.textSec,
            fontFamily: DISPLAY,
            fontStyle: "italic",
            lineHeight: 1.6,
            letterSpacing: "0.01em",
          }}>
            "{e.notes}"
          </div>
        )}

        <button
          onClick={() => removeEntry(e.id)}
          style={{ marginTop: 10, background: "none", border: "none", fontSize: 11, color: T.textMuted, cursor: "pointer", padding: 0, fontFamily: SANS, letterSpacing: "0.05em", opacity: 0.6, transition: "opacity 0.15s" }}
          onMouseEnter={ev => ev.target.style.opacity = "1"}
          onMouseLeave={ev => ev.target.style.opacity = "0.6"}>
          remove
        </button>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────
export default function App() {
  const [entries, setEntries]       = useState([]);
  const [names, setNames]           = useState({ a: "A", b: "B" });
  const [page, setPage]             = useState("list");
  const [viewMode, setViewMode]     = useState("grid");
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loaded, setLoaded]         = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [nameInput, setNameInput]   = useState({ a: "", b: "" });
  const [form, setForm]             = useState({ writer: "a", date: today(), location: "", food: "", notes: "", hearts: 3 });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoData, setPhotoData]   = useState(null);
  const [uploading, setUploading]   = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    // Load fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(link);
    document.body.style.background = T.bg;
    document.body.style.margin = "0";

    // Load names
    getDoc(doc(db, "config", "names")).then(snap => {
      if (snap.exists()) setNames(snap.data());
    });

    // Realtime listener
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
    setNames(n);
    setPage("list");
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

  // ── Lightbox
  if (expandedPhoto) return (
    <div onClick={() => setExpandedPhoto(null)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, cursor: "zoom-out", padding: "1.5rem" }}>
      <img src={expandedPhoto} style={{ maxWidth: "100%", maxHeight: "92vh", borderRadius: 12, objectFit: "contain" }} />
    </div>
  );

  // ── Loading
  if (!loaded) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, fontFamily: DISPLAY, gap: 16 }}>
      <div style={{ fontSize: 42, color: T.gold, fontStyle: "italic", letterSpacing: "0.04em" }}>Chapters</div>
      <div style={{ fontSize: 13, color: T.textMuted, fontFamily: SANS, letterSpacing: "0.1em" }}>connecting...</div>
    </div>
  );

  // ── Setup page
  if (page === "setup") return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: SANS }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "2.5rem 2rem", maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 32, color: T.textPri, marginBottom: 6, fontWeight: 500 }}>The two of you</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: "2rem", letterSpacing: "0.03em" }}>Name the two narrators</div>

        {[["a", T.gold, "rgba(201,149,107,0.25)"], ["b", T.blue, "rgba(123,158,191,0.25)"]].map(([w, col, bdr]) => (
          <div key={w} style={{ marginBottom: "1.2rem" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: 7 }}>
              {w === "a" ? "First person" : "Second person"}
            </div>
            <input
              value={nameInput[w]}
              onChange={ev => setNameInput(p => ({ ...p, [w]: ev.target.value }))}
              placeholder={names[w]}
              style={{ ...fieldStyle, borderColor: col + "55" }}
            />
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: "2rem" }}>
          <button onClick={() => setPage("list")} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", fontSize: 14, fontFamily: SANS, cursor: "pointer", color: T.textSec }}>Cancel</button>
          <button onClick={saveNames} style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: T.gold, color: "#1A1410", fontSize: 14, fontWeight: 500, fontFamily: SANS, cursor: "pointer", letterSpacing: "0.04em" }}>Save changes</button>
        </div>
      </div>
    </div>
  );

  // ── Add page
  if (page === "add") return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: SANS, padding: "1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: "3rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "1rem 0 2rem" }}>
          <button onClick={() => { setPage("list"); setPhotoPreview(null); setPhotoData(null); }}
            style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, width: 40, height: 40, fontSize: 18, cursor: "pointer", color: T.textSec, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: T.textPri, fontStyle: "italic" }}>New entry</div>
            <div style={{ fontSize: 12, color: T.textMuted, letterSpacing: "0.08em" }}>ADD A CHAPTER</div>
          </div>
        </div>

        {/* Writer select */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: 10 }}>Written by</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["a", "b"].map(w => {
              const c = COL[w];
              const active = form.writer === w;
              return (
                <button key={w} onClick={() => setForm(p => ({ ...p, writer: w }))}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 14, fontFamily: SANS, fontWeight: 500, cursor: "pointer", border: `1px solid ${active ? c.border : T.border}`, background: active ? c.dim : "transparent", color: active ? c.text : T.textSec, transition: "all 0.2s", letterSpacing: "0.03em" }}>
                  {w === "a" ? names.a : names.b}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Date" icon="—" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} type="date" />
        <Field label="Location" icon="—" value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))} placeholder="Where did you go?" />
        <Field label="Food & drinks" icon="—" value={form.food} onChange={v => setForm(p => ({ ...p, food: v }))} placeholder="What did you have?" />

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: 7 }}>— &nbsp; Notes</div>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Something you want to remember..." rows={3}
            style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {/* Photo */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: 10 }}>— &nbsp; Photo</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
          {!photoPreview ? (
            <button onClick={() => fileRef.current.click()}
              style={{ width: "100%", padding: "22px", borderRadius: 12, border: `1px dashed rgba(255,220,160,0.2)`, background: "transparent", color: T.textMuted, fontSize: 13, fontFamily: SANS, cursor: "pointer", letterSpacing: "0.06em", transition: "border-color 0.2s, color 0.2s" }}
              onMouseEnter={ev => { ev.target.style.borderColor = "rgba(255,220,160,0.5)"; ev.target.style.color = T.textSec; }}
              onMouseLeave={ev => { ev.target.style.borderColor = "rgba(255,220,160,0.2)"; ev.target.style.color = T.textMuted; }}>
              {uploading ? "processing..." : "+ add photo"}
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <img src={photoPreview} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, border: `1px solid ${T.border}`, filter: "brightness(0.9)" }} />
              <button onClick={() => { setPhotoPreview(null); setPhotoData(null); }}
                style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, color: T.textSec, borderRadius: "50%", width: 30, height: 30, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          )}
        </div>

        {/* Hearts / rating */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: 14 }}>— &nbsp; How was it?</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setForm(p => ({ ...p, hearts: n }))}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: n <= form.hearts ? T.gold : T.textMuted, opacity: n <= form.hearts ? 1 : 0.3, transition: "all 0.15s", padding: 0, letterSpacing: 0 }}>
                ◆
              </button>
            ))}
            <span style={{ marginLeft: 6, fontSize: 13, color: T.textMuted, fontStyle: "italic", fontFamily: DISPLAY }}>
              {["", "it was okay", "pretty good", "really nice", "amazing", "unforgettable"][form.hearts]}
            </span>
          </div>
        </div>

        <button onClick={addEntry}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: T.gold, color: "#1A1410", fontSize: 14, fontWeight: 500, fontFamily: SANS, cursor: "pointer", letterSpacing: "0.06em", boxShadow: "0 8px 24px rgba(201,149,107,0.25)", transition: "opacity 0.2s" }}
          onMouseEnter={ev => ev.currentTarget.style.opacity = "0.88"}
          onMouseLeave={ev => ev.currentTarget.style.opacity = "1"}>
          SAVE THIS CHAPTER
        </button>
      </div>
    </div>
  );

  // ── Main list page ──────────────────────────────────────
  const monthGroups = groupByMonth(filtered);
  const avgHearts = entries.length ? (entries.reduce((s, e) => s + e.hearts, 0) / entries.length).toFixed(1) : "—";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: SANS }}>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "1.5rem 1rem 0" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 44, color: T.textPri, fontStyle: "italic", fontWeight: 500, lineHeight: 1, letterSpacing: "-0.01em" }}>
              Chapters
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 6 }}>
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

        {/* Search bar */}
        {showSearch && (
          <div style={{ marginBottom: "1.2rem" }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search entries..." autoFocus
              style={{ ...fieldStyle, fontSize: 14, borderColor: search ? "rgba(255,220,160,0.35)" : T.border }}
            />
            {search && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6, letterSpacing: "0.05em" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>}
          </div>
        )}

        {/* Stats row */}
        {entries.length > 0 && !search && (
          <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
            {[
              { label: names.a, val: entries.filter(e => e.writer === "a").length, col: T.gold },
              { label: names.b, val: entries.filter(e => e.writer === "b").length, col: T.blue },
              { label: "avg rating", val: avgHearts + " ◆", col: T.textSec },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 22, fontFamily: DISPLAY, color: s.col, fontWeight: 600, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[["all", "All"], ["a", names.a], ["b", names.b]].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontFamily: SANS, cursor: "pointer", border: `1px solid ${filter === k ? "rgba(255,220,160,0.4)" : T.border}`, background: filter === k ? "rgba(255,220,160,0.08)" : "transparent", color: filter === k ? T.gold : T.textMuted, letterSpacing: "0.06em", transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
            {[["grid", "▦"], ["timeline", "☰"]].map(([m, icon]) => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: "6px 12px", border: "none", background: viewMode === m ? T.surface3 : "transparent", color: viewMode === m ? T.gold : T.textMuted, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>
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
            <div style={{ fontFamily: DISPLAY, fontSize: 56, color: T.textMuted, fontStyle: "italic", opacity: 0.4 }}>—</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, color: T.textSec, marginTop: 12, fontStyle: "italic" }}>
              {search ? `Nothing found for "${search}"` : "Your story starts here"}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 8, letterSpacing: "0.06em" }}>
              {search ? "Try different keywords" : "Tap + to write the first chapter"}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div style={{ columns: "2 200px", gap: 14 }}>
            {filtered.map((e, i) => (
              <EntryCard key={e.id} e={e} i={i} names={names} setExpandedPhoto={setExpandedPhoto} removeEntry={removeEntry} />
            ))}
          </div>
        ) : (
          // Timeline view
          <div style={{ position: "relative" }}>
            {/* Thin line */}
            <div style={{ position: "absolute", left: 16, top: 8, bottom: 0, width: 1, background: `linear-gradient(180deg, ${T.gold}55, ${T.blue}33, transparent)` }} />
            {monthGroups.map(([ym, group]) => (
              <div key={ym} style={{ marginBottom: "2.5rem" }}>
                {/* Month header */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "1.2rem" }}>
                  <div style={{ width: 33, height: 33, borderRadius: "50%", background: T.surface2, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: DISPLAY, fontSize: 22, color: T.textPri, fontStyle: "italic" }}>{monthLabel(ym)}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{group.length} {group.length === 1 ? "entry" : "entries"}</div>
                  </div>
                </div>
                <div style={{ marginLeft: 49 }}>
                  {group.map((e, i) => (
                    <EntryCard key={e.id} e={e} i={i} names={names} setExpandedPhoto={setExpandedPhoto} removeEntry={removeEntry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setPage("add")}
        style={{ position: "fixed", bottom: "2rem", right: "2rem", width: 56, height: 56, borderRadius: "50%", background: T.gold, border: "none", color: "#1A1410", fontSize: 26, cursor: "pointer", boxShadow: "0 8px 28px rgba(201,149,107,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, transition: "transform 0.2s, box-shadow 0.2s" }}
        onMouseEnter={ev => { ev.currentTarget.style.transform = "scale(1.08)"; ev.currentTarget.style.boxShadow = "0 12px 36px rgba(201,149,107,0.45)"; }}
        onMouseLeave={ev => { ev.currentTarget.style.transform = "scale(1)"; ev.currentTarget.style.boxShadow = "0 8px 28px rgba(201,149,107,0.35)"; }}>
        +
      </button>
    </div>
  );
}

function IconBtn({ children, onClick, active }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: active || hov ? T.surface2 : "transparent", border: `1px solid ${active ? "rgba(255,220,160,0.35)" : T.border}`, borderRadius: 10, width: 40, height: 40, cursor: "pointer", color: active ? T.gold : T.textSec, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
      {children}
    </button>
  );
}
