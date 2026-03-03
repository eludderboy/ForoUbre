const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    autor:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    texto:   { type: String, maxlength: 280, default: "" },
    imagen:  { type: String, default: null },
    likes:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);