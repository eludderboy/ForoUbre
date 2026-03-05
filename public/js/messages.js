/* ════════════════════════
   INIT
════════════════════════ */
const API   = "/api";
const token = localStorage.getItem("fu_token");
const yo    = JSON.parse(localStorage.getItem("fu_usuario") || "null");
if (!token || !yo) window.location.href = "/login.html";

document.getElementById("navPerfil").href  = `profile.html?handle=${yo.handle}`;
document.getElementById("bnPerfil")?.setAttribute("href", `profile.html?handle=${yo.handle}`);

/* ── Sidebar user ── */
(function () {
  const el = document.getElementById("sidebarUser");
  if (!el) return;
  const av = yo.avatarTipo === "video"
    ? `<video src="${yo.avatar}" autoplay loop muted playsinline style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0"></video>`
    : `<img src="${yo.avatar || getDefaultAv(yo.nombre)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" alt=""/>`;
  el.innerHTML = `${av}<div style="min-width:0"><strong>${esc(yo.nombre)}</strong><small>@${esc(yo.handle)}</small></div>`;
})();

/* ════════════════════════
   FIX TECLADO MÓVIL
════════════════════════ */
function ajustarTeclado() {
  if (window.innerWidth > 768) return;
  const vv = window.visualViewport;
  if (!vv) return;
  const panel = document.getElementById("chatPanel");
  if (!panel || panel.classList.contains("off")) return;
  const bnavH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--bnav-h")) || 54;
  panel.style.height = (vv.height - bnavH) + "px";
  panel.style.top    = vv.offsetTop + "px";
  panel.style.bottom = "auto";
}
function resetTeclado() {
  if (window.innerWidth > 768) return;
  const panel = document.getElementById("chatPanel");
  if (!panel) return;
  panel.style.height = "";
  panel.style.top    = "";
  panel.style.bottom = "";
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", ajustarTeclado);
  window.visualViewport.addEventListener("scroll", ajustarTeclado);
}

/* ════════════════════════
   ESTADO
════════════════════════ */
let convs       = [];
let convActiva  = null;
let mediaFile   = null;
let typingTimer = null;
let socket      = null;

/* ════════════════════════
   SOCKET
════════════════════════ */
try {
  socket = io({ transports: ["polling", "websocket"], upgrade: true, reconnectionAttempts: 5 });
  socket.on("connect",   () => socket.emit("registrar", yo._id));
  socket.on("reconnect", () => socket.emit("registrar", yo._id));
  socket.on("nuevoMensaje", ({ convId, mensaje }) => {
    actualizarConvEnLista(convId, mensaje);
    if (convActiva === convId) { appendMsg(mensaje); marcarLeido(convId, true); }
    else subirBadge(convId);
  });
  socket.on("usuarioEscribiendo",  ({ convId }) => { if (convActiva === convId) setTyping(true);  });
  socket.on("usuarioDejoEscribir", ({ convId }) => { if (convActiva === convId) setTyping(false); });
  socket.on("mensajesLeidos",      ({ convId }) => { if (convActiva === convId) marcarMsgsVisto(); });
} catch (e) { console.warn("Socket:", e.message); }

/* ════════════════════════
   CONVERSACIONES
════════════════════════ */
async function cargarConversaciones() {
  try {
    const res = await fetch(`${API}/messages`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    convs = await res.json();
    renderConvList(convs);
    const p = new URLSearchParams(location.search).get("conv");
    if (p) abrirConv(p);
  } catch (e) {
    console.error(e);
    document.getElementById("convList").innerHTML =
      `<div class="conv-empty"><i class="ri-error-warning-line" style="color:var(--red)"></i>Error al cargar</div>`;
  }
}

function renderConvList(lista) {
  const el = document.getElementById("convList");
  if (!lista.length) {
    el.innerHTML = `<div class="conv-empty"><i class="ri-message-3-line"></i>Sin mensajes aún.<br/>Ve a un perfil → "Mensaje".</div>`;
    return;
  }
  el.innerHTML = lista.map(htmlConvItem).join("");
}

function htmlConvItem(c) {
  const o  = c.otro || {};
  const av = o.avatarTipo === "video"
    ? `<video src="${o.avatar || ''}" autoplay loop muted playsinline></video>`
    : `<img src="${o.avatar || getDefaultAv(o.nombre)}" alt=""/>`;

  let prev = "Toca para chatear";
  if (c.ultimoMensaje) {
    const esM  = getAutorId(c.ultimoMensaje) === yo._id;
    const tipo = c.ultimoMensaje.mediaTipo || c.ultimoMensaje.media?.tipo;
    const tx   = getTexto(c.ultimoMensaje);
    if      (tipo === "imagen") prev = (esM ? "Tú: " : "") + "📷 Foto";
    else if (tipo === "video")  prev = (esM ? "Tú: " : "") + "🎥 Video";
    else if (tx)                prev = (esM ? "Tú: " : "") + tx;
  }
  const hora = c.ultimoMensaje?.createdAt ? tiempoCorto(c.ultimoMensaje.createdAt) : "";

  return `
    <div class="conv-item ${convActiva === c._id ? "active" : ""}" id="ci-${c._id}" onclick="abrirConv('${c._id}')">
      <div class="cav">${av}</div>
      <div class="conv-info">
        <div class="cnr">
          <span class="cname">${esc(o.nombre || "?")}</span>
          <span class="ctime">${hora}</span>
        </div>
        <div class="cprev ${c.noLeidos > 0 ? "unread" : ""}">
          <span>${esc(prev)}</span>
          ${c.noLeidos > 0
            ? `<span class="cbadge" id="badge-${c._id}">${c.noLeidos}</span>`
            : `<span id="badge-${c._id}" style="display:none"></span>`}
        </div>
      </div>
    </div>`;
}

function filtrarConvs(q) {
  if (!q.trim()) { renderConvList(convs); return; }
  const f = q.toLowerCase();
  renderConvList(convs.filter(c =>
    (c.otro?.nombre || "").toLowerCase().includes(f) ||
    (c.otro?.handle || "").toLowerCase().includes(f)
  ));
}

/* ════════════════════════
   ABRIR CONV
════════════════════════ */
async function abrirConv(convId) {
  convActiva = convId;
  mediaFile  = null;

  document.querySelectorAll(".conv-item").forEach(el =>
    el.classList.toggle("active", el.id === `ci-${convId}`)
  );
  document.getElementById("convPanel").classList.add("off");
  const chatEl = document.getElementById("chatPanel");
  chatEl.classList.remove("off");
  resetTeclado();

  const conv = convs.find(c => c._id === convId);
  const otro = conv?.otro || {};

  const avHdr = otro.avatarTipo === "video"
    ? `<video src="${otro.avatar || ''}" class="hdr-av" autoplay loop muted playsinline onclick="ir('profile.html?handle=${esc(otro.handle)}')"></video>`
    : `<img src="${otro.avatar || getDefaultAv(otro.nombre)}" class="hdr-av" alt="" onclick="ir('profile.html?handle=${esc(otro.handle)}')"/>`;

  chatEl.innerHTML = `
    <div class="chat-hdr">
      <button class="btn-back" onclick="volverALista()"><i class="ri-arrow-left-line"></i></button>
      ${avHdr}
      <div class="hdr-info" onclick="ir('profile.html?handle=${esc(otro.handle)}')">
        <div class="hdr-name">${esc(otro.nombre || "?")}</div>
        <div class="hdr-sub">@${esc(otro.handle || "")}</div>
      </div>
    </div>
    <div class="chat-msgs" id="chatMsgs">
      <div class="msgs-spin">
        <i class="ri-loader-4-line spin" style="font-size:1.4rem;color:var(--green)"></i>
        Cargando mensajes...
      </div>
    </div>
    <div class="typing-row" id="typingRow">
      <div class="typing-dots"><span></span><span></span><span></span></div>
      escribiendo...
    </div>
    <div class="mprev-bar" id="mprevBar"></div>
    <div class="chat-ibar">
      <div class="irow">
        <label for="mediaFInput" class="btn-att" title="Foto/Video">
          <i class="ri-image-add-line"></i>
        </label>
        <input type="file" id="mediaFInput"
               accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
               hidden onchange="onMediaSel(this)"/>
        <textarea class="cinput" id="cinput"
                  placeholder="Escribe un mensaje..." rows="1"
                  oninput="autoResize(this);onTyping()"
                  onkeydown="onKD(event)"></textarea>
        <button class="btn-snd" id="btnSnd" onclick="enviar()">
          <i class="ri-send-plane-fill"></i>
        </button>
      </div>
    </div>`;

  await cargarMensajes(convId);
  marcarLeido(convId, false);
  document.getElementById("cinput")?.focus();
}

function volverALista() {
  convActiva = null;
  setTyping(false);
  resetTeclado();
  document.getElementById("convPanel").classList.remove("off");
  document.getElementById("chatPanel").classList.add("off");
}

/* ════════════════════════
   CARGAR MENSAJES
════════════════════════ */
async function cargarMensajes(convId) {
  const box = document.getElementById("chatMsgs");
  if (!box) return;
  try {
    const res = await fetch(`${API}/messages/${convId}?limite=80`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { const e = await res.json().catch(() => {}); throw new Error(e?.mensaje || `HTTP ${res.status}`); }
    const msgs = await res.json();
    box.innerHTML = "";
    if (!msgs.length) {
      box.innerHTML = `
        <div style="margin:auto;text-align:center;color:var(--text-3);font-size:.84rem;padding:40px 20px">
          <i class="ri-chat-smile-3-line" style="font-size:2.5rem;display:block;margin-bottom:10px;color:var(--green)"></i>
          Sin mensajes aún. ¡Di hola! 👋
        </div>`;
      return;
    }
    renderMensajes(msgs, box);
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  } catch (e) {
    console.error("cargarMensajes:", e);
    box.innerHTML = `<div class="msgs-spin" style="color:var(--red)"><i class="ri-error-warning-line" style="font-size:1.5rem"></i>${esc(e.message)}</div>`;
  }
}

/* ════════════════════════
   RENDER MENSAJES
════════════════════════ */
function renderMensajes(msgs, box) {
  box.innerHTML = "";
  let lastDate = null, lastAutor = null, lastTime = 0;
  msgs.forEach(msg => {
    const mio  = esMio(msg);
    const aId  = getAutorId(msg);
    const dStr = new Date(msg.createdAt).toLocaleDateString("es", { weekday:"long", day:"numeric", month:"long" });
    if (dStr !== lastDate) {
      lastDate = dStr; lastAutor = null; lastTime = 0;
      const sep = document.createElement("div");
      sep.className = "date-sep"; sep.textContent = dStr;
      box.appendChild(sep);
    }
    const t     = new Date(msg.createdAt).getTime();
    const mismo = aId === lastAutor && (t - lastTime) < 120000;
    lastAutor = aId; lastTime = t;
    box.appendChild(buildBubble(msg, mio, !mismo && !mio, !mismo));
  });
}

/* ════════════════════════
   BURBUJA
════════════════════════ */
function buildBubble(msg, mio, showAv, gapTop) {
  const autor     = (msg.autor && typeof msg.autor === "object") ? msg.autor : {};
  const textoMsg  = getTexto(msg);
  const mediaUrl  = msg.mediaUrl  || msg.media?.url  || null;
  const mediaTipo = msg.mediaTipo || msg.media?.tipo  || null;

  const wrap = document.createElement("div");
  wrap.className = `mw ${mio ? "mine" : "theirs"}${gapTop ? " gt" : ""}`;
  wrap.id = `msg-${msg._id}`;

  if (!mio) {
    const isVid = autor.avatarTipo === "video";
    const avEl  = document.createElement(isVid ? "video" : "img");
    avEl.src    = autor.avatar || getDefaultAv(autor.nombre);
    avEl.className = `mav${showAv ? "" : " hidden-av"}`;
    avEl.alt    = "";
    if (isVid) { avEl.autoplay = true; avEl.loop = true; avEl.muted = true; avEl.setAttribute("playsinline", ""); }
    wrap.appendChild(avEl);
  }

  const col = document.createElement("div");
  col.className = "mcol";
  const bbl = document.createElement("div");
  bbl.className = (mediaUrl && !textoMsg) ? "bubble only" : "bubble";

  if (mediaUrl) {
    if (mediaTipo === "video") {
      bbl.innerHTML += `<video src="${mediaUrl}" class="bmedia-vid" controls playsinline onclick="event.stopPropagation()"></video>`;
    } else {
      bbl.innerHTML += `<img src="${mediaUrl}" class="bmedia-img" alt="foto" onclick="verMedia('${mediaUrl}','imagen')"/>`;
    }
  }
  if (textoMsg) {
    const s = document.createElement("span");
    s.textContent = textoMsg;
    bbl.appendChild(s);
  }
  col.appendChild(bbl);

  const meta = document.createElement("div");
  meta.className = "mmeta";
  const hora = document.createElement("span");
  hora.className = "mtime"; hora.textContent = horaFmt(msg.createdAt);
  meta.appendChild(hora);
  if (mio) {
    const st = document.createElement("span");
    st.id        = `st-${msg._id}`;
    st.className = `mst${msg.leido ? " leido" : ""}`;
    st.innerHTML = msg.leido ? `<i class="ri-check-double-line"></i> Visto` : `<i class="ri-check-line"></i>`;
    meta.appendChild(st);
  }
  col.appendChild(meta);
  wrap.appendChild(col);
  return wrap;
}

/* ════════════════════════
   ENVIAR
════════════════════════ */
async function enviar() {
  const inp   = document.getElementById("cinput");
  const texto = inp?.value.trim() || "";
  if (!texto && !mediaFile) return;
  if (!convActiva) return;
  const btn = document.getElementById("btnSnd");
  if (btn) btn.disabled = true;
  emitDejoEsc();
  try {
    const fd = new FormData();
    if (texto)     fd.append("texto", texto);
    if (mediaFile) fd.append("media", mediaFile);
    const res  = await fetch(`${API}/messages/${convActiva}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error");
    if (inp) { inp.value = ""; inp.style.height = "auto"; }
    limpiarPrev();
    appendMsg(data);
    const oid = convs.find(c => c._id === convActiva)?.otro?._id;
    if (socket?.connected && oid)
      socket.emit("enviarMensaje", { convId: convActiva, mensaje: data, destinatarioId: oid });
    actualizarConvEnLista(convActiva, data);
  } catch (e) {
    alert("Error: " + e.message);
  } finally {
    if (btn) btn.disabled = false;
    inp?.focus();
  }
}

function appendMsg(msg) {
  const box = document.getElementById("chatMsgs");
  if (!box) return;
  box.querySelector("[style*='Sin mensajes']")?.remove();
  box.appendChild(buildBubble(msg, esMio(msg), !esMio(msg), true));
  box.scrollTop = box.scrollHeight;
}

/* ════════════════════════
   LEÍDO
════════════════════════ */
async function marcarLeido(convId, silencioso) {
  try {
    await fetch(`${API}/messages/${convId}/read`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
    const b = document.getElementById(`badge-${convId}`);
    if (b) b.style.display = "none";
    document.querySelector(`#ci-${convId} .cprev`)?.classList.remove("unread");
    if (!silencioso && socket?.connected) {
      const oid = convs.find(c => c._id === convId)?.otro?._id;
      if (oid) socket.emit("mensajesLeidos", { convId, destinatarioId: oid });
    }
  } catch (_) {}
}
function marcarMsgsVisto() {
  document.querySelectorAll("[id^='st-']").forEach(el => {
    el.className = "mst leido";
    el.innerHTML = `<i class="ri-check-double-line"></i> Visto`;
  });
}

/* ════════════════════════
   TYPING
════════════════════════ */
function onTyping() {
  if (!socket?.connected || !convActiva) return;
  const oid = convs.find(c => c._id === convActiva)?.otro?._id;
  if (!oid) return;
  socket.emit("escribiendo", { convId: convActiva, nombre: yo.nombre, destinatarioId: oid });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(emitDejoEsc, 1800);
}
function emitDejoEsc() {
  if (!socket?.connected || !convActiva) return;
  const oid = convs.find(c => c._id === convActiva)?.otro?._id;
  if (oid) socket.emit("dejoDeEscribir", { convId: convActiva, destinatarioId: oid });
}
function setTyping(show) {
  const el = document.getElementById("typingRow");
  if (el) el.style.visibility = show ? "visible" : "hidden";
}

/* ════════════════════════
   MEDIA
════════════════════════ */
function onMediaSel(input) {
  const f = input.files[0]; if (!f) return;
  if (f.size > 25 * 1024 * 1024) { alert("Máximo 25MB"); input.value = ""; return; }
  mediaFile = f;
  const url = URL.createObjectURL(f);
  const bar = document.getElementById("mprevBar"); if (!bar) return;
  bar.classList.add("show");
  bar.innerHTML = `
    <div class="pthumb">
      ${f.type.startsWith("video/") ? `<video src="${url}" muted></video>` : `<img src="${url}" alt=""/>`}
      <button class="pthumb-rm" onclick="limpiarPrev()"><i class="ri-close-line"></i></button>
    </div>
    <small>${f.type.startsWith("video/") ? "🎥" : "📷"} ${(f.size / 1024 / 1024).toFixed(1)}MB</small>`;
}
function limpiarPrev() {
  mediaFile = null;
  const bar = document.getElementById("mprevBar");
  const fi  = document.getElementById("mediaFInput");
  if (bar) { bar.classList.remove("show"); bar.innerHTML = ""; }
  if (fi)  fi.value = "";
}
function verMedia(url, tipo) {
  const m = document.getElementById("mmmodal");
  const i = document.getElementById("mminner");
  m.classList.remove("hidden");
  i.innerHTML = tipo === "video"
    ? `<video src="${url}" controls autoplay playsinline onclick="event.stopPropagation()" style="max-width:96vw;max-height:96dvh;border-radius:var(--radius)"></video>`
    : `<img src="${url}" onclick="event.stopPropagation()" alt=""/>`;
}
function cerrarModal() {
  document.getElementById("mmmodal").classList.add("hidden");
  document.getElementById("mminner").innerHTML = "";
}

/* ════════════════════════
   LISTA CONVS
════════════════════════ */
function actualizarConvEnLista(convId, msg) {
  const idx = convs.findIndex(c => c._id === convId);
  if (idx === -1) return;
  convs[idx].ultimoMensaje = msg;
  if (!esMio(msg)) convs[idx].noLeidos = (convs[idx].noLeidos || 0) + 1;
  convs.unshift(convs.splice(idx, 1)[0]);
  renderConvList(convs);
  document.querySelectorAll(".conv-item").forEach(el =>
    el.classList.toggle("active", el.id === `ci-${convActiva}`)
  );
}
function subirBadge(convId) {
  const b = document.getElementById(`badge-${convId}`);
  if (!b) return;
  b.textContent   = String(parseInt(b.textContent || "0") + 1);
  b.style.display = "flex";
  document.querySelector(`#ci-${convId} .cprev`)?.classList.add("unread");
}

/* ════════════════════════
   UTILS
════════════════════════ */
function getTexto(msg) {
  for (const f of ["texto","mensaje","content","body","message","contenido","text","msg","msj"]) {
    const v = msg[f];
    if (v && typeof v === "string" && v.trim() && v !== "undefined" && v !== "null") return v.trim();
  }
  return "";
}
function getDefaultAv(nombre = "?") {
  const l = (nombre || "?")[0].toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="#1c1c1c"/><text x="20" y="26" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#5cdb6f">${l}</text></svg>`
  )}`;
}
function esMio(msg)      { return getAutorId(msg) === yo._id; }
function getAutorId(msg) { return String(msg.autor?._id ?? msg.autor ?? "").trim(); }
function esc(s = "")     { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function horaFmt(f)      { return new Date(f).toLocaleTimeString("es", { hour:"2-digit", minute:"2-digit" }); }
function tiempoCorto(f) {
  const d = (Date.now() - new Date(f)) / 1000;
  if (d < 60)    return "ahora";
  if (d < 3600)  return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return new Date(f).toLocaleDateString("es", { day:"numeric", month:"short" });
}
function autoResize(el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 100) + "px"; }
function onKD(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }
function ir(url) { window.location.href = url; }

document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarModal(); });
document.getElementById("mmmodal")?.addEventListener("click", e => { if (e.target.id === "mmmodal") cerrarModal(); });

cargarConversaciones();
