/* ══════════════════════════════════════════════
   GLOBALS
══════════════════════════════════════════════ */
const API   = "/api";
const token = localStorage.getItem("fu_token");
const yo    = JSON.parse(localStorage.getItem("fu_usuario") || "null");
if (!token || !yo) window.location.href = "/login.html";

/* ── Nav links ── */
document.getElementById("navPerfil").href = `profile.html?handle=${yo.handle}`;
document.getElementById("bnPerfil").href  = `profile.html?handle=${yo.handle}`;

/* ── Sidebar user ── */
const _av = yo.avatarTipo === "video"
  ? `<video src="${yo.avatar}" autoplay loop muted playsinline style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0"></video>`
  : `<img src="${yo.avatar}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" alt=""/>`;
document.getElementById("sidebarUser").innerHTML = `
  ${_av}
  <div style="min-width:0">
    <strong style="font-size:.87rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(yo.nombre)}</strong>
    <small style="color:var(--text-3)">@${escHtml(yo.handle)}</small>
  </div>
`;

/* ══════════════════════════════════════════════
   BÚSQUEDA
══════════════════════════════════════════════ */
let tipoActual  = "todo";
let searchTimer = null;

/* Tabs */
document.querySelectorAll(".search-tabs .tab-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".search-tabs .tab-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    tipoActual = this.dataset.tipo;
    const q = document.getElementById("searchInput").value.trim();
    if (q) buscar(q, tipoActual);
  });
});

/* Input con debounce */
const inp = document.getElementById("searchInput");
inp.addEventListener("input", function () {
  document.getElementById("btnClearSearch").classList.toggle("hidden", !this.value);
  clearTimeout(searchTimer);
  if (!this.value.trim()) { mostrarPlaceholder(); return; }
  searchTimer = setTimeout(() => buscar(this.value.trim(), tipoActual), 400);
});

document.getElementById("btnClearSearch").addEventListener("click", () => {
  inp.value = "";
  document.getElementById("btnClearSearch").classList.add("hidden");
  mostrarPlaceholder();
  inp.focus();
});

function mostrarPlaceholder() {
  document.getElementById("searchResults").innerHTML = `
    <div class="explore-placeholder">
      <i class="ri-search-2-line" style="font-size:3rem;color:var(--text-3)"></i>
      <p>Escribe algo para buscar</p>
    </div>`;
}

async function buscar(q, tipo) {
  const box = document.getElementById("searchResults");
  box.innerHTML = `<div class="loading"><i class="ri-loader-4-line spin"></i> Buscando...</div>`;
  try {
    const res  = await fetch(`${API}/search?q=${encodeURIComponent(q)}&tipo=${tipo}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    let html = "";

    /* ── Usuarios ── */
    if (data.usuarios?.length && (tipo === "todo" || tipo === "usuarios")) {
      html += `<div class="search-section-title"><i class="ri-user-3-line"></i> Usuarios</div>`;
      html += data.usuarios.map(u => {
        const ms    = getMarcoStyle(u.personalizacion);
        const avEl  = u.avatarTipo === "video"
          ? `<video src="${u.avatar}" autoplay loop muted playsinline style="width:46px;height:46px;border-radius:50%;object-fit:cover;${ms}"></video>`
          : `<img src="${u.avatar}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;${ms}" alt=""/>`;
        return `
          <div class="search-user-result" onclick="window.location.href='profile.html?handle=${escHtml(u.handle)}'">
            <div style="flex-shrink:0">${avEl}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:4px">${renderNombreHTML(u)}</div>
              <small style="color:var(--text-3)">@${escHtml(u.handle)}</small>
              ${u.bio ? `<p style="font-size:.8rem;color:var(--text-2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(u.bio)}</p>` : ""}
            </div>
            <button class="btn-follow-search ${u.sigues ? 'siguiendo' : ''}"
                    onclick="event.stopPropagation();toggleFollowSearch(this,'${u._id}')">
              ${u.sigues
                ? `<i class="ri-user-follow-line"></i> Siguiendo`
                : `<i class="ri-user-add-line"></i> Seguir`}
            </button>
          </div>`;
      }).join("");
    }

    /* ── Posts ── */
    if (data.posts?.length && (tipo === "todo" || tipo === "posts")) {
      html += `<div class="search-section-title"><i class="ri-article-line"></i> Posts</div>`;
      html += data.posts.map(p => {
        const ms   = getMarcoStyle(p.autor.personalizacion);
        const avEl = p.autor.avatarTipo === "video"
          ? `<video src="${p.autor.avatar}" autoplay loop muted playsinline style="width:42px;height:42px;border-radius:50%;object-fit:cover;${ms}"></video>`
          : `<img src="${p.autor.avatar}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;${ms}" alt=""/>`;
        const imgEl = p.imagen
          ? `<img src="${p.imagen}" style="width:100%;max-height:200px;object-fit:cover;border-radius:10px;margin-top:8px" loading="lazy"/>`
          : "";
        return `
          <div class="post-card" onclick="window.location.href='profile.html?handle=${escHtml(p.autor.handle)}'">
            ${avEl}
            <div class="post-body">
              <div class="post-user">
                ${renderNombreHTML(p.autor)}
                <span class="handle">@${escHtml(p.autor.handle)}</span>
                <span class="post-time">· ${tiempoRelativo(p.createdAt)}</span>
              </div>
              ${p.texto ? `<p class="post-text">${escHtml(p.texto)}</p>` : ""}
              ${imgEl}
              <div class="post-footer">
                <span class="post-btn"><i class="ri-heart-line"></i> ${p.totalLikes}</span>
              </div>
            </div>
          </div>`;
      }).join("");
    }

    /* ── Sin resultados ── */
    if (!html) {
      html = `
        <div class="explore-placeholder">
          <i class="ri-search-eye-line" style="font-size:3rem;color:var(--text-3)"></i>
          <p>Sin resultados para "<strong>${escHtml(q)}</strong>"</p>
        </div>`;
    }

    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = `<div class="loading" style="color:var(--red)"><i class="ri-error-warning-line"></i> Error al buscar</div>`;
  }
}

async function toggleFollowSearch(btn, userId) {
  try {
    const res  = await fetch(`${API}/profile/${userId}/follow`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    btn.className = `btn-follow-search ${data.sigues ? "siguiendo" : ""}`;
    btn.innerHTML = data.sigues
      ? `<i class="ri-user-follow-line"></i> Siguiendo`
      : `<i class="ri-user-add-line"></i> Seguir`;
  } catch (_) {}
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function getMarcoStyle(p) {
  if (!p || !p.marco || p.marco === "none") return "";
  if (p.marco === "color")  return `box-shadow:0 0 0 2.5px ${p.marcoColor};`;
  if (p.marco === "neon")   return `box-shadow:0 0 0 2px ${p.marcoColor},0 0 10px ${p.marcoColor};`;
  if (p.marco === "gold")   return `box-shadow:0 0 0 2.5px #ffd43b;`;
  if (p.marco === "dashed") return `outline:2px dashed ${p.marcoColor};outline-offset:2px;`;
  return "";
}

function renderNombreHTML(autor) {
  const p = autor.personalizacion || {};
  const badges = {
    verified: `<i class="ri-verified-badge-fill" style="color:#4dabf7;font-size:.85em;margin-left:2px"></i>`,
    star:     `<i class="ri-star-fill" style="color:#ffd43b;font-size:.85em;margin-left:2px"></i>`,
    fire:     `<i class="ri-fire-fill" style="color:#ff6b35;font-size:.85em;margin-left:2px"></i>`,
    crown:    `<i class="ri-vip-crown-fill" style="color:#ffd43b;font-size:.85em;margin-left:2px"></i>`,
    dev:      `<i class="ri-code-box-fill" style="color:#69db7c;font-size:.85em;margin-left:2px"></i>`,
    vip:      `<span style="background:linear-gradient(90deg,#ffd43b,#ff6b35);color:#050505;font-size:.55em;padding:1px 5px;border-radius:4px;margin-left:3px;font-weight:900;vertical-align:middle">VIP</span>`,
    new:      `<span style="background:var(--green);color:#050505;font-size:.55em;padding:1px 5px;border-radius:4px;margin-left:3px;font-weight:900;vertical-align:middle">NEW</span>`
  };
  const badgeHTML = (p.badge && p.badge !== "none") ? (badges[p.badge] || "") : "";
  const grads = {
    "green-blue": "linear-gradient(90deg,#5cdb6f,#4dabf7)",
    "fire":       "linear-gradient(90deg,#ff6b35,#ffd43b)",
    "purple":     "linear-gradient(90deg,#cc5de8,#845ef7)",
    "sunset":     "linear-gradient(90deg,#ff6b6b,#feca57)",
    "ocean":      "linear-gradient(90deg,#54a0ff,#5f27cd)",
    "custom":     `linear-gradient(90deg,${p.gradColor1||"#5cdb6f"},${p.gradColor2||"#4dabf7"})`
  };
  let style = "font-weight:700;font-size:.92rem;";
  const ef  = p.nombreEfecto || "none";
  if (ef === "gradient") {
    const g = grads[p.nombreGradiente || "green-blue"];
    style = `font-weight:700;font-size:.92rem;background:${g};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
  } else if (ef === "glow")   { style += `color:${p.nombreColor||"var(--green)"};text-shadow:0 0 10px ${p.nombreColor||"var(--green)"};`; }
    else if (ef === "neon")   { style += `color:${p.nombreColor||"#fff"};text-shadow:0 0 7px ${p.nombreColor||"var(--green)"},0 0 20px ${p.nombreColor||"var(--green)"};`; }
    else if (ef === "color")  { style += `color:${p.nombreColor||"inherit"};`; }
    else if (ef === "shadow") { style += `text-shadow:2px 2px 4px rgba(0,0,0,.9);`; }
  return `<strong style="${style}">${escHtml(autor.nombre)}</strong>${badgeHTML}`;
}

function escHtml(s = "") {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function tiempoRelativo(f) {
  const d = (Date.now() - new Date(f)) / 1000;
  if (d < 60)    return "ahora";
  if (d < 3600)  return `${Math.floor(d/60)}m`;
  if (d < 86400) return `${Math.floor(d/3600)}h`;
  return new Date(f).toLocaleDateString("es", { day:"numeric", month:"short" });
}
