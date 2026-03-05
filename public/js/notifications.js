const API   = "/api";
const token = localStorage.getItem("fu_token");
const yo    = JSON.parse(localStorage.getItem("fu_usuario") || "null");
if (!token || !yo) window.location.href = "/login.html";

document.getElementById("navPerfil").href = `profile.html?handle=${yo.handle}`;
document.getElementById("bnPerfil")?.setAttribute("href", `profile.html?handle=${yo.handle}`);

/* ── Sidebar user ── */
(function () {
  const el = document.getElementById("sidebarUser");
  if (!el) return;
  const av = yo.avatarTipo === "video"
    ? `<video src="${yo.avatar}" autoplay loop muted playsinline style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0"></video>`
    : `<img src="${yo.avatar}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0" alt=""/>`;
  el.innerHTML = `${av}<div style="min-width:0"><strong>${esc(yo.nombre)}</strong><small>@${esc(yo.handle)}</small></div>`;
})();

/* ════════════════════════
   CARGAR NOTIFS
════════════════════════ */
async function cargarNotificaciones() {
  const lista = document.getElementById("notifList");
  lista.innerHTML = `
    <div class="empty-state">
      <i class="ri-loader-4-line spin" style="font-size:2rem;color:var(--green)"></i>
      <h3>Cargando...</h3>
    </div>`;
  try {
    const res = await fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.mensaje || `HTTP ${res.status}`);
    }
    const data = await res.json();

    if (!data.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <i class="ri-notification-off-line" style="font-size:3rem;color:var(--text-3)"></i>
          <h3>Sin notificaciones</h3>
          <p>Cuando alguien interactúe contigo<br/>aparecerá aquí.</p>
        </div>`;
      return;
    }

    lista.innerHTML = data.map(n => renderNotif(n)).join("");
  } catch (e) {
    lista.innerHTML = `
      <div class="empty-state">
        <i class="ri-error-warning-line" style="font-size:3rem;color:var(--red)"></i>
        <h3>Error al cargar</h3>
        <p>${esc(e.message)}</p>
      </div>`;
  }
}

/* ════════════════════════
   RENDER NOTIF
════════════════════════ */
function renderNotif(n) {
  const tipos = {
    like:    { icon:"ri-heart-fill",       css:"tipo-like",    label:"le dio like a tu post" },
    comment: { icon:"ri-chat-1-fill",      css:"tipo-comment", label:"comentó tu post" },
    follow:  { icon:"ri-user-follow-fill", css:"tipo-follow",  label:"comenzó a seguirte" },
    mention: { icon:"ri-at-line",          css:"tipo-mention", label:"te mencionó" },
    repost:  { icon:"ri-repeat-2-fill",    css:"tipo-repost",  label:"reposteó tu post" },
  };

  const cfg    = tipos[n.tipo] || { icon:"ri-notification-4-fill", css:"tipo-comment", label:"interactuó contigo" };
  const origen = n.origen || {};   // ya viene populado: { nombre, handle, avatar, avatarTipo }
  const post   = n.post   || {};   // populado: { texto, tipo }
  const leida  = n.leida ? "" : "no-leida";

  const avEl = origen.avatarTipo === "video"
    ? `<video src="${origen.avatar||''}" autoplay loop muted playsinline
           style="width:42px;height:42px;border-radius:50%;object-fit:cover"></video>`
    : `<img src="${origen.avatar || getDefaultAv(origen.nombre)}"
            style="width:42px;height:42px;border-radius:50%;object-fit:cover" alt=""/>`;

  const destino = origen.handle
    ? `profile.html?handle=${esc(origen.handle)}`
    : "/";

  const extracto = post.texto
    ? `<span style="color:var(--text-3)"> · "${esc(post.texto.slice(0,60))}${post.texto.length>60?"…":""}"</span>`
    : "";

  return `
    <div class="notif-item ${leida}" onclick="irNotif('${destino}','${n._id}',this)">
      <div class="notif-icon-wrap">
        ${avEl}
        <div class="notif-type-icon ${cfg.css}">
          <i class="${cfg.icon}"></i>
        </div>
      </div>
      <div class="notif-body">
        <p class="notif-texto">
          <strong>${esc(origen.nombre || "Alguien")}</strong>
          ${cfg.label}
          ${extracto}
        </p>
        <p class="notif-time">${tiempoRelativo(n.createdAt)}</p>
      </div>
    </div>`;
}

/* ════════════════════════
   ACCIONES
════════════════════════ */
async function irNotif(url, notifId, el) {
  if (el.classList.contains("no-leida")) {
    el.classList.remove("no-leida");
    try {
      // ✅ ruta correcta: /:id/leer
      await fetch(`${API}/notifications/${notifId}/leer`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (_) {}
  }
  window.location.href = url;
}

async function leerTodas() {
  const btn = document.getElementById("btnLeerTodo");
  btn.disabled  = true;
  btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Marcando...';
  try {
    // ✅ ruta correcta: /leer
    const res = await fetch(`${API}/notifications/leer`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.mensaje || `HTTP ${res.status}`);
    }
    document.querySelectorAll(".notif-item.no-leida")
      .forEach(el => el.classList.remove("no-leida"));
  } catch (e) {
    alert("Error: " + e.message);
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="ri-check-double-line"></i> Marcar todas leídas';
  }
}

/* ════════════════════════
   UTILS
════════════════════════ */
function getDefaultAv(nombre = "?") {
  const l = (nombre || "?")[0].toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="#1c1c1c"/><text x="20" y="26" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#5cdb6f">${l}</text></svg>`
  )}`;
}
function esc(s = "") {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function tiempoRelativo(f) {
  const d = (Date.now() - new Date(f)) / 1000;
  if (d < 60)     return "ahora";
  if (d < 3600)   return `${Math.floor(d / 60)}m`;
  if (d < 86400)  return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return new Date(f).toLocaleDateString("es", { day:"numeric", month:"short" });
}

cargarNotificaciones();
