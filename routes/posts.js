const express = require("express");
const multer  = require("multer");
const mongoose = require("mongoose");
const Post     = require("../models/Post");
const User     = require("../models/User");
const Comment = require("../models/Comment"); // ← añadir arriba del archivo
const auth     = require("../middleware/authMiddleware");
const { uploadFile } = require("../utils/gridfs");

const router = express.Router();

// Multer: múltiples campos
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg","image/png","image/gif","image/webp",
      "video/mp4","video/webm",
      "audio/mpeg","audio/mp3","audio/ogg","audio/wav","audio/webm"
    ].includes(file.mimetype);
    cb(null, ok);
  }
});

const uploadFields = upload.fields([
  { name: "media",    maxCount: 1  },
  { name: "imagenes", maxCount: 10 },
  { name: "audio",    maxCount: 1  }
]);

/* ── GET / — feed ── */
// Reemplaza el bloque GET / en routes/posts.js
router.get("/", auth, async (req, res) => {
  try {
    const pagina    = Math.max(parseInt(req.query.pagina) || 1, 1);
    const limite    = Math.min(parseInt(req.query.limite) || 20, 50);
    const comunidad = req.query.comunidad || null;
    const filtro    = comunidad ? { comunidad } : {};

    const posts = await Post.find(filtro)
      .sort({ createdAt: -1 })
      .skip((pagina - 1) * limite)
      .limit(limite)
      .populate("autor", "nombre handle avatar avatarTipo verificado")
      .lean();

    const uid = req.usuario._id.toString();

    const result = posts.map(p => {
      // ← || [] para posts viejos que no tienen esos campos
      const likes   = p.likes   || [];
      const reposts = p.reposts || [];
      const opciones= p.opciones|| [];

      return {
        ...p,
        likes, reposts, opciones,
        yaLike:   likes.some(id  => id.toString()  === uid),
        yaRepost: reposts.some(id => id.toString() === uid),
        miVoto: p.tipo === "poll"
          ? (opciones.find(op =>
              (op.votos || []).some(v => v.toString() === uid)
            )?._id?.toString() || null)
          : null
      };
    });

    res.json(result);
  } catch(e) {
    console.error("GET /posts:", e);
    res.status(500).json({ mensaje: e.message });
  }
});

/* ── POST / — crear post ── */
router.post("/", auth, uploadFields, async (req, res) => {
  try {
    const tipo  = req.body.tipo  || "normal";
    const texto = (req.body.texto || "").trim();
    const nsfw  = req.body.nsfw === "true";
    let post;

    /* ── SLIDESHOW ── */
    if (tipo === "slideshow") {
      const imgFiles = req.files?.imagenes || [];
      if (!imgFiles.length && !texto)
        return res.status(400).json({ mensaje: "Añade al menos una imagen" });

      const imagenes = await Promise.all(
        imgFiles.map(async f => {
          const id = await uploadFile(f);
          return `/api/images/${id}`;
        })
      );

      let audioUrl = null;
      if (req.files?.audio?.[0]) {
        const aid = await uploadFile(req.files.audio[0]);
        audioUrl  = `/api/images/${aid}`;
      }

      post = await Post.create({
        autor: req.usuario._id, texto, tipo: "slideshow",
        imagenes, audioUrl, nsfw
      });
    }

    /* ── POLL ── */
    else if (tipo === "poll") {
      if (!texto) return res.status(400).json({ mensaje: "La encuesta necesita una pregunta" });

      let opciones = [];
      try { opciones = JSON.parse(req.body.opciones || "[]"); } catch(_) {}
      opciones = opciones.filter(o => typeof o === "string" && o.trim());

      if (opciones.length < 2)
        return res.status(400).json({ mensaje: "Mínimo 2 opciones" });
      if (opciones.length > 6)
        return res.status(400).json({ mensaje: "Máximo 6 opciones" });

      post = await Post.create({
        autor: req.usuario._id, texto, tipo: "poll",
        opciones: opciones.map(t => ({ texto: t.trim(), votos: [] }))
      });
    }

    /* ── NORMAL ── */
    else {
      let mediaUrl  = null;
      let mediaTipo = null;
      if (req.files?.media?.[0]) {
        const f   = req.files.media[0];
        const id  = await uploadFile(f);
        mediaUrl  = `/api/images/${id}`;
        mediaTipo = f.mimetype.startsWith("video/") ? "video" : "imagen";
      }
      if (!texto && !mediaUrl)
        return res.status(400).json({ mensaje: "Post vacío" });

      post = await Post.create({
        autor: req.usuario._id, texto, tipo: "normal",
        mediaUrl, mediaTipo, nsfw
      });
    }

    const populated = await post.populate("autor", "nombre handle avatar avatarTipo personalizacion verificado");
    res.status(201).json({ ...populated.toObject(), yaLike: false, yaRepost: false, miVoto: null });
  } catch(e) {
    if (e.code === "LIMIT_FILE_SIZE") return res.status(400).json({ mensaje: "Archivo muy grande (máx 50MB)" });
    console.error("POST /posts:", e);
    res.status(500).json({ mensaje: "Error al publicar" });
  }
});

/* ── POST /:id/votar — votar en encuesta ── */
router.post("/:id/votar", auth, async (req, res) => {
  try {
    const { opcion } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post)           return res.status(404).json({ mensaje: "Post no encontrado" });
    if (post.tipo !== "poll") return res.status(400).json({ mensaje: "No es una encuesta" });

    // Quitar voto anterior (cambiar voto)
    post.opciones.forEach(op => {
      op.votos = op.votos.filter(v => v.toString() !== req.usuario._id.toString());
    });

    // Registrar nuevo voto
    const opt = post.opciones.id(opcion);
    if (!opt) return res.status(404).json({ mensaje: "Opción no encontrada" });
    opt.votos.push(req.usuario._id);

    await post.save();

    const miVoto = opcion;
    res.json({ opciones: post.opciones, miVoto });
  } catch(e) {
    console.error("POST /votar:", e);
    res.status(500).json({ mensaje: "Error al votar" });
  }
});

/* ── POST /:id/like ── */
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ mensaje: "No encontrado" });
    const uid = req.usuario._id.toString();
    const idx = post.likes.findIndex(l => l.toString() === uid);
    if (idx === -1) post.likes.push(req.usuario._id);
    else            post.likes.splice(idx, 1);
    await post.save();
    res.json({ likes: post.likes.length, yaLike: idx === -1 });
  } catch(e) {
    res.status(500).json({ mensaje: "Error" });
  }
});

/* ── POST /:id/repost ── */
router.post("/:id/repost", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ mensaje: "No encontrado" });
    const uid = req.usuario._id.toString();
    const idx = post.reposts.findIndex(r => r.toString() === uid);
    if (idx === -1) post.reposts.push(req.usuario._id);
    else            post.reposts.splice(idx, 1);
    await post.save();
    res.json({ reposts: post.reposts.length, yaRepost: idx === -1 });
  } catch(e) {
    res.status(500).json({ mensaje: "Error" });
  }
});

/* ── DELETE /:id ── */
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ mensaje: "No encontrado" });
    if (post.autor.toString() !== req.usuario._id.toString())
      return res.status(403).json({ mensaje: "No autorizado" });
    await post.deleteOne();
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── GET comentarios de un post ──
router.get("/:id/comments", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: "comentarios.autor",
        select: "nombre handle avatar avatarTipo verificado"
      })
      .lean();

    if (!post) return res.status(404).json({ mensaje: "Post no encontrado" });

    // Ordenar del más antiguo al más nuevo
    const comentarios = (post.comentarios || []).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.json(comentarios);
  } catch (e) {
    console.error("GET comments:", e);
    res.status(500).json({ mensaje: e.message });
  }
});

// ── POST nuevo comentario ──
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ mensaje: "El comentario no puede estar vacío" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ mensaje: "Post no encontrado" });

    const comentario = {
      autor:     req.usuario._id,
      texto:     texto.trim(),
      createdAt: new Date()
    };

    post.comentarios = post.comentarios || [];
    post.comentarios.push(comentario);
    await post.save();

    // Devolver el comentario con datos del autor
    const postActualizado = await Post.findById(req.params.id)
      .populate({
        path: "comentarios.autor",
        select: "nombre handle avatar avatarTipo verificado"
      })
      .lean();

    const nuevoComentario = postActualizado.comentarios[postActualizado.comentarios.length - 1];
    res.status(201).json(nuevoComentario);
  } catch (e) {
    console.error("POST comment:", e);
    res.status(500).json({ mensaje: e.message });
  }
});

module.exports = router;
