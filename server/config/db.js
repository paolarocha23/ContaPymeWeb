import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    '⚠️ DATABASE_URL no está definida. Configura la cadena de conexión de Supabase en el archivo .env'
  );
}

// En Supabase la conexión requiere SSL. Se puede desactivar con DB_SSL=false
// para un PostgreSQL local.
const useSSL = process.env.DB_SSL !== 'false';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DB_POOL_MAX || 15),
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 30000
});

// Evita que un error de una conexión inactiva tumbe el proceso
pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
});

// Prueba de conexión inicial (no bloquea el arranque)
pool.query('SELECT current_database() AS db')
  .then(({ rows }) => {
    console.log(
      `✅ Conectado exitosamente a PostgreSQL (Base de datos: ${rows[0].db})`
    );
  })
  .catch((err) => {
    console.error(
      '❌ Error al conectar con Supabase PostgreSQL:',
      err.message
    );
  });

export default pool;
