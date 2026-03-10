const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token requerido. Incluye: Authorization: Bearer <token>',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Usa el refresh token para obtener uno nuevo.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Token inválido.',
    });
  }
}

module.exports = { authenticateToken };
