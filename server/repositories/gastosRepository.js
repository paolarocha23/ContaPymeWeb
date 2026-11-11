import pool from '../config/db.js';

// Registrar un movimiento de Caja
export async function registrarMovimientoCaja(datos, client = pool) {
  const {
    fecha,
    tipo,
    concepto,
    monto,
    origen,
    id_referencia,
    id_usuario
  } = datos;

  const consulta = `
    INSERT INTO movimientos_caja (
      fecha,
      tipo,
      concepto,
      monto,
      origen,
      id_referencia,
      id_usuario
    )
    VALUES (
      COALESCE($1::timestamp, CURRENT_TIMESTAMP),
      $2, $3, $4, $5, $6, $7
    )
    RETURNING *
  `;

  const { rows } = await client.query(consulta, [
    fecha || null,
    tipo,
    concepto,
    monto,
    origen,
    id_referencia || null,
    id_usuario
  ]);

  return rows[0];
}

// Consultar todos los gastos
export async function obtenerGastos(filtros = {}) {
  const { fecha_inicio, fecha_fin, id_categoria, concepto } = filtros;

  let consulta = `
    SELECT
      g.id_gasto,
      g.fecha,
      g.concepto,
      g.id_categoria,
      c.nombre AS categoria,
      g.monto,
      g.forma_pago,
      g.observaciones,
      g.id_usuario,
      g.estatus,
      u.nombre AS nombre_usuario,
      u.apellido_paterno
    FROM gastos g
    INNER JOIN categorias c
      ON c.id_categoria = g.id_categoria
    INNER JOIN usuarios u
      ON u.id_usuario = g.id_usuario
    WHERE 1 = 1
  `;

  const valores = [];
  let posicion = 1;

  if (fecha_inicio) {
    consulta += ` AND g.fecha >= $${posicion}`;
    valores.push(fecha_inicio);
    posicion++;
  }

  if (fecha_fin) {
    consulta += ` AND g.fecha < ($${posicion}::date + INTERVAL '1 day')`;
    valores.push(fecha_fin);
    posicion++;
  }

  if (id_categoria) {
    consulta += ` AND g.id_categoria = $${posicion}`;
    valores.push(id_categoria);
    posicion++;
  }

  if (concepto) {
    consulta += ` AND g.concepto ILIKE $${posicion}`;
    valores.push(`%${concepto}%`);
    posicion++;
  }

  consulta += ` ORDER BY g.fecha DESC, g.id_gasto DESC`;

  const { rows } = await pool.query(consulta, valores);
  return rows;
}

// Consultar un gasto por su ID
export async function obtenerGastoPorId(id, client = pool, bloquear = false) {
  const consulta = `
    SELECT
      g.id_gasto,
      g.fecha,
      g.concepto,
      g.id_categoria,
      c.nombre AS categoria,
      g.monto,
      g.forma_pago,
      g.observaciones,
      g.id_usuario,
      g.estatus
    FROM gastos g
    INNER JOIN categorias c
      ON c.id_categoria = g.id_categoria
    WHERE g.id_gasto = $1
    ${bloquear ? 'FOR UPDATE OF g' : ''}
  `;

  const { rows } = await client.query(consulta, [id]);
  return rows[0] || null;
}

// Consultar categorías activas
export async function obtenerCategoriasGastos() {
  const consulta = `
    SELECT id_categoria, nombre
    FROM categorias
    WHERE estatus = 1
      AND id_categoria = 1
    ORDER BY nombre ASC
  `;

  const { rows } = await pool.query(consulta);
  return rows;
}

// Registrar un gasto
export async function registrarGasto(datos, client = pool) {
  const {
    fecha,
    concepto,
    id_categoria,
    monto,
    forma_pago,
    observaciones,
    id_usuario
  } = datos;

  const consulta = `
    INSERT INTO gastos (
      fecha,
      concepto,
      id_categoria,
      monto,
      forma_pago,
      observaciones,
      id_usuario
    )
    VALUES (
      COALESCE($1::timestamp, CURRENT_TIMESTAMP),
      $2, $3, $4, $5, $6, $7
    )
    RETURNING *
  `;

  const { rows } = await client.query(consulta, [
    fecha || null,
    concepto,
    id_categoria,
    monto,
    forma_pago,
    observaciones || null,
    id_usuario
  ]);

  return rows[0];
}

// Modificar un gasto
export async function actualizarGasto(id, datos, client = pool) {
  const {
    fecha,
    concepto,
    id_categoria,
    monto,
    forma_pago,
    observaciones
  } = datos;

  const consulta = `
    UPDATE gastos
    SET
      fecha = $1,
      concepto = $2,
      id_categoria = $3,
      monto = $4,
      forma_pago = $5,
      observaciones = $6
    WHERE id_gasto = $7
      AND estatus = 'activo'
    RETURNING *
  `;

  const { rows } = await client.query(consulta, [
    fecha,
    concepto,
    id_categoria,
    monto,
    forma_pago,
    observaciones || null,
    id
  ]);

  return rows[0] || null;
}

// Cancelar un gasto
export async function cancelarGasto(id, client = pool) {
  const consulta = `
    UPDATE gastos
    SET estatus = 'cancelado'
    WHERE id_gasto = $1
      AND estatus = 'activo'
    RETURNING *
  `;

  const { rows } = await client.query(consulta, [id]);

  return rows[0] || null;
}
// Consultar resumen de gastos
export async function obtenerResumenGastos() {
  const consulta = `
    SELECT
      COUNT(*) FILTER (WHERE estatus = 'activo') AS total_gastos,
      COALESCE(
        SUM(monto) FILTER (WHERE estatus = 'activo'),
        0
      ) AS monto_total,
      COUNT(*) FILTER (WHERE estatus = 'cancelado') AS gastos_cancelados
    FROM gastos
  `;

  const { rows } = await pool.query(consulta);
  return rows[0];
}
