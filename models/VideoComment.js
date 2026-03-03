const mongoose = require("mongoose");

const videoCommentSchema = new mongoose.Schema(
  {
    video: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    texto: { type: String, required: true, trim: true, maxlength: 280 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoComment", videoCommentSchema);