// ===== CONFIG =====
// URL relativa — funciona en Replit, localhost y cualquier dominio
const API = "/api";

// ===== AUTH GUARD =====
const token   = localStorage.getItem("fu_token");
const usuario = JSON.parse(localStorage.getItem("fu_usuario") || "null");

if (!token || !usuario) {
  window.location.href = "/login.html";
}

// ===== ESTADO =====
let pagina      = 1;
let cargando    = false;
let hayMas      = true;
let imagenFile  = null;

// ===== HEADERS =====
const headers = () => ({
  Authorization: `Bearer ${token}`
});

// ===== INIT =====
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("myAvatar").src = usuario.avatar;
  document.getElementById("sidebarUser").innerHTML = `
    <img src="${usuario.avatar}" alt="avatar"/>
    <div>
      <strong>${usuario.nombre}</strong>
      <small>@${usuario.handle}</small>
    </div>
  `;

  cargarPosts();
  setupEventListeners();
});

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.getElementById("postInput").addEventListener("input", function () {
    const rest = 280 - this.value.length;
    const el   = document.getElementById("charCount");
    el.textContent = rest;
    el.style.color = rest < 20 ? "#e0245e" : rest < 50 ? "#f4a426" : "#555";
  });

  document.getElementById("imageInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    imagenFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("imagePreview").src = ev.target.result;
      document.getElementById("imagePreviewBox").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("btnRemoveImage").addEventListener("click", () => {
    imagenFile = null;
    document.getElementById("imageInput").value = "";
    document.getElementById("imagePreview").src = "";
    document.getElementById("imagePreviewBox").classList.add("hidden");
  });

  document.getElementById("btnPost").addEventListener("click", publicar);
  document.getElementById("postInput").addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") publicar();
  });

  document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login.html";
  });

  document.getElementById("btnLoadMore").addEventListener("click", () => {
    pagina++;
    cargarPosts(false);
  });

  window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
      if (!cargando && hayMas) { pagina++; cargarPosts(false); }
    }
  });
}

// ===== CARGAR POSTS =====
async function cargarPosts(reset = true) {
  if (cargando) return;
  cargando = true;

  if (reset) {
    pagina = 1;
    hayMas = true;
    document.getElementById("feed").innerHTML = `<div class="loading">Cargando posts...</div>`;
  }

  try {
    const res = await fetch(`${API}/posts?pagina=${pagina}&limite=20`, {
      headers: headers()
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = "/login.html";
      return;
    }

    const posts = await res.json();
    if (reset) document.getElementById("feed").innerHTML = "";

    if (posts.length === 0 && reset) {
      document.getElementById("feed").innerHTML = `
        <div class="empty-state">
          <div>🐄</div>
          <p>No hay posts todavía.<br/>¡Sé el primero en publicar!</p>
        </div>
      `;
    }

    posts.forEach(p => renderPost(p, false));

    if (posts.length < 20) {
      hayMas = false;
      document.getElementById("loadMoreBox").classList.add("hidden");
    } else {
      document.getElementById("loadMoreBox").classList.remove("hidden");
    }

  } catch (err) {
    document.getElementById("feed").innerHTML = `
      <div class="loading" style="color:#e0245e;">
        ❌ Error al conectar con el servidor.
      </div>
    `;
  } finally {
    cargando = false;
  }
}

// ===== RENDER POST =====
function renderPost(post, prepend = true) {
  const feed   = document.getElementById("feed");
  const esMio  = post.autor._id === usuario._id || post.autor === usuario._id;
  const tiempo = tiempoRelativo(post.createdAt);
  // URL relativa para imágenes también
  const imagen = post.imagen
    ? `<img src="${post.imagen}" class="post-img" alt="imagen"
             onclick="verImagen('${post.imagen}')" loading="lazy"/>`
    : "";

  const el = document.createElement("div");
  el.className = "post-card";
  el.id        = `post-${post._id}`;
  el.innerHTML = `
    <img src="${post.autor.avatar || 'https://api.dicebear.com/7.x/thumbs/svg?seed=default'}"
         class="avatar" alt="avatar"/>
    <div class="post-body">
      <div class="post-user">
        <strong>${escHtml(post.autor.nombre)}</strong>
        <span class="handle">@${escHtml(post.autor.handle)}</span>
        <span class="post-time">· ${tiempo}</span>
      </div>
      ${post.texto ? `<p class="post-text">${escHtml(post.texto)}</p>` : ""}
      ${imagen}
      <div class="post-footer">
        <button class="post-btn ${post.yaLike ? 'liked' : ''}"
                onclick="toggleLike('${post._id}', this)">
          ${post.yaLike ? '❤️' : '🤍'}
          <span class="like-count">${post.totalLikes}</span>
        </button>
        <button class="post-btn">💬 <span>0</span></button>
        <button class="post-btn">🔁</button>
        ${esMio ? `
          <button class="post-btn delete" style="margin-left:auto"
                  onclick="eliminarPost('${post._id}')">🗑️</button>
        ` : ""}
      </div>
    </div>
  `;

  if (prepend) {
    const empty = feed.querySelector(".empty-state");
    if (empty) empty.remove();
    feed.prepend(el);
  } else {
    feed.appendChild(el);
  }
}

// ===== PUBLICAR =====
async function publicar() {
  const texto = document.getElementById("postInput").value.trim();
  const btn   = document.getElementById("btnPost");
  if (!texto && !imagenFile) return;

  btn.textContent = "Publicando...";
  btn.disabled    = true;

  try {
    const formData = new FormData();
    if (texto)      formData.append("texto",  texto);
    if (imagenFile) formData.append("imagen", imagenFile);

    const res  = await fetch(`${API}/posts`, {
      method:  "POST",
      headers: headers(),
      body:    formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje);

    document.getElementById("postInput").value     = "";
    document.getElementById("charCount").textContent = "280";
    document.getElementById("charCount").style.color = "#555";
    imagenFile = null;
    document.getElementById("imageInput").value    = "";
    document.getElementById("imagePreview").src    = "";
    document.getElementById("imagePreviewBox").classList.add("hidden");

    renderPost(data, true);
  } catch (err) {
    alert("Error al publicar: " + err.message);
  } finally {
    btn.textContent = "Publicar";
    btn.disabled    = false;
  }
}

// ===== TOGGLE LIKE =====
async function toggleLike(postId, btn) {
  try {
    const res  = await fetch(`${API}/posts/${postId}/like`, {
      method:  "POST",
      headers: headers()
    });
    const data = await res.json();
    btn.classList.toggle("liked", data.yaLike);
    btn.innerHTML = `${data.yaLike ? '❤️' : '🤍'} <span class="like-count">${data.totalLikes}</span>`;
  } catch (err) {
    console.error(err);
  }
}

// ===== ELIMINAR =====
async function eliminarPost(postId) {
  if (!confirm("¿Eliminar este post?")) return;
  try {
    const res = await fetch(`${API}/posts/${postId}`, {
      method:  "DELETE",
      headers: headers()
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.mensaje); }
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.style.cssText = "opacity:0;transform:scale(0.97);transition:all 0.3s";
      setTimeout(() => el.remove(), 300);
    }
  } catch (err) { alert("Error: " + err.message); }
}

// ===== MODAL IMAGEN =====
function verImagen(src) {
  document.getElementById("modalImgSrc").src = src;
  document.getElementById("modalImg").classList.add("active");
}
function cerrarModal() {
  document.getElementById("modalImg").classList.remove("active");
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });

// ===== UTILS =====
function escHtml(str = "") {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function tiempoRelativo(fecha) {
  const diff = (Date.now() - new Date(fecha)) / 1000;
  if (diff < 60)    return "ahora";
  if (diff < 3600)  return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return new Date(fecha).toLocaleDateString("es", { day:"numeric", month:"short" });
}