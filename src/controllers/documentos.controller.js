const path = require('path');
const { pool } = require('../config/db');
const { supabase, BUCKET } = require('../config/storage');

// ─── Utilidades ───────────────────────────────────────────────────────────────

// Construye la ruta en Supabase: documentos/<user_id>/<timestamp>_<nombre_sanitizado>
function buildStoragePath(userId, originalName) {
  const ext       = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  return `${userId}/${timestamp}${ext}`;
}

// Sanitiza el nombre que escribe el usuario (elimina caracteres raros)
function sanitizeName(str) {
  return str.trim().replace(/[<>"'%;()&+]/g, '').slice(0, 100);
}

// ─── POST /api/documentos/subir ───────────────────────────────────────────────

async function subirDocumento(req, res) {
  try {
    // req.file viene de multer (upload.middleware.js)
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' });
    }

    const userId      = req.user.id;
    const nombreDoc   = sanitizeName(req.body.nombre_documento || '');
    //const nombreDoc   = "test document";

    if (!nombreDoc) {
      return res.status(422).json({
        success: false,
        message: 'El campo nombre_documento es requerido.',
      });
    }

    // Verificar que el usuario no tenga ya un documento con ese nombre exacto
    const [existing] = await pool.query(
      'SELECT id FROM documentos WHERE user_id = ? AND nombre_documento = ?',
      [userId, nombreDoc]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Ya tienes un documento llamado "${nombreDoc}". Elimínalo primero o usa un nombre diferente.`,
      });
    }

    // Subir a Supabase Storage
    const storagePath = buildStoragePath(userId, req.file.originalname);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error Supabase upload:', uploadError);
      return res.status(500).json({ success: false, message: 'Error al subir el archivo al storage.' });
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Guardar registro en MySQL
    const [result] = await pool.query(
      `INSERT INTO documentos
         (user_id, nombre_documento, nombre_archivo_original, storage_path, url_publica, mime_type, tamanio_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        nombreDoc,
        req.file.originalname,
        storagePath,
        publicUrl,
        req.file.mimetype,
        req.file.size,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Documento subido exitosamente.',
      data: {
        id:                      result.insertId,
        nombre_documento:        nombreDoc,
        nombre_archivo_original: req.file.originalname,
        url_publica:             publicUrl,
        mime_type:               req.file.mimetype,
        tamanio_bytes:           req.file.size,
      },
    });
  } catch (err) {
    console.error('Error en subirDocumento:', err);
    return res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
}

// ─── GET /api/documentos ──────────────────────────────────────────────────────

async function listarDocumentos(req, res) {
  try {
    const userId = req.user.id;

    const [documentos] = await pool.query(
      `SELECT
         id,
         nombre_documento,
         nombre_archivo_original,
         url_publica,
         mime_type,
         tamanio_bytes,
         created_at
       FROM documentos
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: {
        total: documentos.length,
        documentos,
      },
    });
  } catch (err) {
    console.error('Error en listarDocumentos:', err);
    return res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
}

module.exports = { subirDocumento, listarDocumentos };
