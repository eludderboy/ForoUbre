const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    autor:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url:            { type: String, required: true },
    descripcion:    { type: String, default: "", maxlength: 300 },
    likes:          [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    compartidos:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reproducciones: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);