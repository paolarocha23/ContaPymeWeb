import React, { useState, useMemo } from 'react';
import { X, RotateCcw, ArrowRight, Minus, Plus, Package, CircleAlert, CreditCard, Banknote } from 'lucide-react';
import { formatMoney } from '../../utils/ventasUtils';

const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * venta: objeto normalizado de DetalleVentaView
 * onConfirm(payload): debe llamar al endpoint de devolución (ver DetalleVentaView)
 */
export default function DevolucionModal({ venta, onClose, onConfirm }) {
  const [sel, setSel] = useState({});          // { [id_producto]: cantidad a devolver }
  const [resolucion, setResolucion] = useState(venta.saldo > 0 ? 'ajustar_cxc' : 'devolver_dinero');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filas = venta.items.map((it) => ({ ...it, disponible: Math.max(0, it.cantidad - (it.devuelta || 0)) }));

  const toggle = (it) =>
    setSel((prev) => {
      const copia = { ...prev };
      if (copia[it.id_producto]) delete copia[it.id_producto];
      else copia[it.id_producto] = 1;
      return copia;
    });

  const cambiar = (it, n) =>
    setSel((prev) => ({ ...prev, [it.id_producto]: Math.min(it.disponible, Math.max(1, n)) }));

  const elegidos = filas.filter((it) => sel[it.id_producto]);
  const monto = useMemo(
    () => redondear(elegidos.reduce((a, it) => a + sel[it.id_producto] * it.precio, 0)),
    [elegidos, sel]
  );
  const saldoNuevo = redondear(Math.max(0, venta.saldo - monto));
  const piezas = elegidos
    .filter((it) => it.tipo === 'producto')
    .reduce((a, it) => a + sel[it.id_producto], 0);
  const unicoProducto = elegidos.filter((it) => it.tipo === 'producto');

  const registrar = async () => {
    setError('');
    if (elegidos.length === 0) return setError('Selecciona al menos un producto a devolver.');
    if (!motivo.trim()) return setError('El motivo de la devolución es obligatorio.');
    setLoading(true);
    try {
      await onConfirm({
        motivo: motivo.trim(),
        resolucion,
        items: elegidos.map((it) => ({ id_producto: it.id_producto, cantidad: sel[it.id_producto] }))
      });
    } catch (err) {
      setError(err.message || 'No se pudo registrar la devolución.');
      setLoading(false);
    }
  };

  return (
    <div className="ventas-modal-backdrop" onClick={onClose}>
      <div className="ventas-modal-card" style={{ width: 'min(100%, 600px)' }} onClick={(e) => e.stopPropagation()}>
        <div className="ventas-modal-header">
          <div>
            <h3>Registrar devolución · {venta.codigo}</h3>
            <p>Selecciona los productos que el cliente devuelve, total o parcialmente.</p>
          </div>
          <button type="button" className="ventas-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="ventas-modal-body">
          {error && <div className="ven-alert"><CircleAlert size={18} />{error}</div>}

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
                const bloqueado = it.disponible <= 0;
                return (
                  <tr key={it.id_producto}>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: bloqueado ? 'not-allowed' : 'pointer' }}>
                        <input type="checkbox" checked={activo} disabled={bloqueado} onChange={() => toggle(it)} />
                        <b>{it.nombre}</b>
                      </label>
                    </td>
                    <td>{it.cantidad}</td>
                    <td>{formatMoney(it.precio)}</td>
                    <td>
                      {activo ? (
                        <div className="ven-stepper">
                          <button type="button" onClick={() => cambiar(it, sel[it.id_producto] - 1)}><Minus size={13} /></button>
                          <input
                            type="number"
                            value={sel[it.id_producto]}
                            onChange={(e) => cambiar(it, Number(e.target.value) || 1)}
                          />
                          <button type="button" onClick={() => cambiar(it, sel[it.id_producto] + 1)}><Plus size={13} /></button>
                        </div>
                      ) : (
                        <span className="ven-muted">{bloqueado ? 'Devuelto' : 0}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div>
            <div className="ven-dev-label">Resolución<i>*</i></div>
            <div className="ven-seg">
              <button
                type="button"
                className={resolucion === 'ajustar_cxc' ? 'on' : ''}
                disabled={venta.saldo <= 0}
                style={venta.saldo <= 0 ? { opacity: .5, cursor: 'not-allowed' } : undefined}
                onClick={() => setResolucion('ajustar_cxc')}
              >
                <CreditCard size={15} /> Ajustar cuenta por cobrar
              </button>
              <button
                type="button"
                className={resolucion === 'devolver_dinero' ? 'on' : ''}
                onClick={() => setResolucion('devolver_dinero')}
              >
                <Banknote size={15} /> Devolver dinero (salida de caja)
              </button>
            </div>
          </div>

          <div>
            <div className="ven-dev-label">Motivo de la devolución<i>*</i></div>
            <textarea
              className="ven-textarea"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Producto con falla de fábrica"
            />
          </div>

          <div className="ven-dev-resumen">
            <div>
              <small>Monto a devolver</small>
              <strong>{formatMoney(monto)}</strong>
            </div>
            {resolucion === 'ajustar_cxc' && (
              <>
                <span className="ven-dev-arrow"><ArrowRight size={15} /></span>
                <div style={{ textAlign: 'right' }}>
                  <small>Cuenta por cobrar {venta.cuenta?.codigo || ''}</small>
                  <strong>{formatMoney(venta.saldo)} → {formatMoney(saldoNuevo)}</strong>
                </div>
              </>
            )}
          </div>

          {piezas > 0 && (
            <div className="ven-note ok">
              <Package size={16} />
              {unicoProducto.length === 1 && piezas === 1
                ? `Se reingresa 1 pieza de ${unicoProducto[0].nombre} al inventario.`
                : `Se reingresan ${piezas} piezas al inventario.`}
            </div>
          )}
        </div>

        <div className="ventas-modal-footer">
          <button type="button" className="ven-btn ven-btn-outline" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" className="ven-btn ven-btn-primary" onClick={registrar} disabled={loading}>
            <RotateCcw size={15} /> {loading ? 'Registrando...' : 'Registrar devolución'}
          </button>
        </div>
      </div>
    </div>
  );
}