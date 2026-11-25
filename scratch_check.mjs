import pool from './server/config/db.js';

async function main() {
  const r = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('ventas','compras','gastos','ingresos','cuentas_por_cobrar','cuentas_por_pagar') 
      AND column_name LIKE 'fecha%'
  `);
  console.log(r.rows);

  const now = await pool.query('SELECT CURRENT_DATE, CURRENT_TIMESTAMP, NOW(), timezone(current_setting(\'timezone\'), now())');
  console.log('DB TIME:', now.rows[0]);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
