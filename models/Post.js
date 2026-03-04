const mongoose = require("mongoose");

const opcionSchema = new mongoose.Schema({
  texto: { type: String, required: true },
  votos: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { _id: true });

const postSchema = new mongoose.Schema({
  autor:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  texto:     { type: String, default: "" },
  tipo:      { type: String, enum: ["normal","slideshow","poll"], default: "normal" },

  mediaUrl:  { type: String, default: null },
  mediaTipo: { type: String, default: null },

  imagenes:  [{ type: String }],
  audioUrl:  { type: String, default: null },

  opciones:  [opcionSchema],

  nsfw:      { type: Boolean, default: false },
  nsfw_auto: { type: Boolean, default: false },

  likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reposts:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comentarios: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  comunidad:   { type: mongoose.Schema.Types.ObjectId, ref: "Community", default: null },

  hashtags:    [{ type: String }]   // ← ÚNICO CAMBIO
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);
