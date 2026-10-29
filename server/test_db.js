import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

/**
 * Prueba de conexión y diagnóstico del esquema en Supabase/PostgreSQL.
 * Uso: node server/test_db.js
 */
async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida en el archivo .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  try {
    console.log('Probando conexión con Supabase PostgreSQL...');

    const { rows: info } = await pool.query(`
      SELECT current_database() AS base_datos,
             current_user AS usuario,
             version() AS version
    `);
    console.log(`✅ Conexión exitosa`);
    console.log(`   Base de datos: ${info[0].base_datos}`);
    console.log(`   Usuario:       ${info[0].usuario}`);
    console.log(`   Versión:       ${info[0].version.split(',')[0]}`);

    const { rows: tablas } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`\n📋 Tablas encontradas en public (${tablas.length}):`);
    for (const t of tablas) {
      console.log(`   - ${t.table_name}`);
    }

    const requeridas = ['roles', 'usuarios', 'codigos_2fa', 'tokens_recuperacion', 'bitacora_accesos'];
    const existentes = tablas.map((t) => t.table_name);
    const faltantes = requeridas.filter((t) => !existentes.includes(t));

    if (faltantes.length > 0) {
      console.log(`\n⚠️ Tablas requeridas faltantes: ${faltantes.join(', ')}`);
      console.log('   Se crearán automáticamente al iniciar el servidor (init_db.js).');
    } else {
      console.log('\n✅ Todas las tablas requeridas existen.');
    }

    const { rows: usuarios } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM public.usuarios'
    );
    console.log(`👥 Usuarios registrados: ${usuarios[0].total}`);
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
