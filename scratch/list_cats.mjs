import pool from '../server/config/db.js';

async function listCats() {
  const { rows } = await pool.query('SELECT * FROM categorias ORDER BY id_categoria');
  console.log(rows);
  await pool.end();
}

listCats();
