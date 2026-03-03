const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participantes: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
    ],
    ultimoMensaje:   { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    ultimaActividad: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

conversationSchema.index({ participantes: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);