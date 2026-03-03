const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversacion: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    autor:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    texto:        { type: String, default: "" },
    mediaUrl:     { type: String, default: null },   // ← plano, sin objeto anidado
    mediaTipo:    { type: String, default: null },   // "imagen" | "video" | null
    leido:        { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
