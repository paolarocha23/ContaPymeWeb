import pool from '../config/db.js';

export const obtenerCuentas = async ({ estatus, busqueda } = {}, empresaId = null) => {
    const condiciones = [];
    const valores = [];

    if (empresaId) {
        valores.push(empresaId);
        condiciones.push(`cp.empresa_id = $${valores.length}`);
    }

    if (estatus && estatus !== 'todas') {
        const estado = String(estatus).trim().toLowerCase();

        if (estado === 'vencida') {
            condiciones.push('cp.saldo_pendiente > 0');
            condiciones.push('cp.fecha_vencimiento < CURRENT_DATE');
            condiciones.push(`LOWER(TRIM(cp.estatus)) NOT IN ('cancelada', 'saldada', 'pagada')`);
        } else if (estado === 'saldada' || estado === 'pagada') {
            condiciones.push(`(LOWER(TRIM(cp.estatus)) IN ('saldada', 'pagada') OR cp.saldo_pendiente <= 0)`);
        } else if (estado === 'pendiente') {
            condiciones.push(`LOWER(TRIM(cp.estatus)) = 'pendiente'`);
            condiciones.push('cp.fecha_vencimiento >= CURRENT_DATE');
            condiciones.push('cp.saldo_pendiente > 0');
        } else if (estado === 'parcial') {
            condiciones.push(`LOWER(TRIM(cp.estatus)) = 'parcial'`);
            condiciones.push('cp.saldo_pendiente > 0');
        } else {
            valores.push(estado);
            condiciones.push(
                `LOWER(cp.estatus) = $${valores.length}`
            );
        }
    }

    if (busqueda) {
        valores.push(`%${busqueda}%`);
        condiciones.push(`(
            p.nombre_empresa ILIKE $${valores.length}
            OR c.codigo ILIKE $${valores.length}
            OR CAST(cp.id_cxp AS TEXT) ILIKE $${valores.length}
        )`);
    }

    const where = condiciones.length
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    const query = `
        SELECT
            cp.id_cxp,
            cp.id_proveedor,
            cp.id_compra,
            cp.fecha_emision,
            cp.fecha_vencimiento,
            cp.monto_original,
            cp.saldo_pendiente,
            cp.estatus,
            CASE
              WHEN LOWER(TRIM(cp.estatus)) = 'cancelada' THEN 'Cancelada'
              WHEN COALESCE(cp.saldo_pendiente, 0) <= 0
                OR LOWER(TRIM(cp.estatus)) IN ('saldada', 'pagada') THEN 'Saldada'
              WHEN cp.fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
              WHEN LOWER(TRIM(cp.estatus)) = 'parcial' THEN 'Parcial'
              ELSE 'Pendiente'
            END AS estado_calculado,
            p.nombre_empresa AS proveedor,
            c.codigo AS codigo_compra
        FROM cuentas_por_pagar cp
        INNER JOIN proveedores p
            ON p.id_proveedor = cp.id_proveedor
        INNER JOIN compras c
            ON c.id_compra = cp.id_compra
        ${where}
        ORDER BY
            CASE
                WHEN cp.saldo_pendiente > 0 AND cp.fecha_vencimiento < CURRENT_DATE THEN 0
                ELSE 1
            END,
            cp.fecha_vencimiento ASC,
            cp.id_cxp DESC;
    `;

    const { rows } = await pool.query(query, valores);
    return rows;
};

export const obtenerCuentaPorId = async (id) => {
    const query = `
        SELECT
            cp.id_cxp,
            cp.id_proveedor,
            cp.id_compra,
            cp.fecha_emision,
            cp.fecha_vencimiento,
            cp.monto_original,
            cp.saldo_pendiente,
            cp.estatus,
            p.nombre_empresa AS proveedor,
            p.nombre_contacto,
            p.telefono,
            p.correo,
            c.codigo AS codigo_compra,
            c.fecha AS fecha_compra,
            c.condiciones_pago
        FROM cuentas_por_pagar cp
        INNER JOIN proveedores p
            ON p.id_proveedor = cp.id_proveedor
        INNER JOIN compras c
            ON c.id_compra = cp.id_compra
        WHERE cp.id_cxp = $1;
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

export const obtenerPagos = async (idCxp) => {
    const query = `
        SELECT
            pg.id_pago,
            pg.id_cxp,
            pg.fecha,
            pg.monto,
            pg.forma_pago,
            pg.observaciones,
            u.nombre AS nombre_usuario,
            TRIM(CONCAT_WS(' ', u.apellido_paterno, u.apellido_materno)) AS apellidos_usuario
        FROM cxp_pagos pg
        INNER JOIN usuarios u
            ON u.id_usuario = pg.id_usuario
        WHERE pg.id_cxp = $1
        ORDER BY pg.fecha DESC, pg.id_pago DESC;
    `;

    const { rows } = await pool.query(query, [idCxp]);
    return rows;
};

export const obtenerResumen = async (empresaId = null) => {
    const query = `
        SELECT
            COUNT(*) FILTER (
                WHERE LOWER(TRIM(estatus)) <> 'cancelada'
            )::INTEGER AS total_cuentas,
            COUNT(*) FILTER (
                WHERE LOWER(TRIM(estatus)) = 'pendiente'
                AND saldo_pendiente > 0
                AND fecha_vencimiento >= CURRENT_DATE
            )::INTEGER AS cuentas_pendientes,
            COUNT(*) FILTER (
                WHERE saldo_pendiente > 0
                AND fecha_vencimiento < CURRENT_DATE
                AND LOWER(TRIM(estatus)) NOT IN ('cancelada', 'saldada', 'pagada')
            )::INTEGER AS cuentas_vencidas,
            COUNT(*) FILTER (
                WHERE LOWER(TRIM(estatus)) = 'parcial'
                AND saldo_pendiente > 0
            )::INTEGER AS cuentas_parciales,
            COALESCE(
                SUM(saldo_pendiente) FILTER (
                    WHERE saldo_pendiente > 0
                    AND LOWER(TRIM(estatus)) NOT IN ('cancelada', 'saldada', 'pagada')
                ), 0
            ) AS saldo_pendiente,
            COALESCE(
                SUM(saldo_pendiente) FILTER (
                    WHERE saldo_pendiente > 0
                    AND fecha_vencimiento < CURRENT_DATE
                    AND LOWER(TRIM(estatus)) NOT IN ('cancelada', 'saldada', 'pagada')
                ), 0
            ) AS saldo_vencido
        FROM cuentas_por_pagar
        WHERE ($1::int IS NULL OR empresa_id = $1);
    `;

    const { rows } = await pool.query(query, [empresaId]);
    return rows[0];
};


//Obtener una cuenta bloqueándola durante una transacción
export const obtenerCuentaParaPago = async (idCxp, client) => {
    const query = `
        SELECT
            cp.id_cxp,
            cp.id_compra,
            cp.id_proveedor,
            cp.monto_original,
            cp.saldo_pendiente,
            cp.estatus,
            cp.empresa_id,
            c.codigo AS codigo_compra
        FROM cuentas_por_pagar cp
        INNER JOIN compras c ON c.id_compra = cp.id_compra
        WHERE cp.id_cxp = $1
        FOR UPDATE OF cp;
    `;

    const { rows } = await client.query(query, [idCxp]);
    return rows[0] || null;
};

// Registrar un pago en el historial de CxP
export const registrarPagoCxp = async (datos, client) => {
    const {
        id_cxp,
        fecha,
        monto,
        forma_pago,
        id_usuario,
        observaciones,
        empresa_id
    } = datos;

    const query = `
        INSERT INTO cxp_pagos (
            id_cxp,
            fecha,
            monto,
            forma_pago,
            id_usuario,
            observaciones,
            empresa_id
        )
        VALUES (
            $1,
            COALESCE($2::timestamp, CURRENT_TIMESTAMP),
            $3,
            $4,
            $5,
            $6,
            $7
        )
        RETURNING *;
    `;

    const { rows } = await client.query(query, [
        id_cxp,
        fecha || null,
        monto,
        forma_pago,
        id_usuario,
        observaciones || null,
        empresa_id ?? 1
    ]);

    return rows[0];
};

// Actualizar saldo y estatus después de un pago
export const actualizarSaldoCxp = async (
    idCxp,
    nuevoSaldo,
    nuevoEstatus,
    client
) => {
    const query = `
        UPDATE cuentas_por_pagar
        SET
            saldo_pendiente = $1,
            estatus = $2
        WHERE id_cxp = $3
        RETURNING *;
    `;

    const { rows } = await client.query(query, [
        nuevoSaldo,
        nuevoEstatus,
        idCxp
    ]);

    return rows[0] || null;
};
