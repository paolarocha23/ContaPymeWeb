import React, { useState } from 'react';

const numero = (v) => new Intl.NumberFormat('es-MX').format(Number(v || 0));

export default function MovimientoModal({
  tipo,
  productos = [],
  productoInicial = null,
  onClose,
  onSave,
  saving = false
}) {
  const [form, setForm] = useState({
    id_producto: productoInicial?.id_producto ? String(productoInicial.id_producto) : '',
    cantidad: '',
    existencia_real: '',
    motivo: ''
  });
  const [error, setError] = useState('');

  const esAjuste = tipo === 'ajuste';
  const producto = productos.find((p) => String(p.id_producto) === String(form.id_producto));

  const titulo = esAjuste
    ? 'Ajustar inventario'
    : tipo === 'entrada'
      ? 'Registrar entrada'
      : 'Registrar salida';

  const enviar = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.id_producto) {
      setError('Selecciona un producto.');
      return;
    }

    if (!form.motivo.trim()) {
      setError('El motivo es obligatorio.');
      return;
    }

    const cantidad = Number(esAjuste ? form.existencia_real : form.cantidad);
    const minimo = esAjuste ? 0 : 1;

    if (!Number.isInteger(cantidad) || cantidad < minimo || cantidad > 999999999) {
      setError(esAjuste
        ? 'La existencia real debe ser un entero mayor o igual a cero.'
        : 'La cantidad debe ser un entero mayor a cero.');
      return;
    }

    // Contrato exacto del validator del backend:
    // entrada/salida: cantidad; ajuste: existencia_real.
    const payload = esAjuste
      ? {
          id_producto: Number(form.id_producto),
          existencia_real: cantidad,
          motivo: form.motivo.trim()
        }
      : {
          id_producto: Number(form.id_producto),
          cantidad,
          motivo: form.motivo.trim()
        };

    const ok = await onSave(payload);
    if (ok) onClose();
  };

  return (
    <div className="inv-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="inv-modal" onSubmit={enviar}>
        <header className="inv-modal-head">
          <div>
            <h3>{titulo}</h3>
            <p>
              {esAjuste
                ? 'Registra la existencia real después del conteo físico.'
                : tipo === 'entrada'
                  ? 'Agrega unidades a la existencia del producto.'
                  : 'Registra la cantidad que saldrá del inventario.'}
            </p>
          </div>
          <button type="button" className="inv-close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <label className="inv-field">
          Producto
          <select
            value={form.id_producto}
            onChange={(e) => setForm((f) => ({ ...f, id_producto: e.target.value }))}
          >
            <option value="">Selecciona un producto</option>
            {productos.map((p) => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.codigo} — {p.nombre} (stock: {numero(p.stock)})
              </option>
            ))}
          </select>
        </label>

        {producto && (
          <div className="inv-current-stock">
            Existencia actual:
            <strong>{numero(producto.stock)} {producto.unidad_medida || 'piezas'}</strong>
          </div>
        )}

        <label className="inv-field">
          {esAjuste ? 'Existencia real' : 'Cantidad'}
          <input
            type="number"
            min={esAjuste ? 0 : 1}
            max="999999999"
            step="1"
            value={esAjuste ? form.existencia_real : form.cantidad}
            onChange={(e) => setForm((f) => ({
              ...f,
              [esAjuste ? 'existencia_real' : 'cantidad']: e.target.value
            }))}
            placeholder={esAjuste ? 'Ej. 25' : 'Ej. 10'}
          />
          {esAjuste && <small className="inv-hint">Se guardará la diferencia entre la existencia actual y el conteo físico.</small>}
        </label>

        <label className="inv-field">
          Motivo
          <textarea
            rows="3"
            maxLength="255"
            value={form.motivo}
            onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
            placeholder={esAjuste ? 'Ej. Conteo físico' : tipo === 'entrada' ? 'Ej. Compra de mercancía' : 'Ej. Venta o consumo'}
          />
          <small className="inv-hint">Máximo 255 caracteres. Campo obligatorio.</small>
        </label>

        {error && <p className="inv-form-error" role="alert">{error}</p>}

        <footer className="inv-modal-actions">
          <button type="button" className="btn btn-light" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar movimiento'}
          </button>
        </footer>
      </form>
    </div>
  );
}
