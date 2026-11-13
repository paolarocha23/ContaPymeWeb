import pool from '../config/db.js';

export const obtenerCuentas = async ({ estatus, busqueda } = {}) => {
    const condiciones = [];
    const valores = [];

    if (estatus) {
        const estado = String(estatus).trim().toLowerCase();

        if (estado === 'vencida') {
            condiciones.push('cp.saldo_pendiente > 0');
            condiciones.push('cp.fecha_vencimiento < CURRENT_DATE');
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
            p.nombre_empresa AS proveedor,
            c.codigo AS codigo_compra
        FROM cuentas_por_pagar cp
        INNER JOIN proveedores p
            ON p.id_proveedor = cp.id_proveedor
        INNER JOIN compras c
            ON c.id_compra = cp.id_compra
        ${where}
        ORDER BY cp.fecha_vencimiento ASC, cp.id_cxp DESC;
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

export const obtenerResumen = async () => {
    const query = `
        SELECT
            COUNT(*) AS total_cuentas,
            COUNT(*) FILTER (
                WHERE saldo_pendiente > 0
            ) AS cuentas_pendientes,
            COUNT(*) FILTER (
                WHERE saldo_pendiente > 0
                AND fecha_vencimiento < CURRENT_DATE
            ) AS cuentas_vencidas,
            COALESCE(
                SUM(saldo_pendiente) FILTER (
                    WHERE saldo_pendiente > 0
                ), 0
            ) AS saldo_pendiente,
            COALESCE(
                SUM(saldo_pendiente) FILTER (
                    WHERE saldo_pendiente > 0
                    AND fecha_vencimiento < CURRENT_DATE
                ), 0
            ) AS saldo_vencido
        FROM cuentas_por_pagar;
    `;

    const { rows } = await pool.query(query);
    return rows[0];
};


//Obtener una cuenta bloqueándola durante una transacción
export const obtenerCuentaParaPago = async (idCxp, client) => {
    const query = `
        SELECT
            id_cxp,
            id_compra,
            id_proveedor,
            monto_original,
            saldo_pendiente,
            estatus
        FROM cuentas_por_pagar
        WHERE id_cxp = $1
        FOR UPDATE;
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
        observaciones
    } = datos;

    const query = `
        INSERT INTO cxp_pagos (
            id_cxp,
            fecha,
            monto,
            forma_pago,
            id_usuario,
            observaciones
        )
        VALUES (
            $1,
            COALESCE($2::timestamp, CURRENT_TIMESTAMP),
            $3,
            $4,
            $5,
            $6
        )
        RETURNING *;
    `;

    const { rows } = await client.query(query, [
        id_cxp,
        fecha || null,
        monto,
        forma_pago,
        id_usuario,
        observaciones || null
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
