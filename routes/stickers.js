const express = require("express");
const auth    = require("../middleware/authMiddleware");

const router  = express.Router();

// GET /api/stickers?prompt=...
router.get("/", auth, async (req, res) => {
  try {
    const { prompt } = req.query;
    if (!prompt?.trim())
      return res.status(400).json({ mensaje: "Se necesita un prompt" });

    const url  = `https://ssssssss.anshapi.workers.dev/?prompt=${encodeURIComponent(prompt.trim())}&image=2`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });

    if (!resp.ok) throw new Error("API de stickers no disponible");

    const data = await resp.json();

    if (!data.image_url_1)
      throw new Error("No se generaron imágenes");

    res.json({
      sticker1: data.image_url_1,
      sticker2: data.image_url_2 || data.image_url_1
    });
  } catch (err) {
    console.error("Sticker error:", err.message);
    res.status(500).json({ mensaje: err.message || "Error al generar stickers" });
  }
});

module.exports = router;