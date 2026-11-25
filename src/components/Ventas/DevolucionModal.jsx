import React, { useState, useMemo } from 'react';
import {
  X, RotateCcw, ArrowRight, Minus, Plus, Package, CircleAlert,
  CreditCard, Banknote, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { formatMoney } from '../../utils/ventasUtils';

const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export default function DevolucionModal({ venta, onClose, onConfirm }) {
  const [sel, setSel] = useState({}); // { [id_producto]: cantidad a devolver }
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Plazo máximo: 7 días naturales
  const fechaVenta = venta.fecha ? new Date(venta.fecha) : null;
  const diasTranscurridos = fechaVenta ? (Date.now() - fechaVenta.getTime()) / (1000 * 60 * 60 * 24) : 0;
  const expirado7Dias = diasTranscurridos > 7.001;
  const fechaVentaStr = fechaVenta
    ? fechaVenta.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  // Productos vs Servicios: Solo productos físicos son devolubles
  const filas = (venta.items || []).map((it) => {
    const esServicio = String(it.tipo || it.tipo_producto || '').toLowerCase() === 'servicio';
    const devuelta = Number(it.devuelta || 0);
    const disponible = esServicio ? 0 : Math.max(0, it.cantidad - devuelta);
    return {
      ...it,
      esServicio,
      devuelta,
      disponible
    };
  });

  const toggle = (it) => {
    if (it.esServicio || it.disponible <= 0) return;
    setSel((prev) => {
      const copia = { ...prev };
      if (copia[it.id_producto]) delete copia[it.id_producto];
      else copia[it.id_producto] = 1;
      return copia;
    });
  };

  const cambiar = (it, n) => {
    if (it.esServicio) return;
    setSel((prev) => ({
      ...prev,
      [it.id_producto]: Math.min(it.disponible, Math.max(1, n))
    }));
  };

  const elegidos = filas.filter((it) => sel[it.id_producto]);

  const montoDevuelto = useMemo(
    () => redondear(elegidos.reduce((a, it) => a + sel[it.id_producto] * Number(it.precio), 0)),
    [elegidos, sel]
  );

  const pagado = Number(venta.monto_pagado ?? venta.pagado ?? 0);
  const deudaActual = Number(venta.saldo ?? venta.saldo_pendiente ?? 0);

  // Reglas financieras:
  // 1. En venta a crédito o saldo pendiente, primero se reduce la deuda.
  const reduccionDeuda = redondear(Math.min(deudaActual, montoDevuelto));
  const saldoNuevo = redondear(Math.max(0, deudaActual - reduccionDeuda));

  // 2. Solo se reembolsa lo que supere la deuda, sin exceder lo efectivamente pagado
  const excesoReembolso = redondear(Math.min(pagado, Math.max(0, montoDevuelto - deudaActual)));

  // Medio de pago original
  const formaPago = String(venta.forma_pago || venta.formaPago || '').toLowerCase();
  const esEfectivo = formaPago === 'efectivo';

  const piezas = elegidos
    .filter((it) => !it.esServicio)
    .reduce((a, it) => a + sel[it.id_producto], 0);

  const registrar = async () => {
    setError('');
    if (expirado7Dias) {
      return setError('No se puede registrar la devolución: Han transcurrido más de 7 días naturales desde la venta.');
    }
    if (elegidos.length === 0) {
      return setError('Selecciona al menos un producto físico a devolver.');
    }
    if (!motivo.trim()) {
      return setError('El motivo de la devolución es obligatorio.');
    }

    setLoading(true);
    try {
      await onConfirm({
        motivo: motivo.trim(),
        tipo: 'parcial',
        items: elegidos.map((it) => ({
          id_producto: it.id_producto,
          cantidad: sel[it.id_producto]
        }))
      });
    } catch (err) {
      setError(err.message || 'No se pudo registrar la devolución.');
      setLoading(false);
    }
  };

  return (
    <div className="ventas-modal-backdrop" onClick={onClose}>
      <div className="ventas-modal-card" style={{ width: 'min(100%, 650px)' }} onClick={(e) => e.stopPropagation()}>
        <div className="ventas-modal-header">
          <div>
            <h3>Registrar devolución · {venta.codigo}</h3>
            <p>Devolución vinculada a la venta confirmada del {fechaVentaStr}.</p>
          </div>
          <button type="button" className="ventas-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="ventas-modal-body">
          {expirado7Dias && (
            <div className="ven-alert" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}>
              <ShieldAlert size={20} />
              <div>
                <strong>Plazo de 7 días naturales vencido</strong>
                <p style={{ margin: '2px 0 0', fontSize: 13 }}>
                  Esta venta es del {fechaVentaStr} (hace {Math.floor(diasTranscurridos)} días).
                  Conforme a la política de la empresa, no se aceptan devoluciones después de 7 días naturales.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="ven-alert">
              <CircleAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          <table className="ven-dev-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Vendidos</th>
                <th>Precio unit.</th>
                <th>A devolver</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((it) => {
                const activo = Boolean(sel[it.id_producto]);
                const bloqueado = it.esServicio || it.disponible <= 0;

                return (
                  <tr key={it.id_producto} style={it.esServicio ? { opacity: 0.65 } : undefined}>
                    <td>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: bloqueado ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={activo}
                          disabled={bloqueado || expirado7Dias}
                          onChange={() => toggle(it)}
                        />
                        <span style={{ fontWeight: 600 }}>{it.nombre}</span>
                      </label>
                      {it.esServicio && (
                        <span
                          className="ven-pill red"
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            display: 'inline-block',
                            marginTop: '2px'
                          }}
                        >
                          Servicio (no devoluble)
                        </span>
                      )}
                    </td>
                    <td>{it.cantidad}</td>
                    <td>{formatMoney(it.precio)}</td>
                    <td>
                      {activo ? (
                        <div className="ven-stepper">
                          <button
                            type="button"
                            onClick={() => cambiar(it, sel[it.id_producto] - 1)}
                            disabled={expirado7Dias}
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={it.disponible}
                            value={sel[it.id_producto]}
                            disabled={expirado7Dias}
                            onChange={(e) => cambiar(it, Number(e.target.value) || 1)}
                          />
                          <button
                            type="button"
                            onClick={() => cambiar(it, sel[it.id_producto] + 1)}
                            disabled={expirado7Dias}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="ven-muted">
                          {it.esServicio ? '—' : it.disponible <= 0 ? 'Devuelto' : 0}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Desglose financiero según reglas de negocio */}
          {montoDevuelto > 0 && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px'
              }}
            >
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                Impacto financiero de la devolución:
              </div>

              {reduccionDeuda > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', marginBottom: '6px' }}>
                  <CreditCard size={16} />
                  <span>
                    <strong>Disminución de deuda (CxC):</strong> Se reducen {formatMoney(reduccionDeuda)} del saldo pendiente. (Deuda restante: {formatMoney(saldoNuevo)})
                  </span>
                </div>
              )}

              {excesoReembolso > 0 ? (
                esEfectivo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginTop: '4px' }}>
                    <Banknote size={16} />
                    <span>
                      <strong>Reembolso en efectivo al cliente:</strong> {formatMoney(excesoReembolso)} (Se registrará una <u>salida de dinero en Caja</u>).
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4338ca', marginTop: '4px' }}>
                    <CreditCard size={16} />
                    <span>
                      <strong>Reembolso a tarjeta:</strong> {formatMoney(excesoReembolso)} (Reversión contable en ingresos; <u>no afecta caja física</u>).
                    </span>
                  </div>
                )
              ) : (
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  • No se genera salida de dinero al cliente porque el valor devuelto se acreditó a su saldo adeudado.
                </div>
              )}
            </div>
          )}

          <div>
            <div className="ven-dev-label">Motivo de la devolución<i>*</i></div>
            <textarea
              className="ven-textarea"
              value={motivo}
              disabled={expirado7Dias}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Producto defectuoso de fábrica / inconformidad del cliente"
            />
          </div>

          <div className="ven-dev-resumen">
            <div>
              <small>Monto de mercancía devuelta</small>
              <strong>{formatMoney(montoDevuelto)}</strong>
            </div>
            {reduccionDeuda > 0 && (
              <>
                <span className="ven-dev-arrow"><ArrowRight size={15} /></span>
                <div style={{ textAlign: 'right' }}>
                  <small>Saldo CxC</small>
                  <strong>{formatMoney(deudaActual)} → {formatMoney(saldoNuevo)}</strong>
                </div>
              </>
            )}
          </div>

          {piezas > 0 && (
            <div className="ven-note ok">
              <Package size={16} />
              {piezas === 1
                ? `Se reingresará 1 pieza física al inventario.`
                : `Se reingresarán ${piezas} piezas físicas al inventario.`}
            </div>
          )}
        </div>

        <div className="ventas-modal-footer">
          <button type="button" className="ven-btn ven-btn-outline" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="ven-btn ven-btn-primary"
            onClick={registrar}
            disabled={loading || expirado7Dias || elegidos.length === 0}
          >
            <RotateCcw size={15} /> {loading ? 'Registrando...' : 'Registrar devolución'}
          </button>
        </div>
      </div>
    </div>
  );
}
