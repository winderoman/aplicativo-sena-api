const multer = require('multer');

// Tipos MIME permitidos: PDF, imágenes y Word
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',                                                      // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const ALLOWED_EXTENSIONS = /\.(pdf|jpg|jpeg|png|webp|gif|doc|docx)$/i;

const MAX_SIZE_MB = 10;

const upload = multer({
  storage: multer.memoryStorage(), // el archivo llega como buffer, no se guarda en disco
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: 1, // solo un archivo por request
  },
  fileFilter(_req, file, cb) {
    const validMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const validExt  = ALLOWED_EXTENSIONS.test(file.originalname);

    if (validMime && validExt) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido. Solo: PDF, imágenes (JPG/PNG/WEBP/GIF) y Word (DOC/DOCX).`));
    }
  },
});

// Wrapper que convierte los errores de multer en respuestas JSON limpias
function uploadSingle(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: `El archivo supera el límite de ${MAX_SIZE_MB}MB.`,
          });
        }
        return res.status(400).json({ success: false, message: err.message });
      }

      // Error de fileFilter (tipo no permitido)
      return res.status(415).json({ success: false, message: err.message });
    });
  };
}

module.exports = { uploadSingle };
