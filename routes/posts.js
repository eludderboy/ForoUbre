const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const Post    = require("../models/Post");
const auth    = require("../middleware/authMiddleware");

const router = express.Router();

// ── Config Multer ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const tipos = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  cb(null, tipos.includes(file.mimetype));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ── GET /api/posts  — Feed ──
router.get("/", auth, async (req, res) => {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 20;
    const skip   = (pagina - 1) * limite;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limite)
      .populate("autor", "nombre handle avatar")
      .lean();

    // Añadir si el usuario actual dio like
    const postsConLike = posts.map((p) => ({
      ...p,
      yaLike:      p.likes.some((id) => id.toString() === req.usuario._id.toString()),
      totalLikes:  p.likes.length
    }));

    res.json(postsConLike);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al obtener posts" });
  }
});

// ── POST /api/posts  — Crear post ──
router.post("/", auth, upload.single("imagen"), async (req, res) => {
  try {
    const { texto } = req.body;
    const imagen    = req.file ? `/uploads/${req.file.filename}` : null;

    if (!texto && !imagen)
      return res.status(400).json({ mensaje: "El post necesita texto o imagen" });

    if (texto && texto.length > 280)
      return res.status(400).json({ mensaje: "Máximo 280 caracteres" });

    const post = await Post.create({
      autor:  req.usuario._id,
      texto:  texto || "",
      imagen
    });

    const populated = await post.populate("autor", "nombre handle avatar");

    res.status(201).json({
      ...populated.toObject(),
      yaLike:     false,
      totalLikes: 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al crear post" });
  }
});

// ── DELETE /api/posts/:id ──
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(404).json({ mensaje: "Post no encontrado" });

    if (post.autor.toString() !== req.usuario._id.toString())
      return res.status(403).json({ mensaje: "No puedes eliminar este post" });

    // Borrar imagen si existe
    if (post.imagen) {
      const imgPath = path.join(__dirname, "..", post.imagen);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await post.deleteOne();
    res.json({ mensaje: "Post eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al eliminar post" });
  }
});

// ── POST /api/posts/:id/like ──
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(404).json({ mensaje: "Post no encontrado" });

    const idx = post.likes.indexOf(req.usuario._id);
    if (idx === -1) {
      post.likes.push(req.usuario._id);
    } else {
      post.likes.splice(idx, 1);
    }

    await post.save();
    res.json({
      yaLike:     post.likes.includes(req.usuario._id),
      totalLikes: post.likes.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al dar like" });
  }
});

module.exports = router;