const express = require("express");
const User    = require("../models/User");
const Post    = require("../models/Post");
const auth    = require("../middleware/authMiddleware");

const router  = express.Router();

// GET /api/search?q=&tipo=todo|usuarios|posts
router.get("/", auth, async (req, res) => {
  try {
    const q    = req.query.q?.trim();
    const tipo = req.query.tipo || "todo";

    if (!q || q.length < 1)
      return res.json({ usuarios: [], posts: [] });

    const regex = new RegExp(q, "i");
    let usuarios = [], posts = [];

    if (tipo === "todo" || tipo === "usuarios") {
      const rawUsuarios = await User.find({
        $or: [{ nombre: regex }, { handle: regex }, { bio: regex }],
        _id: { $ne: req.usuario._id }
      })
        .select("nombre handle avatar avatarTipo bio seguidores personalizacion")
        .limit(15)
        .lean();

      usuarios = rawUsuarios.map(u => ({
        ...u,
        sigues:          u.seguidores.some(id => id.toString() === req.usuario._id.toString()),
        totalSeguidores: u.seguidores.length
      }));
    }

    if (tipo === "todo" || tipo === "posts") {
      const rawPosts = await Post.find({ texto: regex })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("autor", "nombre handle avatar avatarTipo personalizacion")
        .lean();

      posts = rawPosts.map(p => ({
        ...p,
        yaLike:     p.likes.some(id => id.toString() === req.usuario._id.toString()),
        totalLikes: p.likes.length
      }));
    }

    res.json({ usuarios, posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al buscar" });
  }
});

module.exports = router;