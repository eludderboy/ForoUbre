const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversacion: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    autor:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    texto:        { type: String, default: "" },
    media:        {
      url:  { type: String, default: null },
      tipo: { type: String, enum: ["imagen", "video", null], default: null }
    },
    leido:        { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
