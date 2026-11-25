import pool from '../config/db.js';

// Consultar movimientos de Caja
export async function obtenerMovimientosCaja(filtros = {}, empresaId = null) {
  const {
    fecha_inicio,
    fecha_fin,
    tipo,
    concepto
  } = filtros;

  let consulta = `
    SELECT
      m.id_movimiento,
      TO_CHAR(m.fecha - INTERVAL '6 hours', 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha,
      m.tipo,
      m.concepto,
      m.monto,
      m.origen,
      m.id_referencia,
      m.id_usuario,
      COALESCE(u.nombre, 'Sistema') AS nombre_usuario,
      COALESCE(u.apellido_paterno, '') AS apellido_paterno
    FROM movimientos_caja m
    LEFT JOIN usuarios u
      ON u.id_usuario = m.id_usuario
    WHERE 1 = 1
  `;

  const valores = [];
  let posicion = 1;

  if (empresaId) {
    consulta += ` AND (m.empresa_id = $${posicion} OR m.empresa_id IS NULL)`;
    valores.push(empresaId);
    posicion++;
  }

  if (fecha_inicio) {
    consulta += ` AND (m.fecha - INTERVAL '6 hours')::date >= $${posicion}::date`;
    valores.push(fecha_inicio);
    posicion++;
  }

  if (fecha_fin) {
    consulta += ` AND (m.fecha - INTERVAL '6 hours')::date <= $${posicion}::date`;
    valores.push(fecha_fin);
    posicion++;
  }

  if (tipo) {
    consulta += ` AND m.tipo = $${posicion}`;
    valores.push(tipo);
    posicion++;
  }

  if (concepto) {
    consulta += ` AND m.concepto ILIKE $${posicion}`;
    valores.push(`%${concepto}%`);
    posicion++;
  }

  consulta += ` ORDER BY m.id_movimiento DESC`;

  const { rows } = await pool.query(consulta, valores);
  return rows;
}

// Consultar un movimiento por su ID
export async function obtenerMovimientoCajaPorId(id) {
  const consulta = `
    SELECT
      m.id_movimiento,
      TO_CHAR(m.fecha - INTERVAL '6 hours', 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha,
      m.tipo,
      m.concepto,
      m.monto,
      m.origen,
      m.id_referencia,
      m.id_usuario,
      COALESCE(u.nombre, 'Sistema') AS nombre_usuario,
      COALESCE(u.apellido_paterno, '') AS apellido_paterno
    FROM movimientos_caja m
    LEFT JOIN usuarios u
      ON u.id_usuario = m.id_usuario
    WHERE m.id_movimiento = $1
  `;

  const { rows } = await pool.query(consulta, [id]);
  return rows[0] || null;
}

// Registrar una entrada o salida manual de efectivo
export async function registrarMovimientoManual(datos, client = pool) {
  const {
    fecha,
    tipo,
    concepto,
    monto,
    id_usuario,
    empresa_id
  } = datos;

  const consulta = `
    INSERT INTO movimientos_caja (
      fecha,
      tipo,
      concepto,
      monto,
      origen,
      id_referencia,
      id_usuario,
      empresa_id
    )
    VALUES (
      COALESCE($1::timestamp, CURRENT_TIMESTAMP),
      $2,
      $3,
      $4,
      'manual',
      NULL,
      $5,
      $6
    )
    RETURNING *
  `;

  const { rows } = await client.query(consulta, [
    fecha || null,
    tipo,
    concepto,
    monto,
    id_usuario,
    empresa_id ?? 1
  ]);

  return rows[0];
}

// Consultar resumen de Caja
export async function obtenerResumenCaja(filtros = {}, empresaId = null) {
  const { fecha_inicio, fecha_fin } = filtros;

  let consulta = `
    SELECT
      COALESCE(
        SUM(monto) FILTER (WHERE tipo = 'entrada'),
        0
      ) AS total_entradas,
      COALESCE(
        SUM(monto) FILTER (WHERE tipo = 'salida'),
        0
      ) AS total_salidas,
      COALESCE(
        SUM(
          CASE
            WHEN tipo = 'entrada' THEN monto
            WHEN tipo = 'salida' THEN -monto
            ELSE 0
          END
        ),
        0
      ) AS saldo
    FROM movimientos_caja
    WHERE 1 = 1
  `;

  const valores = [];
  let posicion = 1;

  if (empresaId) {
    consulta += ` AND (empresa_id = $${posicion} OR empresa_id IS NULL)`;
    valores.push(empresaId);
    posicion++;
  }

  if (fecha_inicio) {
    consulta += ` AND (fecha - INTERVAL '6 hours')::date >= $${posicion}::date`;
    valores.push(fecha_inicio);
    posicion++;
  }

  if (fecha_fin) {
    consulta += ` AND (fecha - INTERVAL '6 hours')::date <= $${posicion}::date`;
    valores.push(fecha_fin);
    posicion++;
  }

  const { rows } = await pool.query(consulta, valores);
  return rows[0];
}