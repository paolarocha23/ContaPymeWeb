import React, { useState, useEffect } from 'react';
import { ScrollText, Search, RefreshCw, Shield, AlertTriangle, CheckCircle, LogOut, Key, UserCheck } from 'lucide-react';
import { api } from '../services/api';

export default function BitacoraView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getBitacora({
        accion: filterAction,
        nombre_usuario: filterUser,
        limit: 100
      });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Error al cargar bitácora:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterUser]);

  const getActionBadge = (accion) => {
    if (accion.includes('FALLID') || accion.includes('DENEGAD')) {
      return { class: 'badge-inactive', icon: <AlertTriangle size={13} /> };
    }
    if (accion.includes('EXITOS') || accion.includes('ACTIVACION')) {
      return { class: 'badge-active', icon: <CheckCircle size={13} /> };
    }
    if (accion.includes('CIERRE_SESION')) {
      return { class: 'badge-custom', icon: <LogOut size={13} /> };
    }
    if (accion.includes('CONTRASENA')) {
      return { class: 'badge-encargado', icon: <Key size={13} /> };
    }
    return { class: 'badge-admin', icon: <Shield size={13} /> };
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '28px 24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ScrollText size={28} color="#6366f1" />
            Bitácora de Accesos y Seguridad
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '2px' }}>
            Registro cronológico inmutable de intentos de acceso, verificaciones en 2 pasos, cierres de sesión por inactividad y auditoría.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar Bitácora
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="input-with-icon" style={{ flex: '1 1 240px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="Filtrar por acción (ej. INICIO, CIERRE, 2FA)..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            />
          </div>

          <div className="input-with-icon" style={{ flex: '1 1 240px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="Filtrar por nombre de usuario..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            />
          </div>

          {(filterAction || filterUser) && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => { setFilterAction(''); setFilterUser(''); }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
            <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
            <div>Consultando bitácora de accesos...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
            <ScrollText size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '1rem', color: '#f8fafc' }}>No hay registros de bitácora que coincidan.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>IP Origen</th>
                <th>Detalles del Evento</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const badgeInfo = getActionBadge(log.accion);
                return (
                  <tr key={log.id_bitacora}>
                    <td style={{ color: '#64748b', fontFamily: 'monospace' }}>
                      #{log.id_bitacora}
                    </td>
                    <td style={{ color: '#cbd5e1', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {new Date(log.fecha).toLocaleString('es-MX', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', color: '#f8fafc' }}>
                        {log.nombre_usuario || 'Desconocido'}
                      </span>
                      {log.id_usuario && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>
                          (ID: {log.id_usuario})
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${badgeInfo.class}`}>
                        {badgeInfo.icon}
                        {log.accion}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#94a3b8' }}>
                      {log.ip_origen || '127.0.0.1'}
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                      {log.detalle || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
