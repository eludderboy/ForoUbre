const express      = require("express");
const Notificacion = require("../models/Notificacion");
const auth         = require("../middleware/authMiddleware");
const router       = express.Router();

/* GET / — Últimas 40 notificaciones */
router.get("/", auth, async (req, res) => {
  try {
    const notifs = await Notificacion.find({ destinatario: req.usuario._id })
      .sort({ createdAt: -1 })
      .limit(40)
      .populate("origen", "nombre handle avatar avatarTipo")
      .populate("post",   "texto tipo")
      .lean();
    res.json(notifs);
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
});

/* GET /no-leidas — Contador badge */
router.get("/no-leidas", auth, async (req, res) => {
  try {
    const count = await Notificacion.countDocuments({
      destinatario: req.usuario._id,
      leida: false
    });
    res.json({ count });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
});

/* PUT /leer — Marcar todas como leídas */
router.put("/leer", auth, async (req, res) => {
  try {
    await Notificacion.updateMany(
      { destinatario: req.usuario._id, leida: false },
      { leida: true }
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
});

/* PUT /:id/leer — Marcar una leída */
router.put("/:id/leer", auth, async (req, res) => {
  try {
    await Notificacion.findOneAndUpdate(
      { _id: req.params.id, destinatario: req.usuario._id },
      { leida: true }
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
});

module.exports = router;
