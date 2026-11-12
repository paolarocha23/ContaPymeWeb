import React, { useState } from 'react';
import {
  X, FileText, Tag, Calendar, Banknote, CreditCard, ShoppingCart, Wallet,
  HandCoins, Check, Info, TriangleAlert, RotateCw
} from 'lucide-react';

import { api } from '../../services/api';
import { ORIGENES, FORMAS_PAGO } from './constants';
import { formatoIdIngreso, formatoPrecio, fechaCorta, fechaISO, hoyISO } from './ingresoMapper';

const aTexto = (v) => (v === null || v === undefined ? '' : String(v));

const ICONO_ORIGEN = { venta: ShoppingCart, cobro: Wallet, otro: HandCoins };
const ICONO_FORMA = { efectivo: Banknote, tarjeta: CreditCard };

export default function IngresoFormModal({ ingreso, categorias, onClose, onSave }) {
  const editando = Boolean(ingreso);

  const [form, setForm] = useState(() => editando ? {
    concepto: aTexto(ingreso.concepto),
    id_categoria: aTexto(ingreso.id_categoria),
    fecha: fechaISO(ingreso.fecha),
    monto: aTexto(ingreso.monto),
    forma_pago: ingreso.forma_pago
  } : {
    concepto: '', id_categoria: '', fecha: hoyISO(), monto: '', forma_pago: 'efectivo'
  });

  const [intentado, setIntentado] = useState(false);
  const [montoFoco, setMontoFoco] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');

  // Solo categorías activas; si se edita y la actual ya se desactivó, se deja visible.
  const activas = categorias.filter(c => Number(c.estatus) === 1);
  const opcionesCategoria = !editando || activas.some(c => Number(c.id_categoria) === Number(ingreso.id_categoria))
    ? activas
    : [{ id_categoria: ingreso.id_categoria, nombre: ingreso.nombre_categoria }, ...activas];

  const falta = {
    concepto: !form.concepto.trim(),
    id_categoria: !form.id_categoria,
    monto: !(Number(form.monto) > 0)
  };
  const incompleto = Object.values(falta).some(Boolean);
  const rojo = (campo) => intentado && falta[campo];

  const poner = (nombre, valor) => setForm(f => ({ ...f, [nombre]: valor }));

  // Monto: solo dígitos y punto, máximo 2 decimales
  const cambiarMonto = (e) => {
    const limpio = e.target.value.replace(/[^\d.]/g, '');
    const [entero, ...resto] = limpio.split('.');
    poner('monto', resto.length ? `${entero}.${resto.join('').slice(0, 2)}` : entero);
  };

  const guardar = async (e) => {
    e.preventDefault();

    if (incompleto) {
      setIntentado(true);
      return;
    }

    setGuardando(true);
    setErrorServidor('');
    try {
      await onSave(form);
    } catch (err) {
      setErrorServidor(err.message || 'No se pudo guardar el ingreso.');
    } finally {
      setGuardando(false);
    }
  };

  const nombreUsuario = editando
    ? ingreso.nombre_completo || ingreso.nombre_usuario
    : api.getUser()?.nombre_completo || api.getUser()?.nombre_usuario || 'tu usuario';

  return (
    <div className="ing-overlay">
      <div className="ing-modal ing-modal-lg">

        <div className="ing-modal-head">
          <div>
            <h4>{editando ? 'Modificar ingreso' : 'Agregar ingreso'}</h4>
            <p>
              {editando
                ? 'Actualiza el ingreso manual. El código y el origen no se pueden cambiar.'
                : 'Registra una entrada de dinero que no proviene de una venta o cobro.'}
            </p>
          </div>
          <button type="button" className="ing-x" onClick={onClose} disabled={guardando} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={guardar} noValidate>

          {errorServidor && (
            <div className="ing-alert error">
              <TriangleAlert size={18} />
              <div>{errorServidor}</div>
            </div>
          )}

          {editando && (
            <div className="ing-campo">
              <label className="form-label">CÓDIGO</label>
              <input className="form-input" value={formatoIdIngreso(ingreso.id_ingreso)} disabled
                style={{ fontWeight: 700, color: '#142A95' }} />
            </div>
          )}

          <div className="ing-campo">
            <label className="form-label">CONCEPTO <span className="ing-req">*</span></label>
            <div className="ing-input">
              <FileText className="ing-input-ico" size={16} />
              <input
                className={`form-input${rojo('concepto') ? ' is-invalid' : ''}`}
                value={form.concepto}
                maxLength={255}
                placeholder="Ej. Venta de equipo usado"
                onChange={(e) => poner('concepto', e.target.value)}
                onBlur={() => form.concepto && setIntentado(true)}
                disabled={guardando}
              />
            </div>
          </div>

          <div className="ing-grid">
            <div className="ing-campo">
              <label className="form-label">CATEGORÍA <span className="ing-req">*</span></label>
              <div className="ing-input">
                <Tag className="ing-input-ico" size={16} />
                <select
                  className={`form-input${rojo('id_categoria') ? ' is-invalid' : ''}`}
                  value={form.id_categoria}
                  onChange={(e) => poner('id_categoria', e.target.value)}
                  disabled={guardando}
                >
                  <option value="">Selecciona una categoría</option>
                  {opcionesCategoria.map(c => (
                    <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ing-campo">
              <label className="form-label">FECHA <span className="ing-req">*</span></label>
              <div className="ing-input ing-fecha">
                <Calendar className="ing-input-ico" size={16} />
                <div className="form-input">{fechaCorta(form.fecha)}</div>
                <input
                  type="date"
                  max={hoyISO()}
                  value={form.fecha}
                  onChange={(e) => poner('fecha', e.target.value || hoyISO())}
                  onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* sin acción */ } }}
                  disabled={guardando}
                  aria-label="Fecha del ingreso"
                />
              </div>
            </div>

            <div className="ing-campo">
              <label className="form-label">MONTO <span className="ing-req">*</span></label>
              <div className="ing-input">
                <Banknote className="ing-input-ico" size={16} />
                <input
                  className={`form-input${rojo('monto') ? ' is-invalid' : ''}`}
                  inputMode="decimal"
                  placeholder="$0.00"
                  value={montoFoco || !form.monto ? form.monto : formatoPrecio(form.monto)}
                  onFocus={() => setMontoFoco(true)}
                  onBlur={() => { setMontoFoco(false); if (form.monto) setIntentado(true); }}
                  onChange={cambiarMonto}
                  disabled={guardando}
                />
              </div>
            </div>

            <div className="ing-campo">
              <label className="form-label">FORMA DE PAGO <span className="ing-req">*</span></label>
              <div className="ing-seg ing-seg-2">
                {FORMAS_PAGO.map(f => {
                  const Icono = ICONO_FORMA[f.value];
                  return (
                    <button type="button" key={f.value}
                      className={form.forma_pago === f.value ? 'on' : ''}
                      onClick={() => poner('forma_pago', f.value)} disabled={guardando}>
                      <Icono size={15} /> {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="ing-campo">
            <label className="form-label">ORIGEN <span className="ing-req">*</span></label>
            <div className="ing-seg ing-seg-3">
              {ORIGENES.map(o => {
                const Icono = ICONO_ORIGEN[o.value];
                const manual = o.value === 'otro';
                return (
                  <button type="button" key={o.value}
                    className={manual ? 'on' : ''}
                    disabled={!manual || guardando}
                    title={manual ? undefined : 'Se genera automáticamente al registrar la operación'}>
                    <Icono size={15} /> {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {intentado && incompleto ? (
            <div className="ing-alert error">
              <TriangleAlert size={18} />
              <div>Completa concepto, categoría y un monto mayor a $0.00 para registrar el ingreso.</div>
            </div>
          ) : (
            <div className="ing-alert info">
              <Info size={18} />
              <div>
                Los ingresos por ventas y cobros se generan solos; aquí solo registras entradas manuales.
                {' '}{editando ? 'Se conserva a nombre de' : 'Se guarda a nombre de'} {nombreUsuario}.
              </div>
            </div>
          )}

          <div className="ing-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" className={`btn btn-primary${incompleto ? ' is-disabled' : ''}`}
              disabled={guardando} aria-disabled={incompleto}>
              {guardando ? <RotateCw className="animate-spin" size={16} /> : <Check size={16} />}
              {editando ? 'Guardar cambios' : 'Registrar ingreso'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}