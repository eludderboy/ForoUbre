const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const path     = require("path");

// Cargar .env solo si NO estamos en Replit
if (!process.env.REPL_ID) require("dotenv").config();

const app = express();

// ── Middlewares ──
app.use(cors());
app.use(express.json());

// ── Servir archivos estáticos del frontend ──
app.use(express.static(path.join(__dirname, "public")));

// ── Servir uploads ──
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Rutas API ──
app.use("/api/auth",  require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));

// ── Cualquier ruta no-API devuelve el index ──
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    next();
  }
});

// ── Conexión MongoDB ──
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Atlas conectado");
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
    );
  })
  .catch((err) => console.error("❌ Error MongoDB:", err));