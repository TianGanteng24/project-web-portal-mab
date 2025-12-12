const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'portal-mab',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection()
  .then(() => {
    console.log('✅ Terhubung ke database MySQL');
  })
  .catch((err) => {
    console.error('❌ Koneksi database gagal:', err);
  });

module.exports = db;