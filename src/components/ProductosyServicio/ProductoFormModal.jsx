import React, { useState } from 'react';
import {
  X, CircleAlert, Package, Wrench, Barcode, Tag, Ruler, DollarSign,
  Boxes, TriangleAlert, Plus, RotateCw
} from 'lucide-react';

import { formatoIdProducto } from './productoMapper';
import { UNIDADES } from './constants';

const INICIAL = {
  codigo: '', nombre: '', descripcion: '', tipo: 'producto',
  id_categoria: '', unidad_medida: '',
  precio_compra: '', precio_venta: '', stock: '', stock_minimo: ''
};

const aTexto = (v) => (v === null || v === undefined ? '' : String(v));

export default function ProductoFormModal({ producto, categorias, onClose, onSave }) {
  const editando = Boolean(producto);

  const [form, setForm] = useState(() => editando ? {
    codigo: aTexto(producto.codigo),
    nombre: aTexto(producto.nombre),
    descripcion: aTexto(producto.descripcion),
    tipo: producto.tipo ?? 'producto',
    id_categoria: aTexto(producto.id_categoria),
    unidad_medida: aTexto(producto.unidad_medida),
    precio_compra: aTexto(producto.precio_compra),
    precio_venta: aTexto(producto.precio_venta),
    stock: aTexto(producto.stock),
    stock_minimo: aTexto(producto.stock_minimo)
  } : INICIAL);

  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');

  const esProducto = form.tipo === 'producto';

  // Si la unidad guardada no está en la lista, la agregamos para no perderla al editar.
  // Si la categoría actual ya no está activa, la dejamos visible para no perderla al editar.
  const opcionesCategoria = categorias.some(c => Number(c.id_categoria) === Number(producto?.id_categoria)) || !editando
    ? categorias
    : [{ id_categoria: producto.id_categoria, nombre: producto.nombre_categoria }, ...categorias];

  const unidades = form.unidad_medida && !UNIDADES.includes(form.unidad_medida)
    ? [form.unidad_medida, ...UNIDADES]
    : UNIDADES;

  const poner = (nombre, valor) => {
    setForm(actual => ({ ...actual, [nombre]: valor }));
    setErrores(actual => ({ ...actual, [nombre]: '' }));
  };

  const cambiar = (e) => poner(e.target.name, e.target.value);

  const elegirTipo = (tipo) => {
    setForm(actual => ({
      ...actual,
      tipo,
      ...(tipo === 'servicio' ? { stock: '', stock_minimo: '' } : {})
    }));
  };

  const precioInvalido = (v) => v === '' || !Number.isFinite(Number(v)) || Number(v) < 0;
  const enteroInvalido = (v) => v === '' || !Number.isInteger(Number(v)) || Number(v) < 0;

  const validar = () => {
    const n = {};
    if (!form.codigo.trim()) n.codigo = 'El código es obligatorio.';
    if (!form.nombre.trim()) n.nombre = 'El nombre es obligatorio.';
    if (!form.id_categoria) n.id_categoria = 'Selecciona una categoría.';
    if (!form.unidad_medida.trim()) n.unidad_medida = 'Selecciona una unidad.';
    if (precioInvalido(form.precio_compra)) n.precio_compra = 'Ingresa un precio de compra válido.';
    if (precioInvalido(form.precio_venta)) n.precio_venta = 'Ingresa un precio de venta válido.';
    if (esProducto) {
      if (enteroInvalido(form.stock)) n.stock = 'Ingresa un entero mayor o igual a cero.';
      if (enteroInvalido(form.stock_minimo)) n.stock_minimo = 'Ingresa un entero mayor o igual a cero.';
    }
    setErrores(n);
    return Object.keys(n).length === 0;
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setGuardando(true);
    setErrorServidor('');
    try {
      await onSave({
        ...form,
        id_categoria: Number(form.id_categoria),
        precio_compra: Number(form.precio_compra),
        precio_venta: Number(form.precio_venta),
        stock: esProducto ? Number(form.stock) : null,
        stock_minimo: esProducto ? Number(form.stock_minimo) : null
      });
    } catch (err) {
      setErrorServidor(err.message || 'No se pudo guardar el registro.');
    } finally {
      setGuardando(false);
    }
  };

  // Se llama como función (no como <Componente/>) para que el input no pierda el foco al escribir.
  const campo = ({ name, label, icon: Icono, type = 'text', placeholder, step, hint, disabled }) => (
    <div className="prd-campo">
      <label className="form-label">{label}</label>
      <div className="prd-input">
        {Icono && <Icono className="prd-input-ico" size={16} />}
        <input
          className={`form-input${errores[name] ? ' is-invalid' : ''}`}
          name={name}
          type={type}
          value={form[name]}
          onChange={cambiar}
          placeholder={placeholder}
          min={type === 'number' ? '0' : undefined}
          step={step}
          disabled={guardando || disabled}
        />
      </div>
      {hint && !errores[name] && <div className="prd-hint">{hint}</div>}
      {errores[name] && <div className="cli-err"><CircleAlert size={13} />{errores[name]}</div>}
    </div>
  );

  const selector = ({ name, label, icon: Icono, placeholder, opciones }) => (
    <div className="prd-campo">
      <label className="form-label">{label}</label>
      <div className="prd-input">
        <Icono className="prd-input-ico" size={16} />
        <select
          className={`form-input${errores[name] ? ' is-invalid' : ''}`}
          name={name}
          value={form[name]}
          onChange={cambiar}
          disabled={guardando}
        >
          <option value="">{placeholder}</option>
          {opciones.map(o => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      </div>
      {errores[name] && <div className="cli-err"><CircleAlert size={13} />{errores[name]}</div>}
    </div>
  );

  return (
    <div className="prd-overlay">
      <div className="prd-modal prd-modal-lg">

        <div className="prd-modal-head">
          <div>
            <h4>{editando ? 'Modificar producto o servicio' : 'Agregar producto o servicio'}</h4>
            <p>
              {editando
                ? 'Actualiza la información del catálogo. El identificador no se puede cambiar.'
                : 'Registra un nuevo producto o servicio. Se creará con estatus Activo.'}
            </p>
          </div>
          <button type="button" className="prd-x" onClick={onClose} disabled={guardando} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={guardar} noValidate>

          {errorServidor && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <CircleAlert size={18} />
              <div style={{ flex: 1 }}>{errorServidor}</div>
            </div>
          )}

          <label className="form-label">TIPO</label>
          <div className="prd-tipo">
            <button type="button" className={esProducto ? 'on' : ''} onClick={() => elegirTipo('producto')} disabled={guardando}>
              <Package size={15} /> Producto
            </button>
            <button type="button" className={!esProducto ? 'on' : ''} onClick={() => elegirTipo('servicio')} disabled={guardando}>
              <Wrench size={15} /> Servicio
            </button>
          </div>

          <div className="prd-grid">
            {editando && (
              <div className="prd-campo prd-full">
                <label className="form-label">ID DE PRODUCTO</label>
                <input className="form-input" value={formatoIdProducto(producto.id_producto)} disabled
                  style={{ fontWeight: 700, color: '#142A95' }} />
              </div>
            )}

            {campo({ name: 'codigo', label: 'CÓDIGO (ÚNICO)', icon: Barcode, placeholder: 'Ej. LAP-001' })}
            {campo({ name: 'nombre', label: 'NOMBRE', placeholder: esProducto ? 'Nombre del producto' : 'Nombre del servicio' })}

            {selector({
              name: 'id_categoria', label: 'CATEGORÍA', icon: Tag, placeholder: 'Selecciona una categoría',
              opciones: opcionesCategoria.map(c => ({ valor: c.id_categoria, texto: c.nombre }))
            })}
            {selector({
              name: 'unidad_medida', label: 'UNIDAD DE MEDIDA', icon: Ruler, placeholder: 'Selecciona una unidad',
              opciones: unidades.map(u => ({ valor: u, texto: u }))
            })}

            <div className="prd-campo prd-full">
              <label className="form-label">DESCRIPCIÓN</label>
              <textarea
                className="form-input"
                name="descripcion"
                rows={3}
                placeholder="Descripción breve del producto o servicio"
                value={form.descripcion}
                onChange={cambiar}
                disabled={guardando}
              />
            </div>
          </div>

          <div className="prd-sec">Precios</div>
          <div className="prd-grid">
            {campo({ name: 'precio_compra', label: 'PRECIO DE COMPRA', icon: DollarSign, type: 'number', step: '0.01', placeholder: '$0.00' })}
            {campo({ name: 'precio_venta', label: 'PRECIO DE VENTA', icon: DollarSign, type: 'number', step: '0.01', placeholder: '$0.00' })}
          </div>

          {esProducto && (
            <>
              <div className="prd-sec">Inventario</div>
              <div className="prd-grid">
                {campo({ name: 'stock', label: editando ? 'STOCK ACTUAL' : 'STOCK INICIAL', icon: Boxes, type: 'number', step: '1', placeholder: '0' })}
                {campo({ name: 'stock_minimo', label: 'STOCK MÍNIMO', icon: TriangleAlert, type: 'number', step: '1', placeholder: '0', hint: 'Se avisará cuando el stock llegue a este nivel.' })}
              </div>
            </>
          )}

          <div className="prd-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? <RotateCw className="animate-spin" size={16} /> : (!editando && <Plus size={16} />)}
              {editando ? 'Guardar cambios' : esProducto ? 'Guardar producto' : 'Guardar servicio'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
