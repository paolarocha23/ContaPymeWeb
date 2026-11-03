import pool from '../config/db.js';

export const obtenerCuentas = async ({ estatus, busqueda } = {}) => {
    const condiciones = [];
    const valores = [];

    if (estatus) {
        valores.push(estatus);
        condiciones.push(`cp.estatus = $${valores.length}`);
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
            u.apellidos AS apellidos_usuario
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
