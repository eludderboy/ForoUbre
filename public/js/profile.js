/* ════════════════════════
   INIT
════════════════════════ */
const API   = "/api";
const token = localStorage.getItem("fu_token");
const yo    = JSON.parse(localStorage.getItem("fu_usuario") || "null");
if (!token || !yo) window.location.href = "/login.html";

const handle      = new URLSearchParams(location.search).get("handle") || yo.handle;
let perfilData    = null;
let postsCache    = [];
let avatarFile    = null;
let bannerFile    = null;
let bannerTipo    = "gradiente";
let acentoActual  = "#5cdb6f";
let bgAnimId      = null;
const likingPosts = new Set();

/* ── Nav ── */
document.getElementById("navPerfil").href = `profile.html?handle=${yo.handle}`;
document.getElementById("bnPerfil").href  = `profile.html?handle=${yo.handle}`;

/* ── Sidebar user ── */
(function () {
  const el = document.getElementById("sidebarUser");
  if (!el) return;
  const av = yo.avatarTipo === "video"
    ? `<video src="${yo.avatar}" autoplay loop muted playsinline style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0"></video>`
    : `<img src="${yo.avatar}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" alt=""/>`;
  el.innerHTML = `${av}<div style="min-width:0"><strong style="font-size:.87rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(yo.nombre)}</strong><small style="color:var(--text-3)">@${esc(yo.handle)}</small></div>`;
})();

/* ════════════════════════
   HELPERS PERSONALIZACIÓN
════════════════════════ */
function getMarcoStyle(p) {
  if (!p || !p.marco || p.marco === "none") return "";
  if (p.marco === "color")  return `box-shadow:0 0 0 2.5px ${p.marcoColor||"var(--green)"};`;
  if (p.marco === "neon")   return `box-shadow:0 0 0 2px ${p.marcoColor||"var(--green)"},0 0 14px ${p.marcoColor||"var(--green)"};`;
  if (p.marco === "gold")   return `box-shadow:0 0 0 2.5px #ffd43b;`;
  if (p.marco === "dashed") return `outline:2.5px dashed ${p.marcoColor||"var(--green)"};outline-offset:2px;`;
  if (p.marco === "doble")  return `box-shadow:0 0 0 2px ${p.marcoColor||"var(--green)"},0 0 0 5px ${(p.marcoColor||"#5cdb6f")}30;`;
  return "";
}

function renderAvatarEl(autor, size = 44) {
  const p  = autor.personalizacion || {};
  const ms = getMarcoStyle(p);
  const acento = p.acento || "var(--green)";
  const extraClass = [
    p.marco === "rainbow"  ? "avatar-rainbow"  : "",
    p.marco === "animated" ? "avatar-animated" : "",
    p.marco === "glitter"  ? "avatar-glitter"  : "",
    p.aura && p.aura !== "none" ? `aura-${p.aura}` : ""
  ].filter(Boolean).join(" ");
  const style = `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;${ms}--aura-color:${acento};`;
  if (autor.avatarTipo === "video")
    return `<video src="${autor.avatar||""}" autoplay loop muted playsinline class="${extraClass}" style="${style}"></video>`;
  return `<img src="${autor.avatar||"https://api.dicebear.com/7.x/thumbs/svg?seed=x"}" class="${extraClass}" style="${style}" alt="" loading="lazy"/>`;
}

function renderNombreEl(autor) {
  const p = autor.personalizacion || {};
  const badges = {
    verified: `<i class="ri-verified-badge-fill" style="color:#4dabf7;font-size:.85em;margin-left:3px;vertical-align:middle"></i>`,
    star:     `<i class="ri-star-fill" style="color:#ffd43b;font-size:.85em;margin-left:3px;vertical-align:middle"></i>`,
    fire:     `<i class="ri-fire-fill" style="color:#ff6b35;font-size:.85em;margin-left:3px;vertical-align:middle"></i>`,
    crown:    `<i class="ri-vip-crown-fill" style="color:#ffd43b;font-size:.85em;margin-left:3px;vertical-align:middle"></i>`,
    dev:      `<i class="ri-code-box-fill" style="color:#69db7c;font-size:.85em;margin-left:3px;vertical-align:middle"></i>`,
    vip:      `<span style="background:linear-gradient(90deg,#ffd43b,#ff6b35);color:#050505;font-size:.58em;padding:1px 6px;border-radius:4px;margin-left:3px;font-weight:900;vertical-align:middle">VIP</span>`,
    new:      `<span style="background:var(--green);color:#050505;font-size:.58em;padding:1px 6px;border-radius:4px;margin-left:3px;font-weight:900;vertical-align:middle">NEW</span>`
  };
  const badgeHTML = (p.badge && p.badge !== "none") ? (badges[p.badge]||"") : "";
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
    style = `font-weight:700;font-size:.92rem;background:${grads[p.nombreGradiente||"green-blue"]};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
  } else if (ef === "glow")   { style += `color:${p.nombreColor||"var(--green)"};text-shadow:0 0 10px ${p.nombreColor||"var(--green)"};`; }
    else if (ef === "neon")   { style += `color:${p.nombreColor||"#fff"};text-shadow:0 0 7px ${p.nombreColor||"var(--green)"},0 0 21px ${p.nombreColor||"var(--green)"};`; }
    else if (ef === "color")  { style += `color:${p.nombreColor||"inherit"};`; }
    else if (ef === "shadow") { style += `text-shadow:2px 2px 4px rgba(0,0,0,.9);`; }
  return `<strong style="${style}">${esc(autor.nombre)}</strong>${badgeHTML}`;
}

function getBannerStyle(p) {
  const presets = {
    default:  "linear-gradient(135deg,#0d2010,#1a3a14,#0f2808)",
    purple:   "linear-gradient(135deg,#1a0a2e,#2d1b69,#1a0a2e)",
    blue:     "linear-gradient(135deg,#0a1628,#1a3a6b,#0a1628)",
    sunset:   "linear-gradient(135deg,#2a0a00,#8b3a0a,#4a1500)",
    ocean:    "linear-gradient(135deg,#001a2e,#004d6b,#001a2e)",
    fire:     "linear-gradient(135deg,#2a0000,#8b1a00,#4a0a00)",
    neon:     "linear-gradient(135deg,#0a001a,#1a002e,#001a0a)",
    midnight: "linear-gradient(135deg,#000000,#1a1a2e,#000000)",
    rose:     "linear-gradient(135deg,#2a0015,#8b1a4a,#2a0015)",
    gold:     "linear-gradient(135deg,#1a1000,#8b6914,#1a1000)"
  };
  if (!p) return presets.default;
  if (p.bannerTipo === "imagen" && p.bannerImagen) return null; // usa background-image
  if (p.bannerPreset === "custom" && p.bannerColor1)
    return `linear-gradient(135deg,${p.bannerColor1},${p.bannerColor2||p.bannerColor1})`;
  return presets[p.bannerPreset] || presets.default;
}

/* ════════════════════════
   FONDO ANIMADO
════════════════════════ */
function pararBgEfecto() {
  if (bgAnimId) { cancelAnimationFrame(bgAnimId); clearInterval(bgAnimId); bgAnimId = null; }
  document.getElementById("bgCanvas")?.remove();
}

function iniciarBgEfecto(tipo, color) {
  pararBgEfecto();
  if (!tipo || tipo === "none") return;
  const canvas = document.createElement("canvas");
  canvas.id = "bgCanvas";
  canvas.style.opacity = "0.18";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener("resize", resize);

  if (tipo === "matrix") {
    const chars = "01アイウエオカキクケコフォロカナサシ";
    const cols  = () => Math.floor(canvas.width / 18);
    let drops   = Array(cols()).fill(1);
    window.addEventListener("resize", () => { drops = Array(cols()).fill(1); });
    bgAnimId = setInterval(() => {
      ctx.fillStyle = "rgba(0,0,0,.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color; ctx.font = "13px monospace";
      drops.forEach((y, i) => {
        ctx.fillText(chars[Math.floor(Math.random()*chars.length)], i*18, y*18);
        if (y*18 > canvas.height && Math.random() > .975) drops[i] = 0;
        drops[i]++;
      });
    }, 55);
    return;
  }

  if (tipo === "grid") {
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = color + "22"; ctx.lineWidth = 1;
      const sz = 40;
      for (let x = 0; x < canvas.width; x += sz)  { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += sz) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
    };
    draw(); window.addEventListener("resize", draw); return;
  }

  const count = tipo === "rain" ? 130 : 90;
  const pts   = Array.from({length:count}, () => ({
    x:  Math.random() * window.innerWidth,
    y:  Math.random() * window.innerHeight,
    r:  tipo === "stars" ? Math.random()*1.5+.5 : Math.random()*2.5+1,
    dx: tipo === "rain"  ? 0 : (Math.random()-.5)*.5,
    dy: tipo === "rain"  ? Math.random()*2+.8 : (Math.random()-.5)*.5,
    o:  Math.random()*.7+.2
  }));

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach(p => {
      ctx.beginPath();
      if (tipo === "rain") {
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+.8, p.y+14);
        ctx.strokeStyle = color + Math.round(p.o*220).toString(16).padStart(2,"0");
        ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = color + Math.round(p.o*220).toString(16).padStart(2,"0");
        ctx.fill();
      }
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });
    bgAnimId = requestAnimationFrame(draw);
  };
  draw();
}

/* ════════════════════════
   CARGAR PERFIL
════════════════════════ */
async function cargarPerfil() {
  document.getElementById("profileContent").innerHTML = `<div class="loading"><i class="ri-loader-4-line spin"></i> Cargando...</div>`;
  document.getElementById("profileFeed").innerHTML    = "";
  document.getElementById("profileTabs").classList.add("hidden");
  pararBgEfecto();
  try {
    const res  = await fetch(`${API}/profile/${handle}`, { headers:{ Authorization:`Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje);
    perfilData = data; postsCache = data.posts;
    renderPerfil(data.usuario);
    document.getElementById("headerNombre").textContent = data.usuario.nombre;
    document.title = `${data.usuario.nombre} — Foro Ubre`;
    document.getElementById("profileTabs").classList.remove("hidden");
    setupProfileTabs();
    renderPostsTab(postsCache);
  } catch (err) {
    document.getElementById("profileContent").innerHTML = `
      <div class="empty-state">
        <i class="ri-user-unfollow-line" style="font-size:3rem;color:var(--text-3)"></i>
        <p>${esc(err.message)}</p>
      </div>`;
  }
}

/* ════════════════════════
   RENDER PERFIL HEADER
════════════════════════ */
function renderPerfil(u) {
  const p      = u.personalizacion || {};
  const acento = p.acento || "#5cdb6f";
  const marcoStyle = getMarcoStyle(p);
  const extraClass = [
    p.marco === "rainbow"  ? "avatar-rainbow"  : "",
    p.marco === "animated" ? "avatar-animated" : "",
    p.marco === "glitter"  ? "avatar-glitter"  : "",
    p.aura && p.aura !== "none" ? `aura-${p.aura}` : ""
  ].filter(Boolean).join(" ");

  const avatarEl = u.avatarTipo === "video"
    ? `<video src="${u.avatar}" autoplay loop muted playsinline class="${extraClass}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;--aura-color:${acento}"></video>`
    : `<img src="${u.avatar}" alt="" class="${extraClass}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;--aura-color:${acento}"/>`;

  // Banner
  const bannerStyle = getBannerStyle(p);
  const bannerAttr  = bannerStyle
    ? `style="background:${bannerStyle}"`
    : `style="background-image:url('${p.bannerImagen}');background-size:cover;background-position:center"`;

  const stickerEl = p.bannerSticker
    ? `<div class="banner-sticker">${p.bannerSticker}</div>`
    : "";

  // Card efecto
  const cardClass = p.cardEfecto === "glass"        ? "profile-card-glass"
                  : p.cardEfecto === "neon-border"  ? "profile-card-neon-border"
                  : p.cardEfecto === "shadow-color" ? "profile-card-shadow"
                  : "";

  document.getElementById("profileContent").innerHTML = `
    <div class="profile-banner" ${bannerAttr}>${stickerEl}</div>
    <div class="profile-info ${cardClass}" style="--perfil-acento:${acento}">
      <div class="profile-avatar-wrap" style="${marcoStyle}">${avatarEl}</div>
      <div class="profile-actions">
        ${u.esTuPerfil ? `
          <button class="btn-edit-profile" onclick="abrirModalEditar()">
            <i class="ri-edit-box-line"></i> Editar perfil
          </button>` : `
          <button class="btn-mensaje" onclick="iniciarChat('${u._id}')">
            <i class="ri-message-3-line"></i> Mensaje
          </button>
          <button class="btn-follow ${u.sigues?"siguiendo":""}" id="btnFollow" onclick="toggleFollow('${u._id}')">
            ${u.sigues?`<i class="ri-user-follow-line"></i> Siguiendo`:`<i class="ri-user-add-line"></i> Seguir`}
          </button>`}
      </div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:4px;flex-wrap:wrap">
        ${renderNombreEl(u)}
      </div>
      <p class="profile-handle">@${esc(u.handle)}</p>
      ${u.bio  ? `<p class="profile-bio">${esc(u.bio)}</p>` : ""}
      ${u.link ? `<a href="${esc(u.link)}" target="_blank" rel="noopener" class="profile-link" style="color:${acento}"><i class="ri-link"></i>${esc(u.link.replace(/^https?:\/\//,""))}</a>` : ""}
      <div class="profile-stats">
        <span><strong>${perfilData.totalPosts}</strong> Posts</span>
        <span><strong id="statSeguidores">${u.totalSeguidores}</strong> Seguidores</span>
        <span><strong>${u.totalSiguiendo}</strong> Siguiendo</span>
      </div>
    </div>`;

  iniciarBgEfecto(p.bgEfecto, acento);
}

/* ════════════════════════
   TABS
════════════════════════ */
function setupProfileTabs() {
  document.querySelectorAll("#profileTabs .tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#profileTabs .tab-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      cargarTabPerfil(this.dataset.tab);
    });
  });
}

async function cargarTabPerfil(tab) {
  const feed = document.getElementById("profileFeed");
  if (tab === "posts") { renderPostsTab(postsCache); return; }
  feed.innerHTML = `<div class="loading"><i class="ri-loader-4-line spin"></i> Cargando...</div>`;
  try {
    const ruta = tab === "videos" ? `${API}/videos/user/${handle}` : `${API}/videos/compartidos/${handle}`;
    const res  = await fetch(ruta, { headers:{ Authorization:`Bearer ${token}` } });
    const data = await res.json();
    feed.innerHTML = "";
    if (!data.length) {
      const icon = tab === "videos" ? "ri-video-line" : "ri-share-forward-line";
      const msg  = tab === "videos" ? "Sin videos todavía" : "Sin videos compartidos";
      feed.innerHTML = `
        <div class="empty-state">
          <i class="${icon}" style="font-size:3rem;color:var(--text-3)"></i>
          <p>${msg}</p>
          ${tab === "videos" && handle === yo.handle ? `<a href="videos.html" style="display:inline-flex;align-items:center;gap:6px;margin-top:12px;background:var(--green);color:#050505;border-radius:999px;padding:10px 20px;font-weight:800;text-decoration:none;font-size:.88rem"><i class="ri-video-add-line"></i> Subir primer video</a>` : ""}
        </div>`;
    } else {
      renderVideoGrid(data, feed);
    }
  } catch (err) {
    feed.innerHTML = `<div class="empty-state" style="color:var(--red)">${esc(err.message)}</div>`;
  }
}

function renderPostsTab(posts) {
  const feed = document.getElementById("profileFeed");
  feed.innerHTML = "";
  if (!posts.length) {
    feed.innerHTML = `<div class="empty-state"><i class="ri-inbox-2-line" style="font-size:3rem;color:var(--text-3)"></i><p>Sin posts todavía</p></div>`;
    return;
  }
  posts.forEach(p => renderPost(p));
}

/* ════════════════════════
   VIDEO GRID
════════════════════════ */
function renderVideoGrid(videos, container) {
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:3px;";
  videos.forEach(v => {
    const el = document.createElement("div");
    el.style.cssText = "position:relative;aspect-ratio:9/16;background:#0a0a0a;overflow:hidden;cursor:pointer;border-radius:6px;";
    el.innerHTML = `
      <video src="${v.url}" style="width:100%;height:100%;object-fit:cover" preload="metadata" muted playsinline></video>
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.55) 0%,transparent 50%);pointer-events:none"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:6px 8px;display:flex;align-items:center;gap:8px">
        <span style="font-size:.72rem;color:#fff;font-weight:700;display:flex;align-items:center;gap:3px"><i class="ri-heart-fill" style="color:#ff4466"></i>${formatNum(v.totalLikes)}</span>
        <span style="font-size:.72rem;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:3px"><i class="ri-eye-line"></i>${formatNum(v.reproducciones)}</span>
      </div>`;
    el.addEventListener("mouseenter", () => el.querySelector("video")?.play().catch(()=>{}));
    el.addEventListener("mouseleave", () => { const vid = el.querySelector("video"); if (vid){vid.pause();vid.currentTime=0;} });
    el.addEventListener("click", () => window.location.href = "videos.html");
    grid.appendChild(el);
  });
  container.appendChild(grid);
}

/* ════════════════════════
   RENDER POST
════════════════════════ */
function renderPost(post) {
  const feed  = document.getElementById("profileFeed");
  const esMio = post.autor._id === yo._id;
  const el    = document.createElement("div");
  el.className = "post-card"; el.id = `post-${post._id}`;
  el.innerHTML = `
    <div style="flex-shrink:0">${renderAvatarEl(post.autor, 44)}</div>
    <div class="post-body">
      <div class="post-user">
        <span style="display:flex;align-items:center;gap:3px">${renderNombreEl(post.autor)}</span>
        <span class="handle">@${esc(post.autor.handle)}</span>
        <span class="post-time">· ${tiempoRelativo(post.createdAt)}</span>
      </div>
      ${post.texto  ? `<p class="post-text">${esc(post.texto)}</p>` : ""}
      ${post.imagen ? `<img src="${post.imagen}" class="post-img" alt="" loading="lazy" onclick="verImagen('${post.imagen}')"/>` : ""}
      <div class="post-footer">
        <button class="post-btn ${post.yaLike?"liked":""}" id="like-${post._id}" onclick="toggleLike('${post._id}',this)">
          <i class="${post.yaLike?"ri-heart-fill":"ri-heart-line"}"></i><span>${post.totalLikes}</span>
        </button>
        <button class="post-btn" onclick="toggleComentarios('${post._id}',this)">
          <i class="ri-chat-1-line"></i><span id="commentCount-${post._id}">${post.totalComments||0}</span>
        </button>
        <button class="post-btn"><i class="ri-repeat-2-line"></i></button>
        ${!esMio
          ? `<button class="post-btn" onclick="iniciarChat('${post.autor._id}')" style="margin-left:auto"><i class="ri-message-3-line"></i></button>`
          : `<button class="post-btn delete" onclick="eliminarPost('${post._id}')" style="margin-left:auto"><i class="ri-delete-bin-6-line"></i></button>`}
      </div>
      <div class="comments-section hidden" id="comments-${post._id}"></div>
    </div>`;
  feed.appendChild(el);
}

/* ════════════════════════
   ACCIONES
════════════════════════ */
async function toggleFollow(userId) {
  const btn = document.getElementById("btnFollow");
  btn.disabled = true;
  try {
    const res  = await fetch(`${API}/profile/${userId}/follow`, { method:"POST", headers:{Authorization:`Bearer ${token}`} });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje);
    btn.className = `btn-follow ${data.sigues?"siguiendo":""}`;
    btn.innerHTML = data.sigues ? `<i class="ri-user-follow-line"></i> Siguiendo` : `<i class="ri-user-add-line"></i> Seguir`;
    const st = document.getElementById("statSeguidores");
    if (st) st.textContent = data.totalSeguidores;
  } catch (e) { alert(e.message); }
  finally { btn.disabled = false; }
}

async function iniciarChat(userId) {
  try {
    const res  = await fetch(`${API}/messages`, { method:"POST", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body:JSON.stringify({usuarioId:userId}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje);
    window.location.href = `messages.html?conv=${data._id}`;
  } catch (e) { alert(e.message); }
}

/* ── LIKES — optimista + anti doble click ── */
async function toggleLike(postId, btn) {
  if (likingPosts.has(postId)) return;
  likingPosts.add(postId);
  const isLiked = btn.classList.contains("liked");
  const countEl = btn.querySelector("span");
  const prev    = parseInt(countEl.textContent) || 0;
  btn.classList.toggle("liked", !isLiked);
  btn.querySelector("i").className = !isLiked ? "ri-heart-fill" : "ri-heart-line";
  countEl.textContent = !isLiked ? prev + 1 : Math.max(0, prev - 1);
  try {
    const res  = await fetch(`${API}/posts/${postId}/like`, { method:"POST", headers:{Authorization:`Bearer ${token}`} });
    const data = await res.json();
    btn.classList.toggle("liked", data.yaLike);
    btn.querySelector("i").className = data.yaLike ? "ri-heart-fill" : "ri-heart-line";
    countEl.textContent = data.totalLikes;
  } catch (_) {
    btn.classList.toggle("liked", isLiked);
    btn.querySelector("i").className = isLiked ? "ri-heart-fill" : "ri-heart-line";
    countEl.textContent = prev;
  } finally { likingPosts.delete(postId); }
}

async function eliminarPost(postId) {
  if (!confirm("¿Eliminar este post?")) return;
  try {
    await fetch(`${API}/posts/${postId}`, { method:"DELETE", headers:{Authorization:`Bearer ${token}`} });
    const el = document.getElementById(`post-${postId}`);
    if (el) { el.style.transition="all .3s"; el.style.opacity="0"; setTimeout(()=>el.remove(),300); }
    postsCache = postsCache.filter(p => p._id !== postId);
  } catch (_) {}
}

/* ════════════════════════
   COMENTARIOS
════════════════════════ */
async function toggleComentarios(postId) {
  const section = document.getElementById(`comments-${postId}`);
  if (!section) return;
  if (!section.classList.contains("hidden")) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  section.innerHTML = `<div class="loading" style="padding:10px"><i class="ri-loader-4-line spin"></i></div>`;
  try {
    const res  = await fetch(`${API}/posts/${postId}/comments`, { headers:{Authorization:`Bearer ${token}`} });
    const data = await res.json();
    section.innerHTML = `
      <div id="commentsList-${postId}">
        ${!data.length ? `<p class="no-comments"><i class="ri-chat-3-line"></i> Sin comentarios aún</p>` : data.map(c=>renderComentarioHTML(c)).join("")}
      </div>
      <div class="comment-input-row">
        ${renderAvatarEl(yo, 32)}
        <div class="comment-input-wrap">
          <input type="text" class="comment-input" id="commentInput-${postId}" placeholder="Escribe un comentario..." maxlength="280"
                 onkeydown="if(event.key==='Enter')agregarComentario('${postId}')"/>
          <button class="btn-send-comment" onclick="agregarComentario('${postId}')"><i class="ri-send-plane-fill"></i></button>
        </div>
      </div>`;
  } catch (_) {
    section.innerHTML = `<p style="color:var(--red);padding:10px;font-size:.84rem">Error al cargar</p>`;
  }
}

function renderComentarioHTML(c) {
  return `
    <div class="comment-item" id="comment-${c._id}">
      <div style="flex-shrink:0">${renderAvatarEl(c.autor, 32)}</div>
      <div class="comment-body">
        <div class="comment-header">
          ${renderNombreEl(c.autor)}
          <span class="handle" style="font-size:.73rem">@${esc(c.autor.handle)}</span>
          <span class="post-time">· ${tiempoRelativo(c.createdAt)}</span>
        </div>
        <p class="comment-text">${esc(c.texto)}</p>
        <button class="post-btn ${c.yaLike?"liked":""}" style="padding:2px 6px;font-size:.73rem" onclick="likeComentario('${c._id}',this)">
          <i class="${c.yaLike?"ri-heart-fill":"ri-heart-line"}"></i><span>${c.totalLikes}</span>
        </button>
      </div>
    </div>`;
}

async function agregarComentario(postId) {
  const inp   = document.getElementById(`commentInput-${postId}`);
  const texto = inp?.value.trim();
  if (!texto) return;
  inp.value = ""; inp.disabled = true;
  try {
    const res  = await fetch(`${API}/posts/${postId}/comments`, { method:"POST", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body:JSON.stringify({texto}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje);
    const list = document.getElementById(`commentsList-${postId}`);
    if (list) { list.querySelector(".no-comments")?.remove(); list.insertAdjacentHTML("beforeend", renderComentarioHTML(data)); }
    const cnt = document.getElementById(`commentCount-${postId}`);
    if (cnt) cnt.textContent = parseInt(cnt.textContent||"0") + 1;
  } catch (e) { alert(e.message); }
  finally { if (inp) { inp.disabled = false; inp.focus(); } }
}

async function likeComentario(id, btn) {
  try {
    const res  = await fetch(`${API}/posts/comments/${id}/like`, { method:"POST", headers:{Authorization:`Bearer ${token}`} });
    const data = await res.json();
    btn.classList.toggle("liked", data.yaLike);
    btn.innerHTML = `<i class="${data.yaLike?"ri-heart-fill":"ri-heart-line"}"></i><span>${data.totalLikes}</span>`;
  } catch (_) {}
}

/* ════════════════════════
   MODAL EDITAR — HELPERS
════════════════════════ */
function setBannerTipo(tipo) {
  bannerTipo = tipo;
  document.getElementById("btnBannerGradiente").classList.toggle("active", tipo === "gradiente");
  document.getElementById("btnBannerImagen").classList.toggle("active",    tipo === "imagen");
  document.getElementById("bannerGradienteSection").classList.toggle("hidden", tipo !== "gradiente");
  document.getElementById("bannerImagenSection").classList.toggle("hidden",    tipo !== "imagen");
}

function quitarBannerImg() {
  bannerFile = null;
  document.getElementById("bannerFileInput").value = "";
  document.getElementById("bannerFileInfo").classList.add("hidden");
  actualizarBannerPreview();
}

function seleccionarAcento(color, fromPreset = true) {
  acentoActual = color;
  document.getElementById("acentoColorPicker").value = color;
  if (fromPreset) {
    document.querySelectorAll(".acento-btn").forEach(b => b.classList.toggle("active", b.dataset.acento === color));
  } else {
    document.querySelectorAll(".acento-btn").forEach(b => b.classList.remove("active"));
  }
}

function actualizarBannerPreview() {
  const prev = document.getElementById("bannerPreview");
  if (!prev) return;
  if (bannerTipo === "imagen" && bannerFile) {
    prev.style.background = "none";
    prev.style.backgroundImage = `url(${URL.createObjectURL(bannerFile)})`;
    prev.style.backgroundSize     = "cover";
    prev.style.backgroundPosition = "center";
  } else {
    const preset = document.querySelector("#bannerOptions .option-btn.active")?.dataset.banner || "default";
    const style  = getBannerStyle({ bannerPreset: preset, bannerColor1: document.getElementById("bannerColor1")?.value, bannerColor2: document.getElementById("bannerColor2")?.value });
    prev.style.background = style || ""; prev.style.backgroundImage = "";
  }
  const sticker = document.querySelector("#stickerOptions .sticker-btn.active")?.dataset.sticker || "";
  document.getElementById("bannerStickerPreview").textContent = sticker;
}

function actualizarPreviewNombre() {
  const ef    = document.querySelector("#nombreOptions .option-btn.active")?.dataset.efecto || "none";
  const grad  = document.querySelector("#gradOptions .option-btn.active")?.dataset.grad     || "green-blue";
  const color = document.getElementById("nombreColorPicker")?.value || "#5cdb6f";
  const gc1   = document.getElementById("gradColor1")?.value || "#5cdb6f";
  const gc2   = document.getElementById("gradColor2")?.value || "#4dabf7";
  const nombre = document.getElementById("editNombre")?.value || yo.nombre || "Tu Nombre";
  const prev   = document.getElementById("previewNombre");
  if (!prev) return;
  const grads  = {
    "green-blue": "linear-gradient(90deg,#5cdb6f,#4dabf7)",
    "fire":       "linear-gradient(90deg,#ff6b35,#ffd43b)",
    "purple":     "linear-gradient(90deg,#cc5de8,#845ef7)",
    "sunset":     "linear-gradient(90deg,#ff6b6b,#feca57)",
    "ocean":      "linear-gradient(90deg,#54a0ff,#5f27cd)",
    "custom":     `linear-gradient(90deg,${gc1},${gc2})`
  };
  let css = "font-weight:800;font-size:1.15rem;display:inline-block;transition:all .2s;";
  if      (ef === "gradient") css += `background:${grads[grad]};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
  else if (ef === "glow")     css += `color:${color};text-shadow:0 0 10px ${color};`;
  else if (ef === "neon")     css += `color:${color};text-shadow:0 0 7px ${color},0 0 21px ${color};`;
  else if (ef === "color")    css += `color:${color};`;
  else if (ef === "shadow")   css += `text-shadow:2px 2px 4px rgba(0,0,0,.9);color:var(--text);`;
  else                        css += `color:var(--text);`;
  prev.style.cssText = css;
  prev.textContent   = nombre || "Tu Nombre";
}

/* ════════════════════════
   ABRIR / CERRAR MODAL
════════════════════════ */
function abrirModalEditar() {
  const u = perfilData.usuario;
  const p = u.personalizacion || {};

  /* Info */
  document.getElementById("editNombre").value        = u.nombre;
  document.getElementById("editBio").value           = u.bio   || "";
  document.getElementById("editLink").value          = u.link  || "";
  document.getElementById("cEditNombre").textContent = 50 - u.nombre.length;
  document.getElementById("cEditBio").textContent    = 160 - (u.bio?.length||0);

  /* Avatar preview */
  const img  = document.getElementById("editAvatarImg");
  const vid  = document.getElementById("editAvatarVid");
  const hold = document.getElementById("editAvatarHolder");
  hold.classList.add("hidden");
  if (u.avatarTipo === "video") { img.classList.add("hidden"); vid.src = u.avatar; vid.classList.remove("hidden"); }
  else                          { vid.classList.add("hidden"); img.src = u.avatar; img.classList.remove("hidden"); }

  /* Banner */
  bannerFile = null;
  setBannerTipo(p.bannerTipo || "gradiente");
  document.querySelectorAll("#bannerOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.banner === (p.bannerPreset||"default")));
  document.getElementById("bannerCustomRow").classList.toggle("hidden", p.bannerPreset !== "custom");
  if (p.bannerColor1) document.getElementById("bannerColor1").value = p.bannerColor1;
  if (p.bannerColor2) document.getElementById("bannerColor2").value = p.bannerColor2;
  document.getElementById("bannerFileInfo")?.classList.add("hidden");

  /* Sticker */
  document.querySelectorAll("#stickerOptions .sticker-btn").forEach(b => b.classList.toggle("active", b.dataset.sticker === (p.bannerSticker||"")));

  /* Marco */
  document.querySelectorAll("#marcoOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.marco === (p.marco||"none")));
  document.getElementById("marcoColorPicker").value = p.marcoColor || "#5cdb6f";

  /* Aura */
  document.querySelectorAll("#auraOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.aura === (p.aura||"none")));

  /* Nombre */
  document.querySelectorAll("#nombreOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.efecto === (p.nombreEfecto||"none")));
  const ef = p.nombreEfecto || "none";
  document.getElementById("gradienteRow").style.display = ef === "gradient" ? "block" : "none";
  document.getElementById("nombreColorRow").classList.toggle("hidden", !["glow","neon","color"].includes(ef));
  document.querySelectorAll("#gradOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.grad === (p.nombreGradiente||"green-blue")));
  document.getElementById("gradCustomRow").classList.toggle("hidden", p.nombreGradiente !== "custom");
  if (p.nombreColor) document.getElementById("nombreColorPicker").value = p.nombreColor;
  if (p.gradColor1)  document.getElementById("gradColor1").value        = p.gradColor1;
  if (p.gradColor2)  document.getElementById("gradColor2").value        = p.gradColor2;

  /* Efectos */
  document.querySelectorAll("#bgEfectoOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.bgefecto === (p.bgEfecto||"none")));
  document.querySelectorAll("#cardEfectoOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.cardefecto === (p.cardEfecto||"none")));
  seleccionarAcento(p.acento || "#5cdb6f");

  /* Badge */
  document.querySelectorAll(".badge-option").forEach(b => b.classList.toggle("active", b.dataset.badge === (p.badge||"none")));

  /* Reset tab */
  document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".modal-tab-panel").forEach(t => t.classList.remove("active"));
  document.querySelector(".modal-tab-btn[data-tab='info']").classList.add("active");
  document.getElementById("tabInfo").classList.add("active");

  actualizarBannerPreview();
  actualizarPreviewNombre();
  document.getElementById("editError")?.classList.add("hidden");
  document.getElementById("modalEditarPerfil").classList.remove("hidden");
}

function cerrarModalEditar() {
  document.getElementById("modalEditarPerfil").classList.add("hidden");
  avatarFile = null; bannerFile = null;
}

/* ════════════════════════
   EVENTOS DEL MODAL
════════════════════════ */
/* Tabs */
document.querySelectorAll(".modal-tab-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".modal-tab-panel").forEach(t => t.classList.remove("active"));
    this.classList.add("active");
    const id = "tab" + this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1);
    document.getElementById(id)?.classList.add("active");
  });
});

/* Banner presets */
document.querySelectorAll("#bannerOptions .option-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#bannerOptions .option-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    const row = document.getElementById("bannerCustomRow");
    if (this.dataset.banner === "custom") { row.classList.remove("hidden"); row.style.display = "flex"; }
    else row.classList.add("hidden");
    actualizarBannerPreview();
  });
});
document.getElementById("bannerColor1")?.addEventListener("input", actualizarBannerPreview);
document.getElementById("bannerColor2")?.addEventListener("input", actualizarBannerPreview);

/* Banner file */
document.getElementById("bannerFileInput")?.addEventListener("change", function () {
  const file = this.files[0]; if (!file) return;
  if (file.size > 8*1024*1024) { alert("Máximo 8MB"); this.value=""; return; }
  bannerFile = file;
  document.getElementById("bannerFileName").textContent = file.name;
  document.getElementById("bannerFileInfo").classList.remove("hidden");
  setBannerTipo("imagen");
  actualizarBannerPreview();
});

/* Stickers */
document.querySelectorAll("#stickerOptions .sticker-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#stickerOptions .sticker-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    actualizarBannerPreview();
  });
});

/* Marco */
document.querySelectorAll("#marcoOptions .option-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#marcoOptions .option-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
  });
});

/* Aura */
document.querySelectorAll("#auraOptions .option-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#auraOptions .option-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
  });
});

/* Nombre efecto */
document.querySelectorAll("#nombreOptions .option-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#nombreOptions .option-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    const ef = this.dataset.efecto;
    document.getElementById("gradienteRow").style.display = ef === "gradient" ? "block" : "none";
    document.getElementById("nombreColorRow").classList.toggle("hidden", !["glow","neon","color"].includes(ef));
    actualizarPreviewNombre();
  });
});

/* Gradiente */
document.querySelectorAll("#gradOptions .option-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#gradOptions .option-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    const row = document.getElementById("gradCustomRow");
    if (this.dataset.grad === "custom") { row.classList.remove("hidden"); row.style.display = "flex"; }
    else row.classList.add("hidden");
    actualizarPreviewNombre();
  });
});

/* Efectos bg */
document.querySelectorAll("#bgEfectoOptions .option-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#bgEfectoOptions .option-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
  });
});

/* Card efecto */
document.querySelectorAll("#cardEfectoOptions .option-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll("#cardEfectoOptions .option-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
  });
});

/* Acento presets */
document.querySelectorAll(".acento-btn").forEach(btn => {
  btn.addEventListener("click", function () { seleccionarAcento(this.dataset.acento, true); });
});

/* Badge */
document.querySelectorAll(".badge-option").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".badge-option").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
  });
});

/* Inputs que actualizan preview */
document.getElementById("editNombre")?.addEventListener("input", function () {
  document.getElementById("cEditNombre").textContent = 50 - this.value.length;
  actualizarPreviewNombre();
});
document.getElementById("editBio")?.addEventListener("input", function () {
  document.getElementById("cEditBio").textContent = 160 - this.value.length;
});
document.getElementById("nombreColorPicker")?.addEventListener("input", actualizarPreviewNombre);
document.getElementById("gradColor1")?.addEventListener("input", actualizarPreviewNombre);
document.getElementById("gradColor2")?.addEventListener("input", actualizarPreviewNombre);

/* Avatar file */
document.getElementById("editAvatarInput")?.addEventListener("change", function () {
  const file = this.files[0]; if (!file) return;
  if (file.size > 3*1024*1024) { alert("Máximo 3MB"); this.value=""; return; }
  avatarFile = file;
  const url  = URL.createObjectURL(file);
  const img  = document.getElementById("editAvatarImg");
  const vid  = document.getElementById("editAvatarVid");
  document.getElementById("editAvatarHolder").classList.add("hidden");
  if (file.type.startsWith("video/")) { img.classList.add("hidden"); vid.src=url; vid.classList.remove("hidden"); }
  else                                { vid.classList.add("hidden"); img.src=url; img.classList.remove("hidden"); }
});

/* ════════════════════════
   GUARDAR
════════════════════════ */
/* Info */
document.getElementById("btnGuardarInfo")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnGuardarInfo");
  const errBox  = document.getElementById("editError");
  const errText = document.getElementById("editErrorText");
  errBox.classList.add("hidden");
  btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Guardando...'; btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append("nombre", document.getElementById("editNombre").value.trim());
    fd.append("bio",    document.getElementById("editBio").value);
    fd.append("link",   document.getElementById("editLink").value.trim());
    if (avatarFile) fd.append("avatar", avatarFile);
    const res  = await fetch(`${API}/auth/perfil`, { method:"PUT", headers:{Authorization:`Bearer ${token}`}, body:fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje);
    localStorage.setItem("fu_usuario", JSON.stringify({...yo,...data.usuario}));
    cerrarModalEditar(); cargarPerfil();
  } catch (e) { errText.textContent = e.message; errBox.classList.remove("hidden"); }
  finally { btn.innerHTML = '<i class="ri-save-line"></i> Guardar info'; btn.disabled = false; }
});

/* Banner */
document.getElementById("btnGuardarBanner")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnGuardarBanner");
  btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Guardando...'; btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append("bannerTipo",    bannerTipo);
    fd.append("bannerPreset",  document.querySelector("#bannerOptions .option-btn.active")?.dataset.banner || "default");
    fd.append("bannerColor1",  document.getElementById("bannerColor1")?.value || "#0d2010");
    fd.append("bannerColor2",  document.getElementById("bannerColor2")?.value || "#1a3a14");
    fd.append("bannerSticker", document.querySelector("#stickerOptions .sticker-btn.active")?.dataset.sticker || "");
    if (bannerFile) fd.append("bannerImagen", bannerFile);
    const res = await fetch(`${API}/auth/personalizacion`, { method:"PUT", headers:{Authorization:`Bearer ${token}`}, body:fd });
    if (!res.ok) throw new Error("Error al guardar");
    const d = await res.json();
    const s = JSON.parse(localStorage.getItem("fu_usuario")||"{}");
    s.personalizacion = {...(s.personalizacion||{}), ...(d.personalizacion||{})};
    localStorage.setItem("fu_usuario", JSON.stringify(s));
    cerrarModalEditar(); cargarPerfil();
  } catch (e) { alert(e.message); }
  finally { btn.innerHTML = '<i class="ri-save-line"></i> Guardar banner'; btn.disabled = false; }
});

/* Avatar + Marco + Aura */
document.getElementById("btnGuardarAvatar")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnGuardarAvatar");
  btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Guardando...'; btn.disabled = true;
  const body = {
    marco:      document.querySelector("#marcoOptions .option-btn.active")?.dataset.marco || "none",
    marcoColor: document.getElementById("marcoColorPicker")?.value || "#5cdb6f",
    aura:       document.querySelector("#auraOptions .option-btn.active")?.dataset.aura   || "none"
  };
  try {
    const res = await fetch(`${API}/auth/personalizacion`, { method:"PUT", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body:JSON.stringify(body) });
    if (!res.ok) throw new Error("Error al guardar");
    const s = JSON.parse(localStorage.getItem("fu_usuario")||"{}");
    s.personalizacion = {...(s.personalizacion||{}), ...body};
    localStorage.setItem("fu_usuario", JSON.stringify(s));
    cerrarModalEditar(); cargarPerfil();
  } catch (e) { alert(e.message); }
  finally { btn.innerHTML = '<i class="ri-save-line"></i> Guardar avatar'; btn.disabled = false; }
});

/* Nombre */
document.getElementById("btnGuardarNombre")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnGuardarNombre");
  btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Guardando...'; btn.disabled = true;
  const body = {
    nombreEfecto:    document.querySelector("#nombreOptions .option-btn.active")?.dataset.efecto || "none",
    nombreGradiente: document.querySelector("#gradOptions .option-btn.active")?.dataset.grad     || "green-blue",
    nombreColor:     document.getElementById("nombreColorPicker")?.value || "#f0f0f0",
    gradColor1:      document.getElementById("gradColor1")?.value        || "#5cdb6f",
    gradColor2:      document.getElementById("gradColor2")?.value        || "#4dabf7"
  };
  try {
    const res = await fetch(`${API}/auth/personalizacion`, { method:"PUT", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body:JSON.stringify(body) });
    if (!res.ok) throw new Error("Error al guardar");
    const s = JSON.parse(localStorage.getItem("fu_usuario")||"{}");
    s.personalizacion = {...(s.personalizacion||{}), ...body};
    localStorage.setItem("fu_usuario", JSON.stringify(s));
    cerrarModalEditar(); cargarPerfil();
  } catch (e) { alert(e.message); }
  finally { btn.innerHTML = '<i class="ri-save-line"></i> Guardar nombre'; btn.disabled = false; }
});

/* Efectos */
document.getElementById("btnGuardarEfectos")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnGuardarEfectos");
  btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Guardando...'; btn.disabled = true;
  const body = {
    bgEfecto:   document.querySelector("#bgEfectoOptions .option-btn.active")?.dataset.bgefecto     || "none",
    cardEfecto: document.querySelector("#cardEfectoOptions .option-btn.active")?.dataset.cardefecto || "none",
    acento:     acentoActual
  };
  try {
    const res = await fetch(`${API}/auth/personalizacion`, { method:"PUT", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body:JSON.stringify(body) });
    if (!res.ok) throw new Error("Error al guardar");
    const s = JSON.parse(localStorage.getItem("fu_usuario")||"{}");
    s.personalizacion = {...(s.personalizacion||{}), ...body};
    localStorage.setItem("fu_usuario", JSON.stringify(s));
    cerrarModalEditar(); cargarPerfil();
  } catch (e) { alert(e.message); }
  finally { btn.innerHTML = '<i class="ri-save-line"></i> Guardar efectos'; btn.disabled = false; }
});

/* Badge */
document.getElementById("btnGuardarBadge")?.addEventListener("click", async () => {
  const btn   = document.getElementById("btnGuardarBadge");
  const badge = document.querySelector(".badge-option.active")?.dataset.badge || "none";
  btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Guardando...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/auth/personalizacion`, { method:"PUT", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body:JSON.stringify({badge}) });
    if (!res.ok) throw new Error("Error al guardar");
    const s = JSON.parse(localStorage.getItem("fu_usuario")||"{}");
    s.personalizacion = {...(s.personalizacion||{}), badge};
    localStorage.setItem("fu_usuario", JSON.stringify(s));
    cerrarModalEditar(); cargarPerfil();
  } catch (e) { alert(e.message); }
  finally { btn.innerHTML = '<i class="ri-save-line"></i> Guardar badge'; btn.disabled = false; }
});

/* ════════════════════════
   MODAL IMAGEN
════════════════════════ */
function verImagen(src) {
  document.getElementById("modalImgSrc").src = src;
  document.getElementById("modalImg").classList.add("active");
}
function cerrarModalImg() {
  document.getElementById("modalImg").classList.remove("active");
}

/* ════════════════════════
   UTILS
════════════════════════ */
function esc(s = "") {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function tiempoRelativo(f) {
  const d = (Date.now() - new Date(f)) / 1000;
  if (d < 60)     return "ahora";
  if (d < 3600)   return `${Math.floor(d/60)}m`;
  if (d < 86400)  return `${Math.floor(d/3600)}h`;
  if (d < 604800) return `${Math.floor(d/86400)}d`;
  return new Date(f).toLocaleDateString("es",{day:"numeric",month:"short"});
}
function formatNum(n = 0) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (n >= 1000)    return (n/1000).toFixed(1)+"K";
  return String(n);
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { cerrarModalEditar(); cerrarModalImg(); }
});

/* ── INIT ── */
cargarPerfil();
