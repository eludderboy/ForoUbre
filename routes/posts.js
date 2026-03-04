const express  = require("express");
const multer   = require("multer");
const mongoose = require("mongoose");
const Post     = require("../models/Post");
const User     = require("../models/User");
const Comment  = require("../models/Comment");
const auth     = require("../middleware/authMiddleware");
const { uploadFile } = require("../utils/gridfs");

const router = express.Router();

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

/* ════════════════════════════════════════════════════
   GET /  — Feed paginado
════════════════════════════════════════════════════ */
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
      .populate("autor", "nombre handle avatar avatarTipo verificado personalizacion")
      .lean();

    const uid = req.usuario._id.toString();

    const result = posts.map(p => {
      const likes   = p.likes   || [];
      const reposts = p.reposts || [];
      const opciones= p.opciones|| [];
      return {
        ...p,
        likes, reposts, opciones,
        yaLike:   likes.some(id   => id.toString() === uid),
        yaRepost: reposts.some(id => id.toString() === uid),
        miVoto: p.tipo === "poll"
          ? (opciones.find(op =>
              (op.votos || []).some(v => v.toString() === uid)
            )?._id?.toString() || null)
          : null
      };
    });

    res.json(result);
  } catch (e) {
    console.error("GET /posts:", e);
    res.status(500).json({ mensaje: e.message });
  }
});

/* ════════════════════════════════════════════════════
   POST /  — Crear post
════════════════════════════════════════════════════ */
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
      try { opciones = JSON.parse(req.body.opciones || "[]"); } catch (_) {}
      opciones = opciones.filter(o => typeof o === "string" && o.trim());

      if (opciones.length < 2) return res.status(400).json({ mensaje: "Mínimo 2 opciones" });
      if (opciones.length > 6) return res.status(400).json({ mensaje: "Máximo 6 opciones" });

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

    const populated = await post.populate("autor", "nombre handle avatar avatarTipo verificado personalizacion");
    res.status(201).json({ ...populated.toObject(), yaLike: false, yaRepost: false, miVoto: null });

  } catch (e) {
    if (e.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ mensaje: "Archivo muy grande (máx 50MB)" });
    console.error("POST /posts:", e);
    res.status(500).json({ mensaje: "Error al publicar" });
  }
});

/* ════════════════════════════════════════════════════
   POST /:id/like
════════════════════════════════════════════════════ */
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
  } catch (e) {
    res.status(500).json({ mensaje: "Error" });
  }
});

/* ════════════════════════════════════════════════════
   POST /:id/repost
════════════════════════════════════════════════════ */
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
  } catch (e) {
    res.status(500).json({ mensaje: "Error" });
  }
});

/* ════════════════════════════════════════════════════
   POST /:id/votar — Votar en encuesta
════════════════════════════════════════════════════ */
router.post("/:id/votar", auth, async (req, res) => {
  try {
    const { opcion } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post)             return res.status(404).json({ mensaje: "Post no encontrado" });
    if (post.tipo !== "poll") return res.status(400).json({ mensaje: "No es una encuesta" });

    // Quitar voto anterior si existe (permite cambiar voto)
    post.opciones.forEach(op => {
      op.votos = op.votos.filter(v => v.toString() !== req.usuario._id.toString());
    });

    const opt = post.opciones.id(opcion);
    if (!opt) return res.status(404).json({ mensaje: "Opción no encontrada" });

    opt.votos.push(req.usuario._id);
    await post.save();

    res.json({ opciones: post.opciones, miVoto: opcion });
  } catch (e) {
    console.error("POST /votar:", e);
    res.status(500).json({ mensaje: "Error al votar" });
  }
});

/* ════════════════════════════════════════════════════
   DELETE /:id
════════════════════════════════════════════════════ */
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ mensaje: "No encontrado" });

    if (post.autor.toString() !== req.usuario._id.toString())
      return res.status(403).json({ mensaje: "No autorizado" });

    // Borrar comentarios asociados también
    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: "Error" });
  }
});

/* ════════════════════════════════════════════════════
   GET /:id/comments — Ver comentarios
════════════════════════════════════════════════════ */
router.get("/:id/comments", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ mensaje: "Post no encontrado" });

    const comentarios = await Comment.find({ post: req.params.id })
      .populate("autor", "nombre handle avatar avatarTipo verificado personalizacion")
      .sort({ createdAt: 1 })
      .lean();

    res.json(comentarios);
  } catch (e) {
    console.error("GET /comments:", e);
    res.status(500).json({ mensaje: e.message });
  }
});

/* POST /comments/:id/like */
router.post("/comments/:id/like", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ mensaje: "Comentario no encontrado" });
    const uid = req.usuario._id.toString();
    const idx = (comment.likes||[]).findIndex(l => l.toString() === uid);
    if (idx === -1) comment.likes.push(req.usuario._id);
    else            comment.likes.splice(idx, 1);
    await comment.save();
    res.json({ yaLike: idx === -1, likes: comment.likes.length });
  } catch(e) {
    res.status(500).json({ mensaje: e.message });
  }
});

/* ════════════════════════════════════════════════════
   POST /:id/comments — Crear comentario
════════════════════════════════════════════════════ */
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto?.trim())
      return res.status(400).json({ mensaje: "El comentario no puede estar vacío" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ mensaje: "Post no encontrado" });

    // 1. Crear en colección Comment
    const comment = await Comment.create({
      post:  post._id,
      autor: req.usuario._id,
      texto: texto.trim()
    });

    // 2. Solo guardar el _id en el array del post
    await Post.findByIdAndUpdate(post._id, {
      $push: { comentarios: comment._id }
    });

    // 3. Devolver con autor poblado
    const populated = await Comment.findById(comment._id)
      .populate("autor", "nombre handle avatar avatarTipo verificado personalizacion")
      .lean();

    res.status(201).json(populated);
  } catch (e) {
    console.error("POST /comments:", e);
    res.status(500).json({ mensaje: e.message });
  }
});

module.exports = router;
