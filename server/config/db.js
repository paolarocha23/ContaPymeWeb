import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'contapyme',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Prueba de conexión inicial
pool.getConnection()
  .then(conn => {
    console.log(' Conectado exitosamente a MySQL (Base de datos: ' + (process.env.DB_NAME || 'contapyme') + ')');
    conn.release();
  })
  .catch(err => {
    console.error(' Error al conectar con la base de datos MySQL:', err.message);
  });

export default pool;
