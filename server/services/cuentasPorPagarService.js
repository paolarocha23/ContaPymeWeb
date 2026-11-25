import pool from '../config/db.js';
import {
    obtenerCuentas as consultarCuentas,
    obtenerCuentaPorId as consultarCuentaPorId,
    obtenerPagos as consultarPagos,
    obtenerResumen as consultarResumen,
    obtenerCuentaParaPago,
    registrarPagoCxp,
    actualizarSaldoCxp
} from '../repositories/cuentasPorPagarRepository.js';
import {
    registrarMovimientoCaja
} from '../repositories/gastosRepository.js';
import { AppError } from '../utils/http.js';

export const obtenerCuentas = async (filtros, empresaId = null) => {
    return await consultarCuentas(filtros, empresaId);
};

export const obtenerCuentaPorId = async (id) => {
    const cuenta = await consultarCuentaPorId(id);

    if (!cuenta) {
        throw new AppError('La cuenta por pagar no existe.', 404);
    }

    return cuenta;
};

export const obtenerPagos = async (id) => {
    await obtenerCuentaPorId(id);
    return await consultarPagos(id);
};

export const obtenerResumen = async (empresaId = null) => {
    return await consultarResumen(empresaId);
};

// Registrar un pago parcial o total de CxP
export const registrarPago = async (idCxp, datos, idUsuario, empresaId = null) => {
    const id = Number(idCxp);
    const monto = Number(datos?.monto);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AppError('El identificador de la cuenta no es válido.', 400);
    }

    if (!Number.isSafeInteger(Number(idUsuario)) ||
        Number(idUsuario) <= 0) {
        throw new AppError('No se pudo identificar al usuario.', 401);
    }

    if (
        datos?.monto === undefined ||
        datos?.monto === null ||
        String(datos.monto).trim() === '' ||
        !Number.isFinite(monto) ||
        monto <= 0 ||
        !Number.isSafeInteger(Math.round(monto * 100)) ||
        Math.abs(monto * 100 - Math.round(monto * 100)) > 1e-7
    ) {
        throw new AppError(
            'El monto debe ser positivo y tener máximo dos decimales.',
            400
        );
    }

    const formasPermitidas = ['efectivo', 'tarjeta', 'transfer'];

    if (!formasPermitidas.includes(datos?.forma_pago)) {
        throw new AppError('La forma de pago no es válida.', 400);
    }

    if (datos?.fecha &&
        Number.isNaN(Date.parse(datos.fecha))) {
        throw new AppError('La fecha del pago no es válida.', 400);
    }

    if (
        datos?.observaciones != null &&
        typeof datos.observaciones !== 'string'
    ) {
        throw new AppError('Las observaciones no son válidas.', 400);
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Bloquear la cuenta para evitar pagos simultáneos.
        const cuenta = await obtenerCuentaParaPago(id, client);

        if (!cuenta) {
            throw new AppError('La cuenta por pagar no existe.', 404);
        }

        // Convertir el saldo a centavos para evitar errores
        // de precisión en las operaciones aritméticas.
        const saldoCentavos = Math.round(
            Number(cuenta.saldo_pendiente) * 100
        );

        const montoCentavos = Math.round(monto * 100);

        if (!Number.isSafeInteger(saldoCentavos) ||
            !Number.isSafeInteger(montoCentavos)) {
            throw new AppError(
                'El saldo o monto excede el rango permitido.',
                400
            );
        }

        if (saldoCentavos <= 0) {
            throw new AppError(
                'Esta cuenta ya se encuentra liquidada.',
                400
            );
        }

        if (montoCentavos > saldoCentavos) {
            throw new AppError(
                'El pago no puede superar el saldo pendiente.',
                400
            );
        }

        const nuevoSaldoCentavos = saldoCentavos - montoCentavos;
        const nuevoSaldo = (nuevoSaldoCentavos / 100).toFixed(2);
        const nuevoEstatus =
            nuevoSaldoCentavos === 0 ? 'saldada' : 'parcial';

        // Guardar el pago.
        const pago = await registrarPagoCxp({
            id_cxp: id,
            fecha: datos.fecha || null,
            monto: monto.toFixed(2),
            forma_pago: datos.forma_pago,
            id_usuario: Number(idUsuario),
            observaciones: datos.observaciones?.trim() || null,
            empresa_id: empresaId || cuenta.empresa_id || 1
        }, client);

        // Actualizar el saldo y estatus de la cuenta por pagar (RDF1504).
        const cuentaActualizada = await actualizarSaldoCxp(
            id,
            nuevoSaldo,
            nuevoEstatus,
            client
        );

        // Actualizar el estatus de la compra asociada si aplica.
        if (cuenta.id_compra) {
            const estatusCompra = nuevoSaldoCentavos === 0 ? 'pagada' : 'parcial';
            await client.query(`
                UPDATE compras
                SET estatus = $1
                WHERE id_compra = $2
            `, [estatusCompra, cuenta.id_compra]);
        }

        // RDF1502: Generar el gasto por el pago realizado al proveedor.
        const catRes = await client.query(`
            SELECT id_categoria
            FROM categorias
            WHERE estatus = 1 AND ($1::int IS NULL OR empresa_id = $1)
            ORDER BY
              CASE
                WHEN LOWER(TRIM(nombre)) LIKE '%compra%' THEN 0
                WHEN LOWER(TRIM(nombre)) LIKE '%mercanc%' THEN 1
                WHEN LOWER(TRIM(nombre)) LIKE '%proveedor%' THEN 2
                WHEN LOWER(TRIM(nombre)) LIKE '%operativ%' THEN 3
                ELSE 4
              END,
              id_categoria ASC
            LIMIT 1
        `, [empresaId || cuenta.empresa_id]);

        const idCategoria = catRes.rows[0]?.id_categoria || 1;
        const conceptoGasto = `Pago de cuenta por pagar #${id}${cuenta.codigo_compra ? ' - Compra ' + cuenta.codigo_compra : ''}`;

        const gastoRes = await client.query(`
            INSERT INTO gastos (
                fecha,
                concepto,
                id_categoria,
                monto,
                forma_pago,
                observaciones,
                id_usuario,
                estatus,
                empresa_id
            )
            VALUES (
                COALESCE($1::timestamp, CURRENT_TIMESTAMP),
                $2, $3, $4, $5, $6, $7, 'activo', $8
            )
            RETURNING *
        `, [
            pago.fecha,
            conceptoGasto,
            idCategoria,
            monto.toFixed(2),
            datos.forma_pago,
            datos.observaciones?.trim() || `Pago de cuenta por pagar #${id}`,
            Number(idUsuario),
            empresaId || cuenta.empresa_id || 1
        ]);

        const gasto = gastoRes.rows[0];

        // Solo los pagos en efectivo afectan Caja (RDF1502 / RF13).
        let movimientoCaja = null;

        if (String(datos.forma_pago || '').trim().toLowerCase() === 'efectivo') {
            movimientoCaja = await registrarMovimientoCaja({
                fecha: datos.fecha || null,
                tipo: 'salida',
                concepto: conceptoGasto,
                monto: pago.monto,
                origen: 'cxp',
                id_referencia: pago.id_pago,
                id_usuario: Number(idUsuario),
                empresa_id: empresaId || cuenta.empresa_id || 1
            }, client);
        }

        await client.query('COMMIT');

        return {
            pago,
            cuenta: cuentaActualizada,
            gasto,
            movimiento_caja: movimientoCaja
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
};
