const jwt  = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ mensaje: "No autorizado" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = await User.findById(decoded.id).select("-password");

    if (!req.usuario) return res.status(401).json({ mensaje: "Usuario no encontrado" });
    next();
  } catch {
    res.status(401).json({ mensaje: "Token inválido" });
  }
};