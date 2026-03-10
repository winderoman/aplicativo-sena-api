const { Router } = require('express');
const { body } = require('express-validator');
const { registerValidation,loginValidation } = require('../validators/auth.validator');
const validate = require('../validators/validate');
const { register, login, refresh, logout, profile } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register',registerValidation,validate,register);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login',loginValidation,validate,login);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('El refresh token es requerido.')],
  validate,
  refresh
);

// ─── POST /api/auth/logout (protegida) ───────────────────────────────────────
router.post('/logout', authenticateToken, logout);

// ─── GET /api/auth/profile (protegida) ───────────────────────────────────────
router.get('/profile', authenticateToken, profile);

module.exports = router;
