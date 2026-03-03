const express      = require("express");
const multer       = require("multer");
const Video        = require("../models/Video");
const VideoComment = require("../models/VideoComment");
const User         = require("../models/User");
const auth         = require("../middleware/authMiddleware");
const { uploadFile, deleteFile } = require("../utils/gridfs");

const router = express.Router();

const uploadVideo = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    const ok = ["video/mp4","video/webm","video/quicktime"].includes(file.mimetype);
    cb(null, ok);
  }
});

// ── Helpers ──
const withMeta = (v, uid) => ({
  ...v,
  yaLike:           v.likes.some(id => id.toString() === uid),
  yaCompartio:      v.compartidos.some(id => id.toString() === uid),
  totalLikes:       v.likes.length,
  totalCompartidos: v.compartidos.length
});

// ── GET /api/videos ── feed
router.get("/", auth, async (req, res) => {
  try {
    const pagina = Math.max(parseInt(req.query.pagina) || 1, 1);
    const limite = Math.min(parseInt(req.query.limite) || 10, 30);

    const videos = await Video.find()
      .sort({ createdAt: -1 })
      .skip((pagina - 1) * limite)
      .limit(limite)
      .populate("autor", "nombre handle avatar avatarTipo personalizacion")
      .lean();

    const uid    = req.usuario._id.toString();
    const result = await Promise.all(videos.map(async v => ({
      ...withMeta(v, uid),
      totalComments: await VideoComment.countDocuments({ video: v._id })
    })));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── GET /api/videos/user/:handle ── videos de un usuario
router.get("/user/:handle", auth, async (req, res) => {
  try {
    const user = await User.findOne({ handle: req.params.handle.toLowerCase() });
    if (!user) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const videos = await Video.find({ autor: user._id })
      .sort({ createdAt: -1 })
      .populate("autor", "nombre handle avatar avatarTipo personalizacion")
      .lean();

    const uid = req.usuario._id.toString();
    res.json(videos.map(v => ({
      ...withMeta(v, uid),
      totalComments: 0
    })));
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── GET /api/videos/compartidos/:handle ── videos compartidos
router.get("/compartidos/:handle", auth, async (req, res) => {
  try {
    const user = await User.findOne({ handle: req.params.handle.toLowerCase() });
    if (!user) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const videos = await Video.find({ compartidos: user._id })
      .sort({ createdAt: -1 })
      .populate("autor", "nombre handle avatar avatarTipo personalizacion")
      .lean();

    const uid = req.usuario._id.toString();
    res.json(videos.map(v => ({ ...withMeta(v, uid), totalComments: 0 })));
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── POST /api/videos/comments/:commentId/like ── (antes del /:id)
router.post("/comments/:commentId/like", auth, async (req, res) => {
  try {
    const comment = await VideoComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ mensaje: "No encontrado" });

    const uid = req.usuario._id.toString();
    const idx = comment.likes.map(String).indexOf(uid);
    if (idx === -1) comment.likes.push(req.usuario._id);
    else            comment.likes.splice(idx, 1);

    await comment.save();
    res.json({ yaLike: idx === -1, totalLikes: comment.likes.length });
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── POST /api/videos ── subir
router.post("/", auth, uploadVideo.single("video"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ mensaje: "No se envió ningún video" });

    const fileId = await uploadFile(req.file);
    const video  = await Video.create({
      autor:       req.usuario._id,
      url:         `/api/images/${fileId}`,
      descripcion: (req.body.descripcion || "").trim().slice(0, 300)
    });

    const populated = await video.populate(
      "autor", "nombre handle avatar avatarTipo personalizacion"
    );
    res.status(201).json({
      ...populated.toObject(),
      yaLike: false, yaCompartio: false,
      totalLikes: 0, totalCompartidos: 0, totalComments: 0
    });
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ mensaje: "Máximo 100MB" });
    console.error(err);
    res.status(500).json({ mensaje: "Error al subir" });
  }
});

// ── DELETE /api/videos/:id ──
router.delete("/:id", auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ mensaje: "No encontrado" });
    if (video.autor.toString() !== req.usuario._id.toString())
      return res.status(403).json({ mensaje: "No autorizado" });

    if (video.url?.startsWith("/api/images/")) await deleteFile(video.url);
    await video.deleteOne();
    await VideoComment.deleteMany({ video: req.params.id });
    res.json({ mensaje: "Eliminado" });
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── POST /api/videos/:id/like ──
router.post("/:id/like", auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ mensaje: "No encontrado" });

    const uid = req.usuario._id.toString();
    const idx = video.likes.map(String).indexOf(uid);
    if (idx === -1) video.likes.push(req.usuario._id);
    else            video.likes.splice(idx, 1);

    await video.save();
    res.json({ yaLike: idx === -1, totalLikes: video.likes.length });
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── POST /api/videos/:id/share ──
router.post("/:id/share", auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ mensaje: "No encontrado" });

    const uid = req.usuario._id.toString();
    if (!video.compartidos.map(String).includes(uid))
      video.compartidos.push(req.usuario._id);

    await video.save();
    res.json({ yaCompartio: true, totalCompartidos: video.compartidos.length });
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── POST /api/videos/:id/view ──
router.post("/:id/view", auth, async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc: { reproducciones: 1 } });
    res.json({ ok: true });
  } catch (_) { res.json({ ok: false }); }
});

// ── GET /api/videos/:id/comments ──
router.get("/:id/comments", auth, async (req, res) => {
  try {
    const comments = await VideoComment.find({ video: req.params.id })
      .sort({ createdAt: 1 })
      .populate("autor", "nombre handle avatar avatarTipo personalizacion")
      .lean();

    const uid = req.usuario._id.toString();
    res.json(comments.map(c => ({
      ...c,
      yaLike:     c.likes.some(id => id.toString() === uid),
      totalLikes: c.likes.length
    })));
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── POST /api/videos/:id/comments ──
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ mensaje: "Vacío" });
    if (texto.length > 280) return res.status(400).json({ mensaje: "Máximo 280" });

    const comment   = await VideoComment.create({
      video: req.params.id,
      autor: req.usuario._id,
      texto: texto.trim()
    });
    const populated = await comment.populate(
      "autor", "nombre handle avatar avatarTipo personalizacion"
    );
    res.status(201).json({ ...populated.toObject(), yaLike: false, totalLikes: 0 });
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

module.exports = router;