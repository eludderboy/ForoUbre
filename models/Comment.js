const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  post:   { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  autor:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  texto:  { type: String, required: true, maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.model("Comment", commentSchema);
