const mongoose = require("mongoose");

const notifSchema = new mongoose.Schema({
  destinatario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  origen:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tipo:         { type: String, enum: ["like","comentario","mencion","repost","seguidor"], required: true },
  post:         { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
  leida:        { type: Boolean, default: false },
  texto:        { type: String, default: "" }
}, { timestamps: true });

notifSchema.index({ destinatario: 1, createdAt: -1 });

module.exports = mongoose.model("Notificacion", notifSchema);
