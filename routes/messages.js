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
  limits:     { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg","image/png","image/gif","image/webp",
      "video/mp4","video/webm"
    ].includes(file.mimetype);
    cb(null, ok);
  }
});

// Agregar en routes/messages.js — ANTES de las rutas /:id
router.get("/noLeidos", auth, async (req, res) => {
  try {
    const Conversation = require("../models/Conversation"); // ajusta el path si es distinto

    const convs = await Conversation.find({
      participantes: req.usuario._id
    }).lean();

    let total = 0;
    const uid = req.usuario._id.toString();

    convs.forEach(c => {
      // Esquema con array noLeidos: [{ usuario, cantidad }]
      if (Array.isArray(c.noLeidos)) {
        const entry = c.noLeidos.find(n =>
          (n.usuario || n.user || "").toString() === uid
        );
        if (entry) total += entry.cantidad || entry.count || 0;
      }
      // Esquema con mapa noLeidos: { [userId]: número }
      else if (c.noLeidos && typeof c.noLeidos === "object") {
        total += c.noLeidos[uid] || 0;
      }
    });

    res.json({ total });
  } catch(e) {
    console.error("GET /messages/noLeidos:", e);
    // Si el modelo no existe o falla, devuelve 0 sin romper la app
    res.json({ total: 0 });
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
      const otro = conv.participantes.find(
        p => p._id.toString() !== req.usuario._id.toString()
      );
      const noLeidos = await Message.countDocuments({
        conversacion: conv._id,
        autor:        { $ne: req.usuario._id },
        leido:        false
      });
      return { ...conv, otro, noLeidos };
    }));

    res.json(result);
  } catch (err) {
    console.error("GET /messages →", err);
    res.status(500).json({ mensaje: "Error al cargar conversaciones" });
  }
});

// ── POST /api/messages ── crear/encontrar conversación
router.post("/", auth, async (req, res) => {
  try {
    const { usuarioId } = req.body;
    if (!usuarioId)
      return res.status(400).json({ mensaje: "usuarioId requerido" });
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
    console.error("POST /messages →", err);
    res.status(500).json({ mensaje: "Error" });
  }
});

// ── GET /api/messages/:convId ── mensajes (FIXED)
router.get("/:convId", auth, async (req, res) => {
  try {
    // Verificar que el usuario pertenece a la conversación
    const conv = await Conversation.findOne({
      _id:           req.params.convId,
      participantes: req.usuario._id
    }).lean();

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
    console.error("GET /messages/:convId →", err.message);
    res.status(500).json({ mensaje: "Error al cargar mensajes", detalle: err.message });
  }
});

// ── POST /api/messages/:convId ── enviar mensaje
router.post("/:convId", auth, uploadMedia.single("media"), async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id:           req.params.convId,
      participantes: req.usuario._id
    }).lean();
    if (!conv) return res.status(403).json({ mensaje: "No autorizado" });

    const { texto } = req.body;
    let mediaUrl  = null;
    let mediaTipo = null;

    if (req.file) {
      const fileId  = await uploadFile(req.file);
      mediaUrl      = `/api/images/${fileId}`;
      mediaTipo     = req.file.mimetype.startsWith("video/") ? "video" : "imagen";
    }

    if (!texto?.trim() && !mediaUrl)
      return res.status(400).json({ mensaje: "Mensaje vacío" });

    const msg = await Message.create({
      conversacion: req.params.convId,
      autor:        req.usuario._id,
      texto:        texto?.trim() || "",
      mediaUrl,
      mediaTipo
    });

    // Actualizar conversación
    await Conversation.findByIdAndUpdate(req.params.convId, {
      ultimoMensaje: msg._id,
      updatedAt:     new Date()
    });

    const populated = await msg.populate("autor", "nombre handle avatar avatarTipo");
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ mensaje: "Máximo 25MB" });
    console.error("POST /messages/:convId →", err.message);
    res.status(500).json({ mensaje: "Error al enviar" });
  }
});

// ── PUT /api/messages/:convId/read ── marcar leído
router.put("/:convId/read", auth, async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id:           req.params.convId,
      participantes: req.usuario._id
    }).lean();
    if (!conv) return res.status(403).json({ mensaje: "No autorizado" });

    await Message.updateMany(
      { conversacion: req.params.convId, autor: { $ne: req.usuario._id }, leido: false },
      { $set: { leido: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /messages/:convId/read →", err.message);
    res.status(500).json({ mensaje: "Error" });
  }
});

module.exports = router;
