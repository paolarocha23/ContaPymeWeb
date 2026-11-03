import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollText, Search, RefreshCw, Shield, AlertTriangle, CheckCircle, LogOut, Key,
  Plus, Pencil, Power, HandCoins, ChevronLeft, ChevronRight, ListChecks, ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import './Bitacora.css';

const POR_PAGINA = 10;

/** Tono e icono de cada acción. Se evalúa en orden: la primera coincidencia gana. */
const getActionBadge = (accion = '') => {
  const a = accion.toUpperCase();
  if (a.includes('FALLID') || a.includes('DENEGAD')) return { tone: 'bad', icon: <AlertTriangle size={13} /> };
  if (a.includes('DESACTIV')) return { tone: 'warn', icon: <Power size={13} /> };
  if (a.includes('PAGO') || a.includes('SALDO')) return { tone: 'info', icon: <HandCoins size={13} /> };
  if (a.includes('CREACION')) return { tone: 'info', icon: <Plus size={13} /> };
  if (a.includes('MODIFICACION')) return { tone: 'info', icon: <Pencil size={13} /> };
  if (a.includes('EXITOS') || a.includes('ACTIVACION')) return { tone: 'ok', icon: <CheckCircle size={13} /> };
  if (a.includes('CIERRE_SESION')) return { tone: 'gray', icon: <LogOut size={13} /> };
  if (a.includes('CONTRASENA')) return { tone: 'warn', icon: <Key size={13} /> };
  return { tone: 'info', icon: <Shield size={13} /> };
};

const iniciales = (nombre = '') =>
  nombre.trim().split(/[\s._-]+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const fechaDe = (valor) => {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return { dia: '—', hora: '' };
  return {
    dia: d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, ''),
    hora: d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
};

export default function BitacoraView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [pagina, setPagina] = useState(1);
  const ultimaPeticion = useRef(0);

  const fetchLogs = useCallback(async () => {
    const id = ++ultimaPeticion.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.getBitacora({
        accion: filterAction,
        nombre_usuario: filterUser,
        limit: 100
      });
      if (id === ultimaPeticion.current) setLogs(res.data || []);
    } catch (err) {
      if (id === ultimaPeticion.current) setError(err.message || 'Error al cargar la bitácora.');
    } finally {
      if (id === ultimaPeticion.current) setLoading(false);
    }
  }, [filterAction, filterUser]);

  // Retraso para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(fetchLogs, filterAction || filterUser ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchLogs, filterAction, filterUser]);

  useEffect(() => { setPagina(1); }, [filterAction, filterUser]);

  const hayFiltros = Boolean(filterAction || filterUser);

  // Resumen de lo cargado
  const exitosos = logs.filter((l) => /EXITOS/i.test(l.accion)).length;
  const fallidos = logs.filter((l) => /FALLID|DENEGAD/i.test(l.accion)).length;
  const cierres = logs.filter((l) => /CIERRE_SESION/i.test(l.accion)).length;

  const totalPaginas = Math.max(1, Math.ceil(logs.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = logs.slice(inicio, inicio + POR_PAGINA);

  return (
    <div className="bit">
      {/* Encabezado */}
      <div className="bit-head">
        <div className="bit-head-left">
          <span className="bit-head-ico"><ScrollText size={24} /></span>
          <div>
            <h2>Bitácora de accesos y seguridad</h2>
            <p>
              Registro cronológico de intentos de acceso, verificaciones en 2 pasos, cierres de sesión
              y movimientos realizados en el sistema.
            </p>
          </div>
        </div>
        <button type="button" className="bit-refresh" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 0 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="bit-stats">
        <div className="stat-card">
          <div className="stat-icon-wrapper"><ListChecks size={22} /></div>
          <div><div className="stat-label">Registros mostrados</div><div className="stat-value">{logs.length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper bit-stat-ok"><CheckCircle size={22} /></div>
          <div><div className="stat-label">Accesos exitosos</div><div className="stat-value">{exitosos}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper bit-stat-bad"><ShieldAlert size={22} /></div>
          <div><div className="stat-label">Intentos fallidos</div>
            <div className="stat-value" style={{ color: fallidos ? '#C2362F' : undefined }}>{fallidos}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><LogOut size={22} /></div>
          <div><div className="stat-label">Cierres de sesión</div><div className="stat-value">{cierres}</div></div>
        </div>
      </div>

      {/* Filtros + tabla */}
      <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
        <div className="table-filter-bar" style={{ padding: '18px 22px', margin: 0, borderBottom: '1px solid #E4E8F5' }}>
          <div className="table-search-input">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input
                type="text"
                className="form-input form-input-pill"
                placeholder="Filtrar por acción (ej. INICIO, CIERRE, 2FA)..."
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              />
            </div>
          </div>

          <div className="table-search-input">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input
                type="text"
                className="form-input form-input-pill"
                placeholder="Filtrar por nombre de usuario..."
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
              />
            </div>
          </div>

          {hayFiltros && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#142A95', marginLeft: 'auto', fontWeight: 600 }}
              onClick={() => { setFilterAction(''); setFilterUser(''); }}
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="table-container-clean">
          {loading ? (
            <div className="cli-empty" style={{ padding: '60px 0' }}>
              <RefreshCw className="spinning" size={28} style={{ color: '#183b9c' }} />
              <div style={{ marginTop: 10 }}>Consultando bitácora...</div>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>FECHA Y HORA</th>
                  <th>USUARIO</th>
                  <th>ACCIÓN</th>
                  <th>IP ORIGEN</th>
                  <th>DETALLES DEL EVENTO</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((log) => {
                  const badge = getActionBadge(log.accion);
                  const { dia, hora } = fechaDe(log.fecha);
                  const nombre = log.nombre_usuario || 'Desconocido';
                  return (
                    <tr key={log.id_bitacora}>
                      <td><span className="bit-id">#{log.id_bitacora}</span></td>
                      <td>
                        <div className="bit-date"><b>{dia}</b><small>{hora}</small></div>
                      </td>
                      <td>
                        <div className="bit-user">
                          <span className="user-avatar-initials" style={{ background: '#E8ECFB', color: '#142A95' }}>
                            {iniciales(nombre)}
                          </span>
                          <div>
                            <b>{nombre}</b>
                            {log.id_usuario && <small>ID {log.id_usuario}</small>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`bit-pill ${badge.tone}`}>
                          {badge.icon}
                          {String(log.accion || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td><span className="bit-ip">{log.ip_origen || '127.0.0.1'}</span></td>
                      <td>
                        <div className="bit-detail" title={log.detalle || ''}>{log.detalle || '—'}</div>
                      </td>
                    </tr>
                  );
                })}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="cli-empty">
                      <ScrollText size={32} style={{ color: '#C9D2F5', marginBottom: 8 }} />
                      <div>
                        {hayFiltros
                          ? 'No hay registros de bitácora que coincidan con los filtros.'
                          : 'Aún no hay registros en la bitácora.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && logs.length > 0 && (
          <div className="table-pagination-footer" style={{ margin: 0, padding: '16px 22px' }}>
            <span>
              Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, logs.length)} de {logs.length} registros
            </span>
            <div className="pagination-controls">
              <button type="button" className="pagination-btn" disabled={paginaActual === 1}
                onClick={() => setPagina(paginaActual - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button type="button" key={n}
                  className={`pagination-btn${n === paginaActual ? ' active' : ''}`}
                  onClick={() => setPagina(n)}>
                  {n}
                </button>
              ))}
              <button type="button" className="pagination-btn" disabled={paginaActual === totalPaginas}
                onClick={() => setPagina(paginaActual + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}