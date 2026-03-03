const express  = require("express");
const mongoose = require("mongoose");
const { getBucket } = require("../utils/gridfs");

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const id     = new mongoose.Types.ObjectId(req.params.id);
    const bucket = getBucket();

    const files = await bucket.find({ _id: id }).toArray();
    if (!files.length) return res.status(404).end();

    const file        = files[0];
    const totalLength = file.length;
    const contentType = file.contentType || "application/octet-stream";
    const isVideo     = contentType.startsWith("video/");
    const range       = req.headers.range;

    // ── Streaming con Range para videos ──
    if (isVideo && range) {
      const parts     = range.replace(/bytes=/, "").split("-");
      const start     = parseInt(parts[0], 10);
      const end       = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range":  `bytes ${start}-${end}/${totalLength}`,
        "Accept-Ranges":  "bytes",
        "Content-Length": chunkSize,
        "Content-Type":   contentType
      });

      bucket.openDownloadStream(id, { start, end: end + 1 }).pipe(res);
      return;
    }

    // ── Archivos normales (imágenes) ──
    res.set({
      "Content-Type":   contentType,
      "Content-Length": totalLength,
      "Accept-Ranges":  "bytes",
      "Cache-Control":  "public, max-age=31536000, immutable"
    });

    bucket.openDownloadStream(id)
      .on("error", () => res.status(404).end())
      .pipe(res);

  } catch (_) {
    res.status(400).end();
  }
});

module.exports = router;