const express  = require("express");
const multer   = require("multer");
const Message      = require("../models/Message");
const Conversation = require("../models/Conversation");
const User         = require("../models/User");
const auth         = require("../middleware/authMiddleware");
const { uploadFile } = require("../utils/gridfs");

const router = express.Router();

const uploadMedia = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg","image/png","image/gif","image/webp",
      "video/mp4","video/webm"
    ].includes(file.mimetype);
    cb(null, ok);
  }
});

// ── GET /api/messages ── lista de conversaciones
router.get("/", auth, async (req, res) => {
  try {
    const convs = await Conversation.find({ participantes: req.usuario._id })
      .sort({ updatedAt: -1 })
      .populate("participantes", "nombre handle avatar avatarTipo personalizacion")
      .populate("ultimoMensaje")
      .lean();

    const result = await Promise.all(convs.map(async conv => {
      const otro    = conv.participantes.find(p => p._id.toString() !== req.usuario._id.toString());
      const noLeidos = await Message.countDocuments({
        conversacion: conv._id,
        autor:        { $ne: req.usuario._id },
        leido:        false
      });
      return { ...conv, otro, noLeidos };
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── POST /api/messages ── crear/encontrar conversación
router.post("/", auth, async (req, res) => {
  try {
    const { usuarioId } = req.body;
    if (!usuarioId) return res.status(400).json({ mensaje: "usuarioId requerido" });
    if (usuarioId === req.usuario._id.toString())
      return res.status(400).json({ mensaje: "No puedes chatear contigo mismo" });

    const otro = await User.findById(usuarioId);
    if (!otro) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    let conv = await Conversation.findOne({
      participantes: { $all: [req.usuario._id, usuarioId] }
    }).populate("participantes", "nombre handle avatar avatarTipo personalizacion");

    if (!conv) {
      conv = await Conversation.create({ participantes: [req.usuario._id, usuarioId] });
      conv = await conv.populate("participantes", "nombre handle avatar avatarTipo personalizacion");
    }

    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── GET /api/messages/:convId ── mensajes paginados
router.get("/:convId", auth, async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.convId, participantes: req.usuario._id
    });
    if (!conv) return res.status(403).json({ mensaje: "No autorizado" });

    const pagina = Math.max(parseInt(req.query.pagina) || 1, 1);
    const limite = Math.min(parseInt(req.query.limite) || 50, 100);

    const messages = await Message.find({ conversacion: req.params.convId })
      .sort({ createdAt: -1 })
      .skip((pagina - 1) * limite)
      .limit(limite)
      .populate("autor", "nombre handle avatar avatarTipo")
      .lean();

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── POST /api/messages/:convId ── enviar mensaje (con media opcional)
router.post("/:convId", auth, uploadMedia.single("media"), async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.convId, participantes: req.usuario._id
    });
    if (!conv) return res.status(403).json({ mensaje: "No autorizado" });

    const { texto } = req.body;
    let media = null;

    if (req.file) {
      const fileId = await uploadFile(req.file);
      media = {
        url:  `/api/images/${fileId}`,
        tipo: req.file.mimetype.startsWith("video/") ? "video" : "imagen"
      };
    }

    if (!texto?.trim() && !media)
      return res.status(400).json({ mensaje: "Mensaje vacío" });

    const msg = await Message.create({
      conversacion: req.params.convId,
      autor:        req.usuario._id,
      texto:        texto?.trim() || "",
      media
    });

    await Conversation.findByIdAndUpdate(
      req.params.convId,
      { ultimoMensaje: msg._id },
      { timestamps: false }
    );
    await Conversation.findByIdAndUpdate(req.params.convId, { updatedAt: new Date() });

    const populated = await msg.populate("autor", "nombre handle avatar avatarTipo");
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ mensaje: "Máximo 25MB" });
    console.error(err);
    res.status(500).json({ mensaje: "Error al enviar" });
  }
});

// ── PUT /api/messages/:convId/read ── marcar como leído
router.put("/:convId/read", auth, async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.convId, participantes: req.usuario._id
    });
    if (!conv) return res.status(403).json({ mensaje: "No autorizado" });

    await Message.updateMany(
      { conversacion: req.params.convId, autor: { $ne: req.usuario._id }, leido: false },
      { $set: { leido: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ mensaje: "Error" });
  }
});

module.exports = router;
