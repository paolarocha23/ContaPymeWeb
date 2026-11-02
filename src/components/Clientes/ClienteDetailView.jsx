import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Pencil, Power, Phone, Mail, MapPin, Calendar, Receipt, Banknote, CircleAlert, RotateCw
} from 'lucide-react';
import { api } from '../../services/api';
import { historialFromApi } from './clienteMapper';
import { nombreCompleto, iniciales, formatoTelefono, dinero, fechaLarga } from './helpers';

export default function ClienteDetailView({ cliente: c, onBack, onEdit, onToggle }) {
  const [tab, setTab] = useState('ventas');
  const [historial, setHistorial] = useState(null);
  const [error, setError] = useState('');

  // RDF0406: consultar historial del cliente (ventas, cobros y saldo pendiente)
  useEffect(() => {
    let cancelado = false;
    setHistorial(null);
    setError('');
    api.getClientHistory(c.id)
      .then((res) => {
        if (!cancelado) setHistorial(historialFromApi(res.data));
      })
      .catch((err) => {
        if (!cancelado) setError(err.message || 'Error al cargar historial.');
      });
    return () => { cancelado = true; };
  }, [c.id]);

  const {
    ventas = [],
    cobros = [],
    resumen = { totalVentas: 0, totalCobrado: 0, saldoPendiente: 0 }
  } = historial || {};

  const totalVentas = resumen.totalVentas;
  const totalCobrado = resumen.totalCobrado;
  const pendiente = resumen.saldoPendiente;

  const info = (Icon, label, value) => (
    <div className="cli-info">
      <span className="cli-info-ico"><Icon size={18} /></span>
      <div><small>{label}</small><b>{value}</b></div>
    </div>
  );

  return (
    <div className="cli">
      {/* Top Bar */}
      <div className="cli-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="button" className="cli-back" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B132B' }}>Detalle del cliente</h2>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Clientes / {c.codigo || `C-${String(c.id).padStart(4, '0')}`}</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onEdit} style={{ borderRadius: '9999px', padding: '9px 18px' }}>
          <Pencil size={15} /> Editar cliente
        </button>
      </div>

      <div className="cli-detail">
        {/* Left Column: Profile Card */}
        <aside className="content-box cli-profile">
          <span className="cli-avatar">{iniciales(c)}</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B132B', marginTop: 16 }}>
            {nombreCompleto(c)}
          </h3>

          <div className="cli-idline">
            <span style={{ fontWeight: 600, color: '#6B7280' }}>
              {c.codigo || `C-${String(c.id).padStart(4, '0')}`}
            </span>
            <span className={c.activo ? 'status-label-active' : 'status-label-inactive'} style={{ fontSize: '0.8rem' }}>
              <span className="cli-dot" />{c.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          <div className="cli-infolist">
            {info(Phone, 'TELÉFONO', formatoTelefono(c.telefono))}
            {info(Mail, 'CORREO', c.correo || '—')}
            {info(MapPin, 'DOMICILIO', (
              <>
                {c.calle} {c.numExterior}<br />
                Col. {c.colonia}, C.P. {c.cp}<br />
                {c.ciudad}, {c.estado}
              </>
            ))}
            {info(Calendar, 'FECHA DE REGISTRO', c.fechaRegistro ? fechaLarga(c.fechaRegistro) : 'No disponible')}
          </div>

          <div className="cli-profile-actions">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, borderRadius: '9999px', padding: '9px 16px' }}
              onClick={onEdit}
            >
              <Pencil size={15} /> Editar
            </button>
            <button
              type="button"
              className={`btn ${c.activo ? 'btn-danger' : 'btn-primary'}`}
              style={{ flex: 1, borderRadius: '9999px', padding: '9px 16px' }}
              onClick={onToggle}
            >
              <Power size={15} /> {c.activo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </aside>

        {/* Right Column */}
        <div className="cli-right">
          {/* 3 Stat Cards */}
          <div className="cli-stats3">
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <Receipt size={22} />
              </div>
              <div>
                <div className="stat-label">Total de ventas</div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{dinero(totalVentas)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <Banknote size={22} />
              </div>
              <div>
                <div className="stat-label">Total cobrado</div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{dinero(totalCobrado)}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ background: '#FDF3E1', color: '#B26A00' }}>
                <CircleAlert size={22} />
              </div>
              <div>
                <div className="stat-label">Saldo pendiente</div>
                <div className="stat-value" style={{ fontSize: '1.4rem', color: '#B26A00' }}>{dinero(pendiente)}</div>
              </div>
            </div>
          </div>

          {/* Card 1: Ventas */}
          <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
            <div className="cli-tabs-bar">
              <div className="cli-tabs">
                <button
                  type="button"
                  className={tab === 'ventas' ? 'on' : ''}
                  onClick={() => setTab('ventas')}
                >
                  Ventas
                </button>
                <button
                  type="button"
                  className={tab === 'cobros' ? 'on' : ''}
                  onClick={() => setTab('cobros')}
                >
                  Cobros
                </button>
              </div>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                {tab === 'ventas' ? `${ventas.length} ventas registradas` : `${cobros.length} cobros registrados`}
              </span>
            </div>

            <div className="table-container-clean">
              {error ? (
                <div className="cli-empty" style={{ color: '#C2362F' }}>{error}</div>
              ) : !historial ? (
                <div className="cli-empty">
                  <RotateCw className="spinning" size={24} style={{ color: '#183b9c' }} />
                </div>
              ) : tab === 'ventas' ? (
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th>FOLIO</th>
                      <th>FECHA</th>
                      <th>PRODUCTO</th>
                      <th>TOTAL</th>
                      <th>COBRADO</th>
                      <th>SALDO</th>
                      <th>ESTATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((v) => {
                      const cancelada = /^cancelad/i.test(v.estatus);
                      const saldo = cancelada ? 0 : v.total - v.cobrado;
                      return (
                        <tr key={v.folio}>
                          <td style={{ color: '#142A95', fontWeight: 700 }}>{v.folio}</td>
                          <td>{v.fecha}</td>
                          <td>{v.producto}</td>
                          <td style={{ fontWeight: 600 }}>{dinero(v.total)}</td>
                          <td>{dinero(v.cobrado)}</td>
                          <td style={{ color: saldo ? '#B26A00' : undefined, fontWeight: saldo ? 700 : 500 }}>
                            {dinero(saldo)}
                          </td>
                          <td>
                            <span className={`cli-pill ${cancelada ? 'gray' : saldo > 0 ? 'amber' : 'green'}`}>
                              {v.estatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!ventas.length && (
                      <tr><td colSpan={7} className="cli-empty">Este cliente aún no tiene ventas registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th>FOLIO</th>
                      <th>FECHA</th>
                      <th>MONTO</th>
                      <th>MÉTODO</th>
                      <th>VENTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobros.map((x) => (
                      <tr key={x.folio}>
                        <td style={{ color: '#142A95', fontWeight: 700 }}>{x.folio}</td>
                        <td>{x.fecha}</td>
                        <td style={{ fontWeight: 700 }}>{dinero(x.monto)}</td>
                        <td>{x.metodo}</td>
                        <td style={{ color: '#6B7280' }}>{x.venta}</td>
                      </tr>
                    ))}
                    {!cobros.length && (
                      <tr><td colSpan={5} className="cli-empty">Este cliente aún no tiene cobros registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Card 2: Últimos cobros (se muestra siempre como en Image 5 cuando hay cobros o cuando tab es ventas) */}
          {tab === 'ventas' && historial && cobros.length > 0 && (
            <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
              <div className="cli-tabs-bar" style={{ padding: '16px 22px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0B132B', margin: 0 }}>
                  Últimos cobros
                </h4>
                <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                  {cobros.length} de {cobros.length} cobros
                </span>
              </div>

              <div className="table-container-clean">
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th>FOLIO</th>
                      <th>FECHA</th>
                      <th>MONTO</th>
                      <th>MÉTODO</th>
                      <th>VENTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobros.slice(0, 5).map((x) => (
                      <tr key={x.folio}>
                        <td style={{ color: '#142A95', fontWeight: 700 }}>{x.folio}</td>
                        <td>{x.fecha}</td>
                        <td style={{ fontWeight: 700 }}>{dinero(x.monto)}</td>
                        <td>{x.metodo}</td>
                        <td style={{ color: '#6B7280' }}>{x.venta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
