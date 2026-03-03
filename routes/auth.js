const express = require("express");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const auth    = require("../middleware/authMiddleware");

const router = express.Router();

// ── Generar token ──
const generarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ── REGISTER ──
router.post("/register", async (req, res) => {
  try {
    const { nombre, handle, email, password } = req.body;

    if (!nombre || !handle || !email || !password)
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });

    if (password.length < 6)
      return res.status(400).json({ mensaje: "La contraseña debe tener al menos 6 caracteres" });

    const existeHandle = await User.findOne({ handle });
    if (existeHandle)
      return res.status(400).json({ mensaje: "Ese @handle ya está en uso" });

    const existeEmail = await User.findOne({ email });
    if (existeEmail)
      return res.status(400).json({ mensaje: "Ese email ya está registrado" });

    const avatarDefault = `https://api.dicebear.com/7.x/thumbs/svg?seed=${handle}`;

    const usuario = await User.create({
      nombre,
      handle,
      email,
      password,
      avatar: avatarDefault
    });

    res.status(201).json({
      token: generarToken(usuario._id),
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        handle: usuario.handle,
        avatar: usuario.avatar
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});

// ── LOGIN ──
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ mensaje: "Email y contraseña son obligatorios" });

    const usuario = await User.findOne({ email });
    if (!usuario)
      return res.status(401).json({ mensaje: "Credenciales incorrectas" });

    const ok = await usuario.compararPassword(password);
    if (!ok)
      return res.status(401).json({ mensaje: "Credenciales incorrectas" });

    res.json({
      token: generarToken(usuario._id),
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        handle: usuario.handle,
        avatar: usuario.avatar
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});

// ── ME (verificar sesión) ──
router.get("/me", auth, (req, res) => {
  res.json(req.usuario);
});

module.exports = router;