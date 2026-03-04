/** Extrae handles de @menciones */
function parsearMenciones(texto = "") {
  const m = texto.match(/@([a-zA-Z0-9_]+)/g) || [];
  return [...new Set(m.map(x => x.slice(1).toLowerCase()))];
}

/** Extrae #hashtags */
function parsearHashtags(texto = "") {
  const h = texto.match(/#([a-zA-Z0-9_]+)/g) || [];
  return [...new Set(h.map(x => x.slice(1).toLowerCase()))];
}

module.exports = { parsearMenciones, parsearHashtags };
