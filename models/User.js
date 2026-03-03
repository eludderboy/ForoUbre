const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nombre:   { type: String, required: true, trim: true },
    handle:   { type: String, required: true, unique: true, lowercase: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatar:   { type: String, default: "" },
    bio:      { type: String, default: "" },
    seguidores: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    siguiendo:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

// Hash password antes de guardar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Comparar password
userSchema.methods.compararPassword = function (candidato) {
  return bcrypt.compare(candidato, this.password);
};

module.exports = mongoose.model("User", userSchema);