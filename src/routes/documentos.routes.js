const { Router } = require('express');
const { authenticateToken }               = require('../middlewares/auth.middleware');
const { uploadSingle }                    = require('../middlewares/upload.middleware');
const { subirDocumento, listarDocumentos } = require('../controllers/documentos.controller');

const router = Router();

// Todas las rutas de documentos requieren JWT
router.use(authenticateToken);

// ─── POST /api/documentos/subir ───────────────────────────────────────────────
// Body: multipart/form-data
//   - archivo          (File)   → el documento
//   - nombre_documento (string) → nombre que le da el usuario
router.post('/subir', uploadSingle('archivo'), subirDocumento);

// ─── GET /api/documentos ──────────────────────────────────────────────────────
// Devuelve todos los documentos del usuario autenticado
router.get('/', listarDocumentos);

module.exports = router;
