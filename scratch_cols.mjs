import pool from './server/config/db.js';
const { rows } = await pool.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'productos' ORDER BY ordinal_position");
rows.forEach(r => console.log(r.column_name + ' | ' + r.data_type + ' | nullable=' + r.is_nullable + ' | default=' + r.column_default));
await pool.end();

