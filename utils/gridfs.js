const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

let bucket;

const initBucket = () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads"
  });
  console.log("✅ GridFS listo");
};

const getBucket = () => {
  if (!bucket) throw new Error("GridFS no inicializado");
  return bucket;
};

// Sube un archivo de multer (buffer) a GridFS
// Devuelve el ID como string
const uploadFile = (file) =>
  new Promise((resolve, reject) => {
    const b        = getBucket();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const stream = b.openUploadStream(filename, {
      contentType: file.mimetype,
      metadata:    { originalname: file.originalname }
    });

    stream.end(file.buffer);
    stream.on("finish", () => resolve(stream.id.toString()));
    stream.on("error",  reject);
  });

// Elimina un archivo dado su URL /api/images/:id o directo el ID
const deleteFile = async (urlOrId = "") => {
  try {
    const b  = getBucket();
    const id = urlOrId.includes("/api/images/")
      ? urlOrId.split("/api/images/")[1]
      : urlOrId;
    await b.delete(new mongoose.Types.ObjectId(id));
  } catch (_) { /* silent */ }
};

module.exports = { initBucket, getBucket, uploadFile, deleteFile };