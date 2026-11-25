import * as repo from '../server/repositories/ventaRepository.js';
import pool from '../server/config/db.js';

async function testList() {
  const all = await repo.list({}, 1);
  console.log('Total ventas without filter:', all.total, all.items.map(i => ({ id: i.id_venta, fecha: i.fecha })));

  const filtered = await repo.list({ desde: '2026-11-25', hasta: '2026-11-25' }, 1);
  console.log('Filtered 2026-11-25:', filtered.total, filtered.items.map(i => ({ id: i.id_venta, fecha: i.fecha })));

  await pool.end();
}

testList();
