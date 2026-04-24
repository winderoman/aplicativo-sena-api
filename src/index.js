require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/db');
const authRoutes       = require('./routes/auth.routes');
const documentosRoutes = require('./routes/documentos.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.set('trust proxy', 1);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 30,                   // máx 30 subidas por hora por IP
  message: { success: false, message: 'Límite de subidas alcanzado. Intenta en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Body Parser ──────────────────────────────────────────────────────────────
// Nota: multer maneja multipart/form-data por su cuenta, esto es solo para JSON
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🔐 Auth API funcionando correctamente',
    version: '1.0.0',
    endpoints: {
      register:          'POST /api/auth/register',
      login:             'POST /api/auth/login',
      refresh:           'POST /api/auth/refresh',
      logout:            'POST /api/auth/logout          🔒',
      profile:           'GET  /api/auth/profile          🔒',
      subirDocumento:    'POST /api/documentos/subir      🔒 multipart/form-data',
      listarDocumentos:  'GET  /api/documentos            🔒',
    },
  });
});

app.use('/api/auth',       authLimiter,   authRoutes);
app.use('/api/documentos', uploadLimiter, documentosRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta ${req.originalUrl} no encontrada.` });
});

// ─── Error Handler Global ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();