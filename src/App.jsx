import { useState, useEffect, useRef } from "react";
import {
  collection, doc, getDocs, setDoc, deleteDoc, getDoc, onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

// ─── 常量 ───────────────────────────────────────────────
const FONT = "'Caveat', cursive";
const COL = {
  a: { bg: "#FFF0F5", border: "#FFB8CE", badge: "#E84080", strip: "linear-gradient(90deg,#FFB8CE,#E84080)" },
  b: { bg: "#F0F5FF", border: "#B3CAFF", badge: "#4878FF", strip: "linear-gradient(90deg,#B3CAFF,#4878FF)" },
};
const ROTS = [-1.5, 1.2, -0.8, 2.0, -1.8, 0.6, 1.5, -0.4, 1.0, -1.2];

// ─── 工具函数 ────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function today() { return new Date().toISOString().split("T")[0]; }

// 压缩图片（存到 Firestore 前缩小尺寸，避免超过 1MB 限制）
function resizeImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 600;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.65));
    };
    img.src = url;
  });
}

function groupByMonth(entries) {
  const groups = {};
  entries.forEach(e => {
    const key = e.date ? e.date.slice(0, 7) : "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function monthLabel(ym) {
  if (ym === "unknown") return "日期未知";
  const [y, m] = ym.split("-");
  const names = ["","一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
  return `${y}年 ${names[parseInt(m)]}`;
}

// ─── 小组件 ──────────────────────────────────────────────
function StyledInput({ label, icon, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <div style={{ fontSize: 18, color: "#999", marginBottom: 5 }}>{icon} {label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: "2px solid #FFD5E5", borderRadius: 13, padding: "9px 13px", fontSize: 19, fontFamily: FONT, outline: "none", boxSizing: "border-box", background: "white", color: "#333" }} />
    </div>
  );
}

function GridCard({ e, i, names, hoveredId, setHoveredId, setExpandedPhoto, removeEntry }) {
  const c = COL[e.writer];
  const rot = ROTS[i % ROTS.length];
  const isHov = hoveredId === e.id;
  const dateStr = e.date ? new Date(e.date + "T12:00:00").toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) : "";
  return (
    <div onMouseEnter={() => setHoveredId(e.id)} onMouseLeave={() => setHoveredId(null)}
      style={{ display: "inline-block", width: "100%", marginBottom: 13, background: "white", borderRadius: 18, border: `2px solid ${c.border}`, padding: "0 0 12px", transform: isHov ? "rotate(0deg) scale(1.03)" : `rotate(${rot}deg)`, boxShadow: isHov ? "0 12px 32px rgba(0,0,0,0.13)" : "2px 4px 13px rgba(0,0,0,0.07)", transition: "transform 0.25s, box-shadow 0.25s", breakInside: "avoid" }}>
      <div style={{ height: 9, background: c.strip, borderRadius: "16px 16px 0 0", marginBottom: 10 }} />
      <div style={{ padding: "0 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7, flexWrap: "wrap", gap: 4 }}>
          <span style={{ background: c.bg, color: c.badge, fontSize: 13, fontWeight: 700, padding: "3px 9px", borderRadius: 20, border: `1.5px solid ${c.border}` }}>
            {e.writer === "a" ? `💛 ${names.a}` : `💙 ${names.b}`}
          </span>
          <span style={{ fontSize: 13, color: "#CCC" }}>{dateStr}</span>
        </div>
        <div style={{ fontSize: 12, letterSpacing: 1, marginBottom: 7 }}>{"❤️".repeat(e.hearts)}{"🤍".repeat(5 - e.hearts)}</div>
        {e.photo && <img src={e.photo} onClick={() => setExpandedPhoto(e.photo)} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 12, marginBottom: 8, cursor: "zoom-in" }} />}
        {e.location && <div style={{ fontSize: 17, marginBottom: 4 }}>📍 {e.location}</div>}
        {e.food && <div style={{ fontSize: 17, marginBottom: 4 }}>🍜 {e.food}</div>}
        {e.notes && <div style={{ fontSize: 15, color: "#888", lineHeight: 1.4, marginTop: 6, borderTop: "1.5px dashed #F5DDE8", paddingTop: 6 }}>{e.notes}</div>}
        <button onClick={() => removeEntry(e.id)}
          style={{ marginTop: 9, background: "none", border: "none", fontSize: 12, color: "#DDD", cursor: "pointer", padding: 0, fontFamily: FONT }}
          onMouseEnter={ev => ev.target.style.color = "#E84080"} onMouseLeave={ev => ev.target.style.color = "#DDD"}>
          × 删除
        </button>
      </div>
    </div>
  );
}

function TimelineCard({ e, names, setExpandedPhoto, removeEntry }) {
  const c = COL[e.writer];
  const [hov, setHov] = useState(false);
  const dateStr = e.date ? new Date(e.date + "T12:00:00").toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "";
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "white", borderRadius: 18, border: `2px solid ${c.border}`, overflow: "hidden", boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.1)" : "0 2px 10px rgba(0,0,0,0.05)", transition: "box-shadow 0.2s", marginBottom: 12 }}>
      {e.photo && <img src={e.photo} onClick={() => setExpandedPhoto(e.photo)} style={{ width: "100%", height: 160, objectFit: "cover", cursor: "zoom-in", display: "block" }} />}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
          <span style={{ background: c.bg, color: c.badge, fontSize: 14, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: `1.5px solid ${c.border}` }}>
            {e.writer === "a" ? `💛 ${names.a}` : `💙 ${names.b}`}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13 }}>{"❤️".repeat(e.hearts)}{"🤍".repeat(5 - e.hearts)}</span>
            <span style={{ fontSize: 14, color: "#CCC" }}>{dateStr}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {e.location && <span style={{ fontSize: 18 }}>📍 {e.location}</span>}
          {e.food && <span style={{ fontSize: 18 }}>🍜 {e.food}</span>}
        </div>
        {e.notes && <div style={{ fontSize: 16, color: "#888", lineHeight: 1.45, marginTop: 8, borderTop: "1px dashed #F5DDE8", paddingTop: 8 }}>{e.notes}</div>}
        <button onClick={() => removeEntry(e.id)}
          style={{ marginTop: 8, background: "none", border: "none", fontSize: 12, color: "#DDD", cursor: "pointer", padding: 0, fontFamily: FONT }}
          onMouseEnter={ev => ev.target.style.color = "#E84080"} onMouseLeave={ev => ev.target.style.color = "#DDD"}>
          × 删除
        </button>
      </div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────
export default function App() {
  const [entries, setEntries] = useState([]);
  const [names, setNames] = useState({ a: "我", b: "你" });
  const [page, setPage] = useState("list");
  const [viewMode, setViewMode] = useState("grid");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [nameInput, setNameInput] = useState({ a: "", b: "" });
  const [form, setForm] = useState({ writer: "a", date: today(), location: "", food: "", notes: "", hearts: 5 });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    // 加载 Google Fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap";
    document.head.appendChild(link);

    // 加载名字配置
    getDoc(doc(db, "config", "names")).then(snap => {
      if (snap.exists()) setNames(snap.data());
    });

    // 实时监听记录（两个人都能看到对方的更新）
    const unsub = onSnapshot(collection(db, "entries"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.at || 0) - (a.at || 0));
      setEntries(data);
      setLoaded(true);
    });

    return () => unsub();
  }, []);

  async function addEntry() {
    if (!form.location && !form.food && !form.notes && !photoData) return alert("至少填一项嘛~");
    const id = uid();
    const entry = { ...form, at: Date.now() };
    if (photoData) entry.photo = photoData;
    await setDoc(doc(db, "entries", id), entry);
    setForm(p => ({ ...p, date: today(), location: "", food: "", notes: "", hearts: 5 }));
    setPhotoPreview(null); setPhotoData(null);
    setPage("list");
  }

  async function removeEntry(id) {
    if (!confirm("确认删除这条记录？")) return;
    await deleteDoc(doc(db, "entries", id));
  }

  async function saveNames() {
    const n = { a: nameInput.a.trim() || "我", b: nameInput.b.trim() || "你" };
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

  // ── LIGHTBOX ──
  if (expandedPhoto) return (
    <div onClick={() => setExpandedPhoto(null)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, cursor: "zoom-out", padding: "1rem" }}>
      <img src={expandedPhoto} style={{ maxWidth: "100%", maxHeight: "92vh", borderRadius: 16, objectFit: "contain" }} />
    </div>
  );

  // ── 加载中 ──
  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: FONT, fontSize: 28, color: "#E84080", background: "#FFF8F5" }}>
      ✦ 连接中...
    </div>
  );

  // ── 设置页 ──
  if (page === "setup") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FFF5F5,#FFF0FF)", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ background: "white", borderRadius: 24, padding: "2rem", maxWidth: 380, width: "100%", boxShadow: "0 8px 32px rgba(232,64,128,0.12)", border: "2px solid #FFD5E5" }}>
        <div style={{ fontSize: 34, fontWeight: 700, textAlign: "center", marginBottom: "1.5rem", color: "#E84080" }}>💕 两个人的名字</div>
        {[["a","💛","#FFB8CE"],["b","💙","#B3CAFF"]].map(([w,em,bdr]) => (
          <div key={w} style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 18, color: "#AAA", marginBottom: 6 }}>{em} {w === "a" ? "第一位" : "第二位"}</div>
            <input value={nameInput[w]} onChange={ev => setNameInput(p => ({ ...p, [w]: ev.target.value }))} placeholder={names[w]}
              style={{ width: "100%", border: `2px solid ${bdr}`, borderRadius: 12, padding: "10px 14px", fontSize: 22, fontFamily: FONT, outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: "1.5rem" }}>
          <button onClick={() => setPage("list")} style={{ flex: 1, padding: 12, borderRadius: 14, border: "2px solid #EEE", background: "white", fontSize: 20, fontFamily: FONT, cursor: "pointer", color: "#888" }}>取消</button>
          <button onClick={saveNames} style={{ flex: 2, padding: 12, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#E84080,#FF8E53)", color: "white", fontSize: 20, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>保存 ✨</button>
        </div>
      </div>
    </div>
  );

  // ── 添加记录页 ──
  if (page === "add") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FFF5F5,#FFF8F0)", fontFamily: FONT, padding: "1rem" }}>
      <div style={{ maxWidth: 500, margin: "0 auto", paddingBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.4rem", paddingTop: "0.5rem" }}>
          <button onClick={() => { setPage("list"); setPhotoPreview(null); setPhotoData(null); }} style={{ background: "none", border: "none", fontSize: 28, cursor: "pointer", color: "#AAA" }}>←</button>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#E84080" }}>记录新约会 📝</div>
        </div>
        <div style={{ marginBottom: "1.3rem" }}>
          <div style={{ fontSize: 18, color: "#999", marginBottom: 7 }}>谁在写？</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["a","b"].map(w => (
              <button key={w} onClick={() => setForm(p => ({ ...p, writer: w }))}
                style={{ flex: 1, padding: "11px 0", borderRadius: 16, fontSize: 20, fontWeight: 700, fontFamily: FONT, cursor: "pointer", border: `2px solid ${form.writer === w ? COL[w].badge : "#EEE"}`, background: form.writer === w ? COL[w].bg : "white", color: form.writer === w ? COL[w].badge : "#BBB", transition: "all 0.2s" }}>
                {w === "a" ? `💛 ${names.a}` : `💙 ${names.b}`}
              </button>
            ))}
          </div>
        </div>
        <StyledInput label="日期" icon="📅" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} type="date" />
        <StyledInput label="地点" icon="📍" value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))} placeholder="去了哪里？" />
        <StyledInput label="吃了什么" icon="🍜" value={form.food} onChange={v => setForm(p => ({ ...p, food: v }))} placeholder="今天的美食是？" />
        <div style={{ marginBottom: "1.1rem" }}>
          <div style={{ fontSize: 18, color: "#999", marginBottom: 5 }}>💬 小记</div>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="今天最开心的瞬间..." rows={3}
            style={{ width: "100%", border: "2px solid #FFD5E5", borderRadius: 13, padding: "9px 13px", fontSize: 19, fontFamily: FONT, outline: "none", boxSizing: "border-box", resize: "vertical", background: "white", color: "#333" }} />
        </div>
        <div style={{ marginBottom: "1.3rem" }}>
          <div style={{ fontSize: 18, color: "#999", marginBottom: 7 }}>📸 上传照片</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
          {!photoPreview ? (
            <button onClick={() => fileRef.current.click()}
              style={{ width: "100%", padding: "20px", borderRadius: 16, border: "2.5px dashed #FFB8CE", background: "#FFF5F8", color: "#E84080", fontSize: 18, fontFamily: FONT, cursor: "pointer" }}>
              {uploading ? "处理中..." : "+ 选择照片"}
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <img src={photoPreview} style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 16, border: "2px solid #FFB8CE" }} />
              <button onClick={() => { setPhotoPreview(null); setPhotoData(null); }}
                style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.5)", border: "none", color: "white", borderRadius: "50%", width: 32, height: 32, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          )}
        </div>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: 18, color: "#999", marginBottom: 8 }}>今天的甜度</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setForm(p => ({ ...p, hearts: n }))}
                style={{ background: "none", border: "none", fontSize: 32, cursor: "pointer", opacity: n <= form.hearts ? 1 : 0.2, transition: "all 0.15s", transform: n <= form.hearts ? "scale(1.12)" : "scale(1)", padding: 0 }}>❤️</button>
            ))}
            <span style={{ marginLeft: 10, fontSize: 18, color: "#CCC" }}>{["","一般啦","还不错","挺甜的","好甜啊","最最甜！"][form.hearts]}</span>
          </div>
        </div>
        <button onClick={addEntry}
          style={{ width: "100%", padding: "15px", borderRadius: 18, border: "none", background: "linear-gradient(135deg,#E84080,#FF8E53)", color: "white", fontSize: 23, fontWeight: 700, fontFamily: FONT, cursor: "pointer", boxShadow: "0 6px 20px rgba(232,64,128,0.3)" }}>
          存起来 💾
        </button>
      </div>
    </div>
  );

  // ── 主列表页 ──
  const monthGroups = groupByMonth(filtered);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FFF5F5 0%,#FFF8F0 45%,#F5F0FF 100%)", fontFamily: FONT }}>
      <div style={{ padding: "1.4rem 1rem 0", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 38, fontWeight: 700, color: "#CC1C4A", lineHeight: 1.05 }}>我们的约会本</div>
            <div style={{ fontSize: 18, color: "#CCAABB", marginTop: 3 }}>{entries.length > 0 ? `共 ${entries.length} 次美好回忆 ✦` : "开始记录你们的故事 ✦"}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowSearch(s => !s)}
              style={{ background: showSearch ? "#FFE5EF" : "white", border: `2px solid ${showSearch ? "#E84080" : "#FFD5E5"}`, borderRadius: 13, width: 44, height: 44, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🔍</button>
            <button onClick={() => { setNameInput({ a: names.a, b: names.b }); setPage("setup"); }}
              style={{ background: "white", border: "2px solid #FFD5E5", borderRadius: 13, width: 44, height: 44, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⚙️</button>
          </div>
        </div>

        {showSearch && (
          <div style={{ marginTop: "1rem" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索地点、美食、记录..." autoFocus
              style={{ width: "100%", border: "2px solid #FFB8CE", borderRadius: 14, padding: "10px 14px", fontSize: 19, fontFamily: FONT, outline: "none", boxSizing: "border-box", background: "white", color: "#333" }} />
            {search && <div style={{ fontSize: 16, color: "#CCC", marginTop: 5 }}>找到 {filtered.length} 条结果</div>}
          </div>
        )}

        {entries.length > 0 && !search && (
          <div style={{ display: "flex", gap: 8, margin: "1rem 0 0" }}>
            {[
              { label: names.a + " 写了", val: entries.filter(e => e.writer === "a").length, col: COL.a },
              { label: names.b + " 写了", val: entries.filter(e => e.writer === "b").length, col: COL.b },
              { label: "平均甜度", val: (entries.reduce((s,e) => s + e.hearts, 0) / entries.length).toFixed(1) + " ❤", col: { bg: "#FFF5F0", badge: "#FF7A30", border: "#FFD5BB" } },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, background: s.col.bg, borderRadius: 14, padding: "8px 11px", border: `1.5px solid ${s.col.border || "#FFE5D5"}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.col.badge }}>{s.val}</div>
                <div style={{ fontSize: 13, color: "#BBAAAA" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "1rem 0" }}>
          <div style={{ display: "flex", gap: 7 }}>
            {[["all","全部 🗓"],["a",`💛 ${names.a}`],["b",`💙 ${names.b}`]].map(([k,label]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding: "7px 14px", borderRadius: 22, fontSize: 16, fontFamily: FONT, cursor: "pointer", border: filter === k ? "2px solid #E84080" : "2px solid #EEE", background: filter === k ? "#E84080" : "white", color: filter === k ? "white" : "#AAA", fontWeight: filter === k ? 700 : 400, transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", border: "2px solid #EEE", borderRadius: 12, overflow: "hidden" }}>
            {[["grid","⊞"],["timeline","≡"]].map(([m,icon]) => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: "6px 12px", border: "none", background: viewMode === m ? "#E84080" : "white", color: viewMode === m ? "white" : "#BBB", fontSize: 18, cursor: "pointer", fontFamily: FONT, transition: "all 0.2s" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 1rem 6rem", maxWidth: 640, margin: "0 auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <div style={{ fontSize: 64 }}>{search ? "🔍" : "📖"}</div>
            <div style={{ fontSize: 24, marginTop: 16, color: "#CCAABB" }}>{search ? `没找到"${search}"` : "还没有记录哦"}</div>
            <div style={{ fontSize: 18, marginTop: 6, color: "#DDD" }}>{search ? "换个关键词试试" : "点 + 开始记录第一次约会"}</div>
          </div>
        ) : viewMode === "grid" ? (
          <div style={{ columns: 2, gap: 13, columnFill: "balance" }}>
            {filtered.map((e, i) => <GridCard key={e.id} e={e} i={i} names={names} hoveredId={hoveredId} setHoveredId={setHoveredId} setExpandedPhoto={setExpandedPhoto} removeEntry={removeEntry} />)}
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 22, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg,#FFB8CE,#B3CAFF)", opacity: 0.4, borderRadius: 2 }} />
            {monthGroups.map(([ym, group]) => (
              <div key={ym} style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#E84080,#FF8E53)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, boxShadow: "0 3px 12px rgba(232,64,128,0.3)", zIndex: 1 }}>🗓</div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#CC2244" }}>{monthLabel(ym)}</div>
                    <div style={{ fontSize: 15, color: "#CCAABB" }}>{group.length} 次约会</div>
                  </div>
                </div>
                <div style={{ marginLeft: 58 }}>
                  {group.map(e => <TimelineCard key={e.id} e={e} names={names} setExpandedPhoto={setExpandedPhoto} removeEntry={removeEntry} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setPage("add")}
        style={{ position: "fixed", bottom: "2rem", right: "2rem", width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(135deg,#E84080,#FF8E53)", border: "none", color: "white", fontSize: 34, cursor: "pointer", boxShadow: "0 6px 24px rgba(232,64,128,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, transition: "transform 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>+</button>
    </div>
  );
}
