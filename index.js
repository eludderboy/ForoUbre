const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const mongoose   = require("mongoose");
const cors       = require("cors");
const path       = require("path");
const { initBucket } = require("./utils/gridfs");

process.env.PORT       = "5000";
process.env.MONGO_URI  = "mongodb+srv://srcat:123@cluster0.cee1b.mongodb.net/foro-ubre?retryWrites=true&w=majority&appName=Cluster0";
process.env.JWT_SECRET = "super_secreto_foro_ubre_2026";

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Rutas ──
app.use("/api/videos",   require("./routes/videos")); 
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/posts",    require("./routes/posts"));
app.use("/api/profile",  require("./routes/profile"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/search",   require("./routes/search"));
app.use("/api/stickers", require("./routes/stickers"));
app.use("/api/images",   require("./routes/images")); // ← Sirve imágenes de GridFS

// ── Socket.io ──
const usuariosOnline = new Map();

io.on("connection", (socket) => {
  socket.on("registrar", (userId) => {
    usuariosOnline.set(userId, socket.id);
    socket.join(`user_${userId}`);
  });

  socket.on("enviarMensaje", ({ convId, mensaje, destinatarioId }) => {
    io.to(`user_${destinatarioId}`).emit("nuevoMensaje", { convId, mensaje });
  });

  socket.on("mensajesLeidos", ({ convId, destinatarioId }) => {
  io.to(`user_${destinatarioId}`).emit("mensajesLeidos", { convId });
});

  socket.on("escribiendo", ({ convId, nombre, destinatarioId }) => {
    io.to(`user_${destinatarioId}`).emit("usuarioEscribiendo", { convId, nombre });
  });

  socket.on("dejoDeEscribir", ({ convId, destinatarioId }) => {
    io.to(`user_${destinatarioId}`).emit("usuarioDejoEscribir", { convId });
  });

  socket.on("disconnect", () => {
    for (const [uid, sid] of usuariosOnline) {
      if (sid === socket.id) { usuariosOnline.delete(uid); break; }
    }
  });
});

// ── Wildcard SPA ──
app.get(/.*/, (req, res) => {
  if (!req.path.startsWith("/api"))
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Arrancar ──
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    initBucket(); // ← Inicializar GridFS después de conectar
    console.log("✅ MongoDB Atlas conectado");
    server.listen(process.env.PORT, "0.0.0.0", () =>
      console.log(`🚀 Servidor en puerto ${process.env.PORT}`)
    );
  })
  .catch(err => console.error("❌ MongoDB error:", err));
