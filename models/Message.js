const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversacion: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    remitente:    { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true },
    contenido:    { type: String, required: true, trim: true, maxlength: 1000 },
    leido:        { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);