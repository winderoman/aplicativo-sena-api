const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

function getRefreshExpiry() {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// ─── Registro de Aprendiz ─────────────────────────────────────────────────────
// Crea el user en `users` y el perfil en `aprendices` en una sola transacción

async function register(req, res) {
  const conn = await pool.getConnection();
  try {
    const {
      email,
      password,
      ficha,
      programa_formacion,
      tipo_documento,
      numero_documento,
      nombre_aprendiz,
      telefono,
      fecha_inicio_etapa,
      fecha_fin_etapa,
    } = req.body;

    // Verificar email duplicado
    const [existingEmail] = await conn.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (existingEmail.length > 0) {
      return res.status(409).json({ success: false, message: 'El correo ya está registrado.' });
    }

    // Verificar documento duplicado
    const [existingDoc] = await conn.query(
      'SELECT id FROM aprendices WHERE numero_documento = ?',
      [numero_documento.trim()]
    );
    if (existingDoc.length > 0) {
      return res.status(409).json({ success: false, message: 'El número de documento ya está registrado.' });
    }

    await conn.beginTransaction();

    // 1. Crear usuario
    const hashedPassword = await bcrypt.hash(password, 12);
    const [userResult] = await conn.query(
      'INSERT INTO users (email,name, password, role) VALUES (?,?,?,?)',
      [email.toLowerCase().trim(),nombre_aprendiz, hashedPassword, 'Aprendiz']
    );
    const userId = userResult.insertId;

    // 2. Crear perfil de aprendiz
    await conn.query(
      `INSERT INTO aprendices
        (user_id, ficha, programa_formacion, tipo_documento, numero_documento,
         nombre_aprendiz, telefono, fecha_inicio_etapa, fecha_fin_etapa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        ficha || null,
        programa_formacion || null,
        tipo_documento || null,
        numero_documento || null,
        nombre_aprendiz,
        telefono ? telefono : null,
        fecha_inicio_etapa || null,
        fecha_fin_etapa || null,
      ]
    );

    await conn.commit();

    // 3. Generar tokens
    const { accessToken, refreshToken } = generateTokens({
      id: userId,
      email: email.toLowerCase().trim(),
      role: 'Aprendiz',
    });

    await conn.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, refreshToken, getRefreshExpiry()]
    );

    return res.status(201).json({
      success: true,
      message: 'Aprendiz registrado exitosamente.',
      data: {
        user: {
          id: userId,
          email: email.toLowerCase().trim(),
          role: 'Aprendiz',
          nombre_aprendiz: nombre_aprendiz.trim(),
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error en registro:', err);
    return res.status(500).json({ success: false, message: 'Error del servidor.' });
  } finally {
    conn.release();
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Buscar usuario y unir con aprendiz si aplica
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.password, u.role,
              a.nombre_aprendiz
       FROM users u
       LEFT JOIN aprendices a ON a.user_id = u.id
       WHERE u.email = ?`,
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const user = users[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, getRefreshExpiry()]
    );

    return res.json({
      success: true,
      message: 'Login exitoso.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          nombre: user.nombre_aprendiz || null,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(403).json({ success: false, message: 'Refresh token inválido o expirado.' });
    }

    const [tokens] = await pool.query(
      'SELECT id FROM refresh_tokens WHERE user_id = ? AND token = ? AND expires_at > NOW()',
      [decoded.id, refreshToken]
    );
    if (tokens.length === 0) {
      return res.status(403).json({ success: false, message: 'Refresh token revocado o no encontrado.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });

    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [decoded.id]);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [decoded.id, newRefreshToken, getRefreshExpiry()]
    );

    return res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    console.error('Error en refresh:', err);
    return res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logout(req, res) {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
  } catch (err) {
    console.error('Error en logout:', err);
    return res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
}

// ─── Perfil (devuelve user + datos de aprendiz si aplica) ────────────────────

async function profile(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.role, u.created_at,
              a.ficha, a.programa_formacion, a.tipo_documento,
              a.numero_documento, a.nombre_aprendiz, a.telefono,
              a.fecha_inicio_etapa, a.fecha_fin_etapa
       FROM users u
       LEFT JOIN aprendices a ON a.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const { id, email, role, created_at, ...perfil } = rows[0];

    return res.json({
      success: true,
      data: {
        user: { id, email, role, created_at },
        perfil: role === 'Aprendiz' ? perfil : null,
      },
    });
  } catch (err) {
    console.error('Error en perfil:', err);
    return res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
}

module.exports = { register, login, refresh, logout, profile };