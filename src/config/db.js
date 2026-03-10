const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,         // Plan DEV de Clever Cloud tiene límite bajo
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },  // Clever Cloud requiere SSL
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado a la base de datos');
    conn.release();
  } catch (err) {
    console.error('❌ Error conectando a la DB:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
