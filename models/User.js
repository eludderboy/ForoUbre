const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nombre:   { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    handle:   { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 20, match: [/^[a-zA-Z0-9_]+$/, "Handle inválido"] },
    email:    { type: String, required: true, unique: true, lowercase: true, maxlength: 100 },
    password: { type: String, required: true },
    avatar:      { type: String, default: "" },
    avatarTipo:  { type: String, default: "imagen" },
    bio:         { type: String, default: "", maxlength: 160 },
    link:        { type: String, default: "", maxlength: 100 }, // ← NUEVO

    seguidores: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    siguiendo:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    personalizacion: {
      // Marco del avatar
      marco:      { type: String, default: "none" }, // none|color|neon|gold|rainbow|animated|dashed|doble|glitter
      marcoColor: { type: String, default: "#5cdb6f" },

      // Aura del avatar ← NUEVO
      aura: { type: String, default: "none" }, // none|soft|neon|fire|ice|rainbow

      // Banner
      bannerTipo:    { type: String, default: "gradiente" }, // gradiente|imagen ← NUEVO
      bannerPreset:  { type: String, default: "default" },   // default|purple|blue|sunset|ocean|fire|neon|midnight|rose|gold|custom
      bannerColor1:  { type: String, default: "#0d2010" },
      bannerColor2:  { type: String, default: "#1a3a14" },
      bannerImagen:  { type: String, default: "" },           // URL GridFS ← NUEVO
      bannerSticker: { type: String, default: "" },           // emoji ← NUEVO

      // Nombre
      nombreEfecto:    { type: String, default: "none" }, // none|gradient|glow|neon|color|shadow
      nombreGradiente: { type: String, default: "green-blue" },
      nombreColor:     { type: String, default: "#f0f0f0" },
      gradColor1:      { type: String, default: "#5cdb6f" },
      gradColor2:      { type: String, default: "#4dabf7" },

      // Badge
      badge: { type: String, default: "none" }, // none|verified|star|fire|crown|dev|new|vip

      // Efectos ← NUEVOS
      bgEfecto:   { type: String, default: "none" }, // none|particles|stars|grid|rain|matrix
      cardEfecto: { type: String, default: "none" }, // none|glass|neon-border|shadow-color
      acento:     { type: String, default: "#5cdb6f" }, // color de acento del perfil

      // Legacy (por si ya existe en DB)
      temaColor: { type: String, default: "#5cdb6f" }
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.compararPassword = function (c) {
  return bcrypt.compare(c, this.password);
};

module.exports = mongoose.model("User", userSchema);
