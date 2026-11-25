import pool from '../server/config/db.js';

async function checkSaleItems() {
  const { rows } = await pool.query(`
    SELECT v.id_venta, v.codigo, p.id_producto, p.nombre, p.tipo, p.id_categoria, c.nombre as cat_nombre,
           i.id_ingreso, i.id_categoria as ing_cat, ci.nombre as ing_cat_nombre
    FROM ventas v
    JOIN detalle_ventas dv ON dv.id_venta = v.id_venta
    JOIN productos p ON p.id_producto = dv.id_producto
    JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN ingresos i ON i.id_venta = v.id_venta
    LEFT JOIN categorias ci ON ci.id_categoria = i.id_categoria
    ORDER BY v.id_venta DESC
    LIMIT 10
  `);
  console.log(rows);
  await pool.end();
}

checkSaleItems();
