/* ═══════════════════════════════════════════════════
   GLOBALS
═══════════════════════════════════════════════════ */
const API   = "/api";
const token = localStorage.getItem("fu_token");
const yo    = JSON.parse(localStorage.getItem("fu_usuario") || "null");
if (!token || !yo) location.href = "/login.html";

const _navP = document.getElementById("navPerfil");
const _bnP  = document.getElementById("bnPerfil");
if (_navP) _navP.href = `profile.html?handle=${yo.handle}`;
if (_bnP)  _bnP.href  = `profile.html?handle=${yo.handle}`;

/* ── Sidebar user ── */
(function(){
  const el = document.getElementById("sidebarUser");
  const av = yo.avatarTipo === "video"
    ? `<video src="${yo.avatar}" autoplay loop muted playsinline style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0"></video>`
    : `<img src="${yo.avatar||defAv(yo.nombre)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" alt=""/>`;
  el.innerHTML = `${av}<div><strong>${esc(yo.nombre)}</strong><small>@${esc(yo.handle)}</small></div>`;
})();

/* ── Composer avatar ── */
(function(){
  const el = document.getElementById("composerAvWrap");
  if (!el) return;
  const av = yo.avatarTipo === "video"
    ? `<video src="${yo.avatar}" autoplay loop muted playsinline class="avatar"></video>`
    : `<img src="${yo.avatar||defAv(yo.nombre)}" class="avatar" alt=""/>`;
  el.innerHTML = av;
})();


document.getElementById("btnLogout")?.addEventListener("click", () => { localStorage.clear(); location.href = "/login.html"; });
/* ═══════════════════════════════════════════════════
   SOCKET — inicializado aquí, no en el HTML
═══════════════════════════════════════════════════ */
let socket = null;
try {
  socket = io({ transports: ["polling", "websocket"], upgrade: true, reconnectionAttempts: 5 });

  socket.on("connect",   () => socket.emit("registrar", yo._id));
  socket.on("reconnect", () => socket.emit("registrar", yo._id));

  /* Notificaciones en tiempo real */
  socket.on("nuevaNotificacion", (notif) => {
    const badge  = document.getElementById("notifBadge");
    const actual = parseInt(badge?.textContent || "0") + 1;
    actualizarBadgeNotif(actual);
    mostrarToastNotif(notif);
  });

  /* Mensajes en tiempo real */
  socket.on("nuevoMensaje", () => {
    checkMsgBadge();
  });

} catch(e) {
  console.warn("Socket no disponible:", e.message);
}

/* ═══════════════════════════════════════════════════
   BADGES MAP
═══════════════════════════════════════════════════ */
const BADGES = {
  verified: `<i class="ri-verified-badge-fill" style="color:#4dabf7;font-size:.85em;vertical-align:middle"></i>`,
  star:     `<i class="ri-star-fill" style="color:#ffd43b;font-size:.85em;vertical-align:middle"></i>`,
  fire:     `<i class="ri-fire-fill" style="color:#ff6b35;font-size:.85em;vertical-align:middle"></i>`,
  crown:    `<i class="ri-vip-crown-fill" style="color:#ffd43b;font-size:.85em;vertical-align:middle"></i>`,
  dev:      `<i class="ri-code-box-fill" style="color:#69db7c;font-size:.85em;vertical-align:middle"></i>`,
  vip:      `<span style="background:linear-gradient(90deg,#ffd43b,#ff6b35);color:#050505;font-size:.58em;padding:1px 6px;border-radius:4px;font-weight:900;vertical-align:middle">VIP</span>`,
  new:      `<span style="background:var(--green);color:#050505;font-size:.58em;padding:1px 6px;border-radius:4px;font-weight:900;vertical-align:middle">NEW</span>`
};

/* ═══════════════════════════════════════════════════
   ESTADO MODAL POST
═══════════════════════════════════════════════════ */
let tipoActual = "normal", normalFile = null, slideImgs = [], slideAudio = null;
let composerFile = null, composerStick = null;

function abrirPostModal() { resetPostModal(); document.getElementById("postModal").classList.remove("hidden"); }
function cerrarPostModal() { document.getElementById("postModal").classList.add("hidden"); }
function resetPostModal() {
  tipoActual = "normal"; normalFile = null; slideImgs = []; slideAudio = null;
  document.getElementById("modalTexto").value = "";
  document.getElementById("modalTexto").style.height = "auto";
  document.getElementById("normalPrevBox").innerHTML = "";
  document.getElementById("slidePrevGrid").innerHTML = "";
  document.getElementById("audioLabel").textContent  = "Añadir música (MP3, OGG...)";
  document.getElementById("normalNSFWRow").style.display = "none";
  document.getElementById("nsfwStatus").classList.add("hidden");
  document.getElementById("nsfwNormal").classList.remove("on");
  document.getElementById("nsfwSlide").classList.remove("on");
  document.getElementById("normalFile").value  = "";
  document.getElementById("slideFiles").value  = "";
  document.getElementById("slideAudio").value  = "";
  setTipo("normal", document.getElementById("tab-normal"));
  document.getElementById("pollList").innerHTML = `
    <div class="poll-row"><input class="poll-inp" placeholder="Opción 1" maxlength="60"/><button class="poll-rm" style="visibility:hidden" onclick="remPollOp(this)"><i class="ri-close-line"></i></button></div>
    <div class="poll-row"><input class="poll-inp" placeholder="Opción 2" maxlength="60"/><button class="poll-rm" style="visibility:hidden" onclick="remPollOp(this)"><i class="ri-close-line"></i></button></div>`;
  document.getElementById("btnAddOp").style.display = "";
}
function setTipo(tipo, btn) {
  tipoActual = tipo;
  document.querySelectorAll(".post-type-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("zonaNormal").style.display    = tipo === "normal"    ? "block" : "none";
  document.getElementById("zonaSlideshow").style.display = tipo === "slideshow" ? "block" : "none";
  document.getElementById("zonaPoll").style.display      = tipo === "poll"      ? "block" : "none";
}

/* ── Normal file ── */
function onNormalFile(input) {
  const f = input.files[0]; if (!f) return;
  if (f.size > 50*1024*1024) { alert("Máximo 50MB"); input.value = ""; return; }
  normalFile = f;
  const url = URL.createObjectURL(f), esV = f.type.startsWith("video/");
  document.getElementById("normalPrevBox").innerHTML = `
    <div style="position:relative;border-radius:var(--radius);overflow:hidden;background:#000;margin-top:8px">
      ${esV
        ? `<video src="${url}" controls style="width:100%;max-height:260px;display:block"></video>`
        : `<img src="${url}" style="width:100%;max-height:260px;object-fit:contain;display:block"/>`}
      <button onclick="quitarNormalFile()" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.75);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center"><i class="ri-close-line"></i></button>
    </div>`;
  document.getElementById("normalNSFWRow").style.display = "flex";
  if (!esV) autoNSFW(f);
}
function quitarNormalFile() {
  normalFile = null;
  document.getElementById("normalPrevBox").innerHTML = "";
  document.getElementById("normalFile").value = "";
  document.getElementById("normalNSFWRow").style.display = "none";
  document.getElementById("nsfwStatus").classList.add("hidden");
}

/* ── Slideshow ── */
function onSlideFiles(input) {
  Array.from(input.files).forEach(f => {
    if (slideImgs.length >= 10 || !f.type.startsWith("image/")) return;
    slideImgs.push({ file: f, url: URL.createObjectURL(f) });
  });
  input.value = ""; renderSlidePrev();
}
function renderSlidePrev() {
  document.getElementById("slidePrevGrid").innerHTML = slideImgs.map((it, i) => `
    <div class="spi"><img src="${it.url}" alt=""/><span class="spi-n">${i+1}</span>
    <button class="spi-rm" onclick="remSlide(${i})"><i class="ri-close-line"></i></button></div>`).join("");
}
function remSlide(i) { slideImgs.splice(i, 1); renderSlidePrev(); }

function onSlideAudio(input) {
  const f = input.files[0]; if (!f) return;
  if (f.size > 20*1024*1024) { alert("Máximo 20MB"); input.value = ""; return; }
  slideAudio = f;
  document.getElementById("audioLabel").innerHTML = `<i class="ri-music-fill" style="color:var(--green);margin-right:4px"></i>${esc(f.name)}<button class="audio-rm" onclick="quitarAudio(event)"><i class="ri-close-line"></i></button>`;
}
function quitarAudio(e) {
  e.preventDefault(); slideAudio = null;
  document.getElementById("slideAudio").value = "";
  document.getElementById("audioLabel").textContent = "Añadir música (MP3, OGG...)";
}

/* ── Poll ── */
function addPollOp() {
  const list = document.getElementById("pollList");
  if (list.children.length >= 6) return;
  const n = list.children.length + 1;
  const row = document.createElement("div"); row.className = "poll-row";
  row.innerHTML = `<input class="poll-inp" placeholder="Opción ${n}" maxlength="60"/><button class="poll-rm" onclick="remPollOp(this)"><i class="ri-close-line"></i></button>`;
  list.appendChild(row); updPollRM();
  if (list.children.length >= 6) document.getElementById("btnAddOp").style.display = "none";
}
function remPollOp(btn) {
  const list = document.getElementById("pollList");
  if (list.children.length <= 2) return;
  btn.closest(".poll-row").remove();
  Array.from(list.children).forEach((r, i) => r.querySelector("input").placeholder = `Opción ${i+1}`);
  updPollRM(); document.getElementById("btnAddOp").style.display = "";
}
function updPollRM() {
  const list = document.getElementById("pollList");
  Array.from(list.children).forEach(r => {
    r.querySelector(".poll-rm").style.visibility = list.children.length > 2 ? "visible" : "hidden";
  });
}

/* ── NSFW ── */
let _nsfwM = null;
async function getNSFWModel() {
  if (_nsfwM) return _nsfwM;
  try {
    await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.min.js");
    await loadScript("https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/dist/nsfwjs.min.js");
    _nsfwM = await nsfwjs.load("MobileNetV2"); return _nsfwM;
  } catch(e) { return null; }
}
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}
async function autoNSFW(file) {
  const st = document.getElementById("nsfwStatus"); st.classList.remove("hidden");
  try {
    const m = await getNSFWModel(); if (!m) { st.classList.add("hidden"); return; }
    const img = new Image(); img.src = URL.createObjectURL(file);
    await new Promise(r => { img.onload = r; img.onerror = r; });
    const preds = await m.classify(img);
    const score = preds.filter(p => ["Porn","Hentai","Sexy"].includes(p.className)).reduce((s,p) => s + p.probability, 0);
    st.classList.add("hidden");
    if (score > 0.60) {
      document.getElementById("nsfwNormal").classList.add("on");
      st.innerHTML = `<i class="ri-shield-check-line" style="color:var(--red)"></i> Detectado como contenido sensible`;
      st.classList.remove("hidden");
    }
  } catch(e) { st.classList.add("hidden"); }
}

/* ═══════════════════════════════════════════════════
   PUBLICAR
═══════════════════════════════════════════════════ */
async function publicarPost() {
  const btn   = document.getElementById("btnPublicar");
  const texto = document.getElementById("modalTexto").value.trim();
  if (btn) btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append("tipo", tipoActual);
    if (texto) fd.append("texto", texto);

    if (tipoActual === "normal") {
      if (!texto && !normalFile) { alert("Escribe algo o añade un archivo"); return; }
      if (normalFile) fd.append("media", normalFile);
      fd.append("nsfw", String(document.getElementById("nsfwNormal").classList.contains("on")));
    } else if (tipoActual === "slideshow") {
      if (!slideImgs.length && !texto) { alert("Añade al menos una imagen"); return; }
      slideImgs.forEach(it => fd.append("imagenes", it.file));
      if (slideAudio) fd.append("audio", slideAudio);
      fd.append("nsfw", String(document.getElementById("nsfwSlide").classList.contains("on")));
    } else if (tipoActual === "poll") {
      if (!texto) { alert("Escribe la pregunta"); return; }
      const ops = Array.from(document.querySelectorAll("#pollList .poll-inp")).map(i => i.value.trim()).filter(Boolean);
      if (ops.length < 2) { alert("Mínimo 2 opciones"); return; }
      fd.append("opciones", JSON.stringify(ops));
    }

    const res  = await fetch(`${API}/posts`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error");
    cerrarPostModal(); prependPost(data);
  } catch(e) { alert("Error: " + e.message); }
  finally { if (btn) btn.disabled = false; }
}

/* ── Composer rápido ── */
function onComposerInput(el) {
  const rem = 280 - el.value.length;
  const cc  = document.getElementById("charCount");
  cc.textContent  = String(rem);
  cc.style.color  = rem < 20 ? "var(--red)" : rem < 60 ? "var(--orange)" : "var(--text-3)";
  el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px";
}
function onComposerMedia(input) {
  const f = input.files[0]; if (!f) return;
  composerFile = f;
  const url = URL.createObjectURL(f), esV = f.type.startsWith("video/");
  const box = document.getElementById("imagePreviewBox");
  box.classList.remove("hidden");
  if (esV) {
    box.innerHTML = `<button class="remove-image" onclick="quitarMediaComposer()"><i class="ri-close-line"></i></button><video src="${url}" controls style="width:100%;max-height:280px;object-fit:contain;display:block"></video>`;
  } else {
    const img = box.querySelector("img");
    if (img) { img.src = url; img.classList.remove("hidden"); }
  }
}
function quitarMediaComposer() {
  composerFile = null; composerStick = null;
  document.getElementById("imageInput").value = "";
  const box = document.getElementById("imagePreviewBox");
  box.classList.add("hidden");
  box.innerHTML = `<button class="remove-image" onclick="quitarMediaComposer()"><i class="ri-close-line"></i></button><img id="imagePreview" src="" alt=""/>`;
}
async function publicarNormal() {
  const btn   = document.getElementById("btnPost");
  const texto = document.getElementById("postInput").value.trim();
  if (!texto && !composerFile && !composerStick) return;
  btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append("tipo", "normal");
    if (texto)        fd.append("texto", texto);
    if (composerFile) fd.append("media", composerFile);
    if (composerStick) {
      const r = await fetch(composerStick); const b = await r.blob();
      fd.append("media", b, "sticker.png");
    }
    const res  = await fetch(`${API}/posts`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error");
    document.getElementById("postInput").value = "";
    document.getElementById("charCount").textContent = "280";
    document.getElementById("charCount").style.color = "var(--text-3)";
    quitarMediaComposer(); composerStick = null;
    prependPost(data);
  } catch(e) { alert("Error: " + e.message); }
  finally { btn.disabled = false; }
}

/* ═══════════════════════════════════════════════════
   FEED
═══════════════════════════════════════════════════ */
let paginaFeed = 1, cargandoMas = false;

async function cargarFeed(reset = false) {
  if (reset) {
    paginaFeed = 1;
    document.getElementById("feed").innerHTML = `<div class="loading"><i class="ri-loader-4-line spin"></i> Cargando posts...</div>`;
  }
  try {
    const res  = await fetch(`${API}/posts?pagina=${paginaFeed}&limite=20`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error");
    const feed = document.getElementById("feed");
    if (reset) feed.innerHTML = "";
    if (!data.length && reset) {
      feed.innerHTML = `<div class="empty-state"><div>🌱</div><p>Sin posts aún.<br/>¡Sé el primero en publicar!</p></div>`;
    } else {
      data.forEach(p => { const d = document.createElement("div"); d.innerHTML = renderPost(p); feed.appendChild(d.firstElementChild); });
      document.getElementById("loadMoreBox")?.classList.toggle("hidden", data.length < 20);
    }
    initSlideshows();
  } catch(e) {
    document.getElementById("feed").innerHTML = `<div class="empty-state"><div>⚠️</div><p>Error al cargar: ${esc(e.message)}</p></div>`;
  }
}
async function cargarMas() {
  if (cargandoMas) return;
  cargandoMas = true; paginaFeed++;
  await cargarFeed(false);
  cargandoMas = false;
}
function prependPost(p) {
  const feed = document.getElementById("feed");
  feed.querySelector(".empty-state")?.remove();
  const d = document.createElement("div"); d.innerHTML = renderPost(p);
  feed.prepend(d.firstElementChild); initSlideshows();
}

/* ═══════════════════════════════════════════════════
   RENDER POST
═══════════════════════════════════════════════════ */
function renderPost(p) {
  const autor = p.autor || {};

  /* ── Personalización ── */
  let perf = {};
  try {
    const raw = autor.personalizacion;
    if      (!raw)                    perf = {};
    else if (typeof raw === "object") perf = raw;
    else if (typeof raw === "string") perf = JSON.parse(raw);
  } catch(_) { perf = {}; }

  /* ── Marco ── */
  let avClass = "avatar";
  if      (perf.marco === "rainbow")  avClass += " avatar-rainbow";
  else if (perf.marco === "animated") avClass += " avatar-animated";
  else if (perf.marco === "gold")     avClass += " avatar-gold";

  const avEl = autor.avatarTipo === "video"
    ? `<video src="${autor.avatar||''}" class="${avClass}" autoplay loop muted playsinline style="cursor:pointer" onclick="ir('profile.html?handle=${esc(autor.handle)}')"></video>`
    : `<img src="${autor.avatar||defAv(autor.nombre)}" class="${avClass}" alt="" style="cursor:pointer" onclick="ir('profile.html?handle=${esc(autor.handle)}')"/>`;

  /* ── Verificado ── */
  const esVerificado = autor.verificado === true || autor.verificado === "true" || autor.verificado === 1;
  const vHTML = esVerificado
    ? `<i class="ri-verified-badge-fill" style="color:var(--green);font-size:.82rem;vertical-align:middle"></i>`
    : "";

  /* ── Badge ── */
  const badgeHTML = (perf.badge && perf.badge !== "none") ? (BADGES[perf.badge] || "") : "";

  /* ── Nombre efecto ── */
  let nameStyle = "";
  const ef = perf.nombreEfecto || "none";
  const grads = {
    "green-blue": "linear-gradient(90deg,#5cdb6f,#4dabf7)",
    "fire":       "linear-gradient(90deg,#ff6b35,#ffd43b)",
    "purple":     "linear-gradient(90deg,#cc5de8,#845ef7)",
    "sunset":     "linear-gradient(90deg,#ff6b6b,#feca57)",
    "ocean":      "linear-gradient(90deg,#54a0ff,#5f27cd)",
    "custom":     `linear-gradient(90deg,${perf.gradColor1||'#5cdb6f'},${perf.gradColor2||'#4dabf7'})`
  };
  if (ef === "gradient") {
    const g = grads[perf.nombreGradiente || "green-blue"];
    nameStyle = `style="background:${g};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;"`;
  } else if (ef === "glow") {
    nameStyle = `style="color:${perf.nombreColor||'var(--green)'};text-shadow:0 0 10px ${perf.nombreColor||'var(--green)'};"`;
  } else if (ef === "neon") {
    nameStyle = `style="color:${perf.nombreColor||'#fff'};text-shadow:0 0 7px ${perf.nombreColor||'var(--green)'},0 0 21px ${perf.nombreColor||'var(--green)'};"`;
  } else if (ef === "color" && perf.nombreColor && perf.nombreColor !== "#f0f0f0" && perf.nombreColor !== "none") {
    nameStyle = `style="color:${perf.nombreColor};"`;
  }

  /* ── Media ── */
  let mediaHTML = "";
  if      (p.tipo === "slideshow" && p.imagenes?.length) mediaHTML = buildSlide(p);
  else if (p.tipo === "poll"      && p.opciones?.length) mediaHTML = buildPoll(p);
  else if (p.mediaUrl) {
    if (p.mediaTipo === "video") {
      mediaHTML = `<video src="${p.mediaUrl}" controls playsinline class="post-img" style="object-fit:contain;height:auto;cursor:default"></video>`;
    } else {
      const inner = `<img src="${p.mediaUrl}" class="post-img" onclick="verFull('${p.mediaUrl}')" alt=""/>`;
      mediaHTML = p.nsfw
        ? `<div class="nsfw-wrap">${inner}<div class="nsfw-overlay" onclick="quitarNSFW(this)"><i class="ri-eye-off-line"></i><p>Contenido sensible</p><small>Toca para ver</small></div></div>`
        : inner;
    }
  }

  const esMio   = (p.autor?._id || p.autor || "").toString() === yo._id;
  const likes   = (p.likes    || []).length;
  const coms    = (p.comentarios || []).length;
  const reposts = (p.reposts  || []).length;

  return `
    <article class="post-card" data-id="${p._id}">
      ${avEl}
      <div class="post-body">
        <div class="post-user">
          <strong ${nameStyle} onclick="ir('profile.html?handle=${esc(autor.handle)}')">${esc(autor.nombre||"?")}${vHTML}${badgeHTML}</strong>
          <span class="handle" onclick="ir('profile.html?handle=${esc(autor.handle)}')">@${esc(autor.handle||"")}</span>
          <span class="post-time">${tiempoCorto(p.createdAt)}</span>
          ${esMio ? `<button class="post-btn delete" onclick="borrarPost('${p._id}',this)" style="margin-left:auto"><i class="ri-delete-bin-line"></i></button>` : ""}
        </div>
        ${p.texto ? `<p class="post-text">${parsearTextoHTML(p.texto)}</p>` : ""}
        ${mediaHTML}
        <div class="post-footer">
          <button class="post-btn ${p.yaLike?"liked":""}" id="like-${p._id}" onclick="likear('${p._id}',this)">
            <i class="${p.yaLike?"ri-heart-fill":"ri-heart-line"}"></i> ${likes}
          </button>
          <button class="post-btn" onclick="toggleComentarios('${p._id}')">
            <i class="ri-chat-3-line"></i> <span id="cc-${p._id}">${coms}</span>
          </button>
          <button class="post-btn ${p.yaRepost?"reposted":""}" id="rp-${p._id}" onclick="repostear('${p._id}',this)">
            <i class="${p.yaRepost?"ri-repeat-fill":"ri-repeat-line"}"></i> ${reposts}
          </button>
          <button class="post-btn" onclick="compartir('${p._id}')">
            <i class="ri-share-line"></i>
          </button>
        </div>
        <div class="comments-section hidden" id="cs-${p._id}">
          <div class="comments-list" id="cl-${p._id}"></div>
          <div class="comment-input-row">
            <div class="comment-input-wrap">
              <input class="comment-input" placeholder="Comenta..." id="ci-${p._id}"
                     onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();enviarComentario('${p._id}')}"/>
              <button class="btn-send-comment" onclick="enviarComentario('${p._id}')">
                <i class="ri-send-plane-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>`;
}

/* ── Render comentario ── */
function renderComentarioHTML(c) {
  const autor = c.autor || {};
  let perf = {};
  try {
    const raw = autor.personalizacion;
    if      (!raw)                    perf = {};
    else if (typeof raw === "object") perf = raw;
    else if (typeof raw === "string") perf = JSON.parse(raw);
  } catch(_) { perf = {}; }

  const badgeHTML    = (perf.badge && perf.badge !== "none") ? (BADGES[perf.badge] || "") : "";
  const esVerificado = autor.verificado === true || autor.verificado === "true" || autor.verificado === 1;
  const vHTML        = esVerificado ? `<i class="ri-verified-badge-fill" style="color:var(--green);font-size:.78rem;vertical-align:middle"></i>` : "";

  const avEl = autor.avatarTipo === "video"
    ? `<video src="${autor.avatar||''}" autoplay loop muted playsinline style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0"></video>`
    : `<img src="${autor.avatar||defAv(autor.nombre)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--surface-3)"/>`;

  const likes  = (c.likes || []).length;
  const yaLike = (c.likes || []).some(id => id.toString() === yo._id);

  return `
    <div class="comment-item" id="ci-item-${c._id}">
      ${avEl}
      <div class="comment-body">
        <div class="comment-header">
          <strong style="font-size:.84rem;font-weight:700;cursor:pointer"
                  onclick="ir('profile.html?handle=${esc(autor.handle||"")}')">${esc(autor.nombre||"?")}${vHTML}${badgeHTML}</strong>
          <span style="font-size:.7rem;color:var(--text-3)">· ${tiempoCorto(c.createdAt)}</span>
        </div>
        <div class="comment-text">${parsearTextoHTML(c.texto)}</div>
        <div class="comment-footer">
          <button class="post-btn ${yaLike?"liked":""}" style="padding:2px 8px;font-size:.73rem" onclick="likeComentario('${c._id}',this)">
            <i class="${yaLike?"ri-heart-fill":"ri-heart-line"}"></i> ${likes}
          </button>
        </div>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════
   SLIDESHOW
═══════════════════════════════════════════════════ */
function buildSlide(p) {
  const id   = `sl${p._id}`;
  const imgs = p.imagenes || [];
  const items = imgs.map((url, i) => `
    <div class="slide-item">
      ${(p.nsfw && i === 0)
        ? `<div class="nsfw-wrap">
             <img src="${url}" style="width:100%;max-height:460px;object-fit:contain;display:block"/>
             <div class="nsfw-overlay" onclick="quitarNSFW(this)">
               <i class="ri-eye-off-line"></i><p>Contenido sensible</p><small>Toca para ver</small>
             </div>
           </div>`
        : `<img src="${url}" style="width:100%;max-height:460px;object-fit:contain;display:block;cursor:zoom-in" onclick="verFull('${url}')" alt="foto ${i+1}"/>`}
    </div>`).join("");

  return `
    <div class="slide-wrap" id="${id}" data-idx="0" data-total="${imgs.length}">
      <div class="slide-track" id="${id}t">${items}</div>
      ${imgs.length > 1 ? `
        <button class="slide-btn prev" onclick="sMov('${id}',-1)"><i class="ri-arrow-left-s-line"></i></button>
        <button class="slide-btn next" onclick="sMov('${id}',1)"><i class="ri-arrow-right-s-line"></i></button>
        <div class="slide-dots" id="${id}d">
          ${imgs.map((_,i) => `<span class="dot ${i===0?"active":""}"></span>`).join("")}
        </div>
        <div class="slide-counter"><span id="${id}c">1</span>/${imgs.length}</div>` : ""}
      ${p.audioUrl ? `
        <button class="slide-audio-btn" id="${id}ab" onclick="toggleAudio('${id}')">
          <i class="ri-music-line"></i>
        </button>
        <audio id="${id}au" src="${p.audioUrl}" loop></audio>` : ""}
    </div>`;
}
function sMov(id, dir) {
  const w = document.getElementById(id); if (!w) return;
  const t = parseInt(w.dataset.total); let i = parseInt(w.dataset.idx) + dir;
  if (i < 0) i = t - 1; if (i >= t) i = 0;
  w.dataset.idx = i;
  const tr = document.getElementById(`${id}t`); if (tr) tr.style.transform = `translateX(-${i*100}%)`;
  document.querySelectorAll(`#${id}d .dot`).forEach((d, j) => d.classList.toggle("active", j === i));
  const c = document.getElementById(`${id}c`); if (c) c.textContent = String(i + 1);
}
function toggleAudio(id) {
  const au = document.getElementById(`${id}au`), bt = document.getElementById(`${id}ab`);
  if (!au) return;
  if (au.paused) {
    document.querySelectorAll("audio").forEach(a => { if (a !== au) a.pause(); });
    au.play();
    if (bt) { bt.classList.add("playing"); bt.innerHTML = `<i class="ri-pause-line"></i>`; }
  } else {
    au.pause();
    if (bt) { bt.classList.remove("playing"); bt.innerHTML = `<i class="ri-music-line"></i>`; }
  }
}
function initSlideshows() {
  document.querySelectorAll(".slide-wrap").forEach(w => {
    if (w.dataset.sw) return; w.dataset.sw = "1";
    let sx = 0;
    w.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
    w.addEventListener("touchend",   e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) sMov(w.id, dx < 0 ? 1 : -1); });
  });
}

/* ═══════════════════════════════════════════════════
   POLL
═══════════════════════════════════════════════════ */
function buildPoll(p) {
  const total = (p.opciones || []).reduce((s, o) => s + (o.votos?.length || 0), 0);
  const voted = !!p.miVoto;
  const opts  = (p.opciones || []).map(op => {
    const v = (op.votos || []).length, pct = total > 0 ? Math.round((v / total) * 100) : 0;
    const mio = p.miVoto && p.miVoto.toString() === op._id.toString();
    return `
      <button class="poll-opt-btn ${voted?(mio?"voted":"voted-other"):""}"
              id="po${op._id}" ${voted?"disabled":""} onclick="votar('${p._id}','${op._id}',this)">
        <div class="poll-bar" style="width:${voted?pct:0}%"></div>
        <div class="poll-opt-inner">
          <span>${esc(op.texto)}</span>
          ${mio ? `<i class="ri-check-line poll-check"></i>` : ""}
          ${voted ? `<span class="poll-pct">${pct}%</span>` : ""}
        </div>
      </button>`;
  }).join("");
  return `<div class="poll-wrap" id="pw${p._id}">${opts}<p class="poll-total-txt">${total} voto${total!==1?"s":""}</p></div>`;
}
async function votar(postId, opId) {
  const w = document.getElementById(`pw${postId}`); if (!w) return;
  w.querySelectorAll(".poll-opt-btn").forEach(b => b.disabled = true);
  try {
    const res  = await fetch(`${API}/posts/${postId}/votar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ opcion: opId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error");
    const total = data.opciones.reduce((s, o) => s + (o.votos?.length || 0), 0);
    data.opciones.forEach(op => {
      const b = document.getElementById(`po${op._id}`); if (!b) return;
      const v = (op.votos?.length || 0), pct = total > 0 ? Math.round((v/total)*100) : 0;
      const mio = op._id.toString() === opId;
      b.className = `poll-opt-btn ${mio?"voted":"voted-other"}`; b.disabled = true;
      const txt = b.querySelector("span")?.textContent || "";
      b.innerHTML = `<div class="poll-bar" style="width:${pct}%"></div><div class="poll-opt-inner"><span>${txt}</span>${mio?`<i class="ri-check-line poll-check"></i>`:""}<span class="poll-pct">${pct}%</span></div>`;
    });
    w.querySelector(".poll-total-txt").textContent = `${total} voto${total!==1?"s":""}`;
  } catch(e) {
    alert("Error al votar: " + e.message);
    w.querySelectorAll(".poll-opt-btn").forEach(b => b.disabled = false);
  }
}

function quitarNSFW(el) { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); }

/* ═══════════════════════════════════════════════════
   COMENTARIOS
═══════════════════════════════════════════════════ */
async function toggleComentarios(postId) {
  const sec = document.getElementById(`cs-${postId}`); if (!sec) return;
  if (!sec.classList.contains("hidden")) { sec.classList.add("hidden"); return; }
  sec.classList.remove("hidden"); cargarComentarios(postId);
}
async function cargarComentarios(postId) {
  const list = document.getElementById(`cl-${postId}`); if (!list) return;
  list.innerHTML = `<div class="no-comments"><i class="ri-loader-4-line spin"></i> Cargando...</div>`;
  try {
    const res  = await fetch(`${API}/posts/${postId}/comments`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data.length) { list.innerHTML = `<div class="no-comments"><i class="ri-chat-3-line"></i> Sin comentarios aún.</div>`; return; }
    list.innerHTML = data.map(c => renderComentarioHTML(c)).join("");
  } catch(e) {
    list.innerHTML = `<div class="no-comments" style="color:var(--red)"><i class="ri-error-warning-line"></i> Error al cargar</div>`;
  }
}
async function enviarComentario(postId) {
  const inp  = document.getElementById(`ci-${postId}`);
  const text = inp?.value.trim(); if (!text) return;
  inp.value = ""; inp.disabled = true;
  try {
    const res  = await fetch(`${API}/posts/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ texto: text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error");
    const list = document.getElementById(`cl-${postId}`);
    if (list) {
      list.querySelector(".no-comments")?.remove();
      list.insertAdjacentHTML("beforeend", renderComentarioHTML(data));
      list.scrollTop = list.scrollHeight;
    }
    const cc = document.getElementById(`cc-${postId}`);
    if (cc) cc.textContent = String(parseInt(cc.textContent || "0") + 1);
  } catch(e) { alert("Error al comentar: " + e.message); }
  finally { if (inp) { inp.disabled = false; inp.focus(); } }
}
async function likeComentario(id, btn) {
  try {
    const res  = await fetch(`${API}/posts/comments/${id}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error();
    btn.className = `post-btn ${data.yaLike?"liked":""}`;
    btn.innerHTML = `<i class="${data.yaLike?"ri-heart-fill":"ri-heart-line"}"></i> ${data.likes}`;
  } catch(_) {}
}

/* ═══════════════════════════════════════════════════
   LIKE / REPOST / BORRAR / COMPARTIR
═══════════════════════════════════════════════════ */
async function likear(id, btn) {
  try {
    const res  = await fetch(`${API}/posts/${id}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    btn.className = `post-btn ${data.yaLike?"liked":""}`;
    btn.innerHTML = `<i class="${data.yaLike?"ri-heart-fill":"ri-heart-line"}"></i> ${data.likes}`;
  } catch(_) {}
}
async function repostear(id, btn) {
  try {
    const res  = await fetch(`${API}/posts/${id}/repost`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    btn.className = `post-btn ${data.yaRepost?"reposted":""}`;
    btn.innerHTML = `<i class="${data.yaRepost?"ri-repeat-fill":"ri-repeat-line"}"></i> ${data.reposts}`;
  } catch(_) {}
}
async function borrarPost(id, btn) {
  if (!confirm("¿Borrar este post?")) return;
  try {
    await fetch(`${API}/posts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    btn.closest(".post-card").remove();
  } catch(_) { alert("Error al borrar"); }
}
function compartir(id) {
  const url = `${location.origin}/post/${id}`;
  if (navigator.share) navigator.share({ url });
  else navigator.clipboard?.writeText(url).then(() => alert("Link copiado ✓"));
}

/* ═══════════════════════════════════════════════════
   STICKER IA
═══════════════════════════════════════════════════ */
let stickerSelUrl = null;
function abrirModalSticker()  { document.getElementById("modalSticker").classList.remove("hidden"); }
function cerrarModalSticker() { document.getElementById("modalSticker").classList.add("hidden"); stickerSelUrl = null; }
async function generarStickers() {
  const btn    = document.getElementById("btnGenerarSticker");
  const prompt = document.getElementById("stickerPromptInput").value.trim(); if (!prompt) return;
  btn.disabled = true; btn.innerHTML = `<i class="ri-loader-4-line spin"></i> Generando...`;
  const res_el = document.getElementById("stickerResults"), sel_el = document.getElementById("stickerSeleccionado");
  res_el.innerHTML = ""; sel_el.classList.add("hidden");
  try {
    const [u1, u2] = await Promise.all([
      generarImgIA(prompt + ", sticker style, white outline, transparent background"),
      generarImgIA(prompt + ", cute sticker, kawaii style, white border")
    ]);
    res_el.innerHTML = `<div class="sticker-grid">${[u1,u2].map((u,i) => `<div class="sticker-option" onclick="selSticker(this,'${u}')"><img src="${u}" alt="sticker ${i+1}"/></div>`).join("")}</div>`;
  } catch(e) { alert("Error: " + e.message); }
  finally { btn.disabled = false; btn.innerHTML = `<i class="ri-sparkling-2-line"></i> Generar 2 stickers`; }
}
async function generarImgIA(prompt) {
  const res = await fetch(`${API}/ia/generar-imagen`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  const d = await res.json(); if (!res.ok) throw new Error(d.mensaje || "Error IA"); return d.url;
}
function selSticker(el, url) {
  document.querySelectorAll(".sticker-option").forEach(e => e.classList.remove("selected"));
  el.classList.add("selected"); stickerSelUrl = url;
  document.getElementById("stickerSeleccionado").classList.remove("hidden");
}
function adjuntarStickerAPost() {
  if (!stickerSelUrl) return;
  composerStick = stickerSelUrl;
  const box = document.getElementById("imagePreviewBox"); box.classList.remove("hidden");
  const img = document.getElementById("imagePreview"); if (img) img.src = stickerSelUrl;
  cerrarModalSticker();
}

/* ═══════════════════════════════════════════════════
   SUGERENCIAS + VIDEOS
═══════════════════════════════════════════════════ */
async function cargarSugerencias() {
  try {
    const res  = await fetch(`${API}/users/sugerencias`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const el   = document.getElementById("sugerenciasList");
    if (!data.length) { el.innerHTML = `<p style="color:var(--text-3);font-size:.82rem">Sin sugerencias</p>`; return; }
    el.innerHTML = data.slice(0, 5).map(u => {
      const av = u.avatarTipo === "video"
        ? `<video src="${u.avatar}" autoplay loop muted playsinline class="avatar-sm"></video>`
        : `<img src="${u.avatar||defAv(u.nombre)}" class="avatar-sm" alt=""/>`;
      return `<div class="suggestion">${av}<div style="cursor:pointer" onclick="ir('profile.html?handle=${esc(u.handle)}')"><strong>${esc(u.nombre)}</strong><small>@${esc(u.handle)}</small></div><button class="btn-seguir" onclick="seguir('${u._id}',this)">Seguir</button></div>`;
    }).join("");
  } catch(_) {}
}
async function cargarVideosRecientes() {
  try {
    const res  = await fetch(`${API}/videos?limite=4`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const el   = document.getElementById("videosRecientesList");
    if (!data.length) { el.innerHTML = `<p style="color:var(--text-3);font-size:.82rem">Sin videos</p>`; return; }
    el.innerHTML = data.map(v => `
      <div class="vid-item" onclick="ir('videos.html')">
        <video src="${v.videoUrl}" class="vid-thumb" muted></video>
        <div><div class="vid-title">${esc(v.titulo||v.descripcion||"Video")}</div><div class="vid-sub">@${esc(v.autor?.handle||"")}</div></div>
      </div>`).join("");
  } catch(_) {}
}
async function seguir(userId, btn) {
  try {
    const res = await fetch(`${API}/users/${userId}/follow`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const d   = await res.json();
    btn.textContent    = d.siguiendo ? "Siguiendo" : "Seguir";
    btn.style.background = d.siguiendo ? "transparent" : "";
    btn.style.color      = d.siguiendo ? "var(--text-3)" : "";
    btn.style.border     = d.siguiendo ? "1px solid var(--border-2)" : "";
  } catch(_) {}
}

/* ═══════════════════════════════════════════════════
   NOTIFICACIONES BADGE
═══════════════════════════════════════════════════ */
async function cargarBadgeNotifs() {
  try {
    const res  = await fetch(`${API}/notificaciones/no-leidas`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    actualizarBadgeNotif(data.count);
  } catch(_) {}
}
function actualizarBadgeNotif(count) {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;
  if (count > 0) {
    badge.textContent    = count > 99 ? "99+" : String(count);
    badge.style.display  = "flex";
  } else {
    badge.style.display = "none";
  }
}
function mostrarToastNotif(n) {
  const emojis = { like:"❤️", comentario:"💬", mencion:"@", repost:"🔁", seguidor:"👤" };
  const textos = { like:"le dio like", comentario:"comentó", mencion:"te mencionó", repost:"hizo repost", seguidor:"te siguió" };
  const toast  = document.createElement("div");
  toast.style.cssText = `
    position:fixed;bottom:80px;right:16px;z-index:9999;
    background:#1c1c1c;border:1px solid #2a2a2a;border-radius:14px;
    padding:10px 14px;display:flex;align-items:center;gap:10px;
    font-size:.84rem;max-width:280px;box-shadow:0 4px 24px rgba(0,0,0,.6);
    cursor:pointer;animation:slideIn .3s ease;
  `;
  toast.innerHTML = `
    <span style="font-size:1.2rem">${emojis[n.tipo]||"🔔"}</span>
    <div>
      <div style="font-weight:700;color:#f0f0f0">${esc(n.origen?.nombre||"")}</div>
      <div style="color:#a0a0a0">${textos[n.tipo]||""}</div>
    </div>`;
  toast.onclick = () => location.href = "notifications.html";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ── Msg badge ── */
async function checkMsgBadge() {
  try {
    const res = await fetch(`${API}/messages/noLeidos`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const d = await res.json();
    const b = document.getElementById("msgBadge");
    if (b && d.total > 0) { b.textContent = String(d.total); b.classList.remove("hidden"); }
  } catch(_) {}
}

/* ── Media full ── */
function verFull(url) {
  const m = document.getElementById("modalImgFull");
  document.getElementById("modalImgInner").innerHTML = `<img src="${url}" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:var(--radius);box-shadow:var(--shadow)"/>`;
  m.classList.add("active");
}
function cerrarImgFull() {
  document.getElementById("modalImgFull").classList.remove("active");
  document.getElementById("modalImgInner").innerHTML = "";
}

/* ═══════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════ */
function parsearTextoHTML(texto = "") {
  return esc(texto)
    .replace(/@([a-zA-Z0-9_]+)/g,
      '<a href="profile.html?handle=$1" style="color:var(--green);font-weight:600" onclick="event.stopPropagation()">@$1</a>')
    .replace(/#([a-zA-Z0-9_]+)/g,
      '<a href="explore.html?tag=$1" style="color:#4dabf7;font-weight:600" onclick="event.stopPropagation()">#$1</a>');
}
function defAv(n = "?") {
  const l = (n||"?")[0].toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="#1c1c1c"/><text x="20" y="26" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#5cdb6f">${l}</text></svg>`)}`;
}
function esc(s = "") { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function tiempoCorto(f) {
  const d = (Date.now() - new Date(f)) / 1000;
  if (d < 60)    return "ahora";
  if (d < 3600)  return `${Math.floor(d/60)}m`;
  if (d < 86400) return `${Math.floor(d/3600)}h`;
  return new Date(f).toLocaleDateString("es", { day:"numeric", month:"short" });
}
function autoResizeTA(el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; }
function ir(url) { location.href = url; }

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  cerrarPostModal(); cerrarModalSticker(); cerrarImgFull();
});

/* ═══════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
cargarFeed(true);
cargarSugerencias();
cargarVideosRecientes();
cargarBadgeNotifs();
checkMsgBadge();
setInterval(checkMsgBadge, 30000);
setInterval(cargarBadgeNotifs, 60000); // refresca badge cada minuto
