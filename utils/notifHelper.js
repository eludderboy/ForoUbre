const Notificacion = require("../models/Notificacion");

/**
 * Crea una notificación y la emite por socket.
 * Nunca lanza error para no romper el flujo principal.
 */
async function crearNotif(io, { destinatario, origen, tipo, post = null, texto = "" }) {
  try {
    if (!destinatario || !origen) return;
    if (destinatario.toString() === origen.toString()) return; // no auto-notificar

    // Evitar duplicados de like/repost
    if (["like", "repost"].includes(tipo)) {
      const existe = await Notificacion.findOne({ destinatario, origen, tipo, post });
      if (existe) return;
    }

    const notif = await Notificacion.create({ destinatario, origen, tipo, post, texto });
    const populated = await Notificacion.findById(notif._id)
      .populate("origen", "nombre handle avatar avatarTipo")
      .populate("post",   "texto tipo")
      .lean();

    if (io) io.to(`user_${destinatario}`).emit("nuevaNotificacion", populated);
  } catch (e) {
    console.warn("crearNotif error (non-fatal):", e.message);
  }
}

/** Elimina notif de like/repost cuando se deshace */
async function eliminarNotif(io, { destinatario, origen, tipo, post }) {
  try {
    await Notificacion.deleteOne({ destinatario, origen, tipo, post });
  } catch (e) {
    console.warn("eliminarNotif error (non-fatal):", e.message);
  }
}

module.exports = { crearNotif, eliminarNotif };
