import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Search, Plus, Pencil, Power, Users, X, AlertCircle, CheckCircle2,
  RotateCw, Sliders, UserCheck, UserCog, Lock, Eye, EyeOff
} from 'lucide-react';
import { api } from '../services/api';
import './Roles.css';

const AVAILABLE_PERMISSIONS = [
  // Seguridad
  { id: 'usuarios', label: 'Gestión de Usuarios', group: 'Seguridad' },
  { id: 'roles', label: 'Gestión de Roles y Permisos', group: 'Seguridad' },
  { id: 'bitacora', label: 'Consulta de Bitácora de Accesos', group: 'Seguridad' },

  // Comercial
  { id: 'ventas', label: 'Gestión de Ventas', group: 'Comercial' },
  { id: 'clientes', label: 'Gestión de Clientes', group: 'Comercial' },

  // Inventario
  { id: 'productos', label: 'Gestión de Productos y Servicios', group: 'Inventario' },
  { id: 'inventario', label: 'Movimientos de Inventario', group: 'Inventario' },

  // Compras
  { id: 'compras', label: 'Gestión de Compras', group: 'Compras' },
  { id: 'proveedores', label: 'Gestión de Proveedores', group: 'Compras' },

  // Finanzas
  { id: 'caja', label: 'Control de Caja y Efectivo', group: 'Finanzas' },
  { id: 'ingresos', label: 'Gestión de Ingresos', group: 'Finanzas' },
  { id: 'gastos', label: 'Gestión de Gastos', group: 'Finanzas' },
  { id: 'cxc', label: 'Cuentas por Cobrar', group: 'Finanzas' },
  { id: 'cxp', label: 'Cuentas por Pagar', group: 'Finanzas' },

  // Reportes
  { id: 'reportes', label: 'Consulta de Reportes y Estadísticas', group: 'Reportes' }
];

const CHIPS_VISIBLES = 8;
const labelPermiso = (id) => AVAILABLE_PERMISSIONS.find((p) => p.id === id)?.label || id;
const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }
  const [expandidos, setExpandidos] = useState({}); // { [id_rol]: true } → "Ver permisos"

  // Modal Crear / Editar Rol
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ nombre: '', descripcion: '', permisos: [] });
  const [submitting, setSubmitting] = useState(false);

  // Modal Cambiar Rol a Usuario
  const [assignModal, setAssignModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [assignForm, setAssignForm] = useState({ id_usuario: '', id_rol: '' });

  // Modal Confirmar Desactivación de Rol
  const [deactivateModal, setDeactivateModal] = useState(null);

  // Se carga la lista completa una vez; la búsqueda filtra en pantalla
  // para que las tarjetas de resumen y "Mostrando X de Y" sean correctas.
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.getRoles();
      setRoles(res.data || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar roles.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const visibles = roles.filter((r) =>
    r.nombre.toLowerCase().includes(searchName.trim().toLowerCase())
  );
  const totalActivos = roles.filter((r) => r.estatus === 1).length;
  const totalUsuarios = roles.reduce((s, r) => s + Number(r.total_usuarios || 0), 0);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedRole(null);
    setRoleForm({ nombre: '', descripcion: '', permisos: ['ventas', 'clientes'] });
  };

  const handleOpenEdit = (rol) => {
    setModalMode('edit');
    setSelectedRole(rol);
    setRoleForm({
      nombre: rol.nombre,
      descripcion: rol.descripcion || '',
      permisos: Array.isArray(rol.permisos) ? rol.permisos : []
    });
  };

  const togglePermission = (permId) => {
    setRoleForm((prev) => {
      const exists = prev.permisos.includes(permId);
      return {
        ...prev,
        permisos: exists ? prev.permisos.filter((p) => p !== permId) : [...prev.permisos, permId]
      };
    });
  };

  const handleSelectAllPerms = () =>
    setRoleForm((prev) => ({ ...prev, permisos: AVAILABLE_PERMISSIONS.map((p) => p.id) }));
  const handleClearAllPerms = () => setRoleForm((prev) => ({ ...prev, permisos: [] }));

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.nombre.trim()) return;

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await api.createRole(roleForm);
        setFeedback({ type: 'success', message: `Rol "${roleForm.nombre}" creado exitosamente.` });
      } else {
        await api.updateRole(selectedRole.id_rol, roleForm);
        setFeedback({ type: 'success', message: `Rol "${roleForm.nombre}" actualizado exitosamente.` });
      }
      setModalMode(null);
      fetchRoles();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al guardar el rol.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (rol) => {
    // Si se va a desactivar, pedir confirmación explicativa
    if (rol.estatus === 1) {
      setDeactivateModal(rol);
      return;
    }
    try {
      const res = await api.toggleRoleStatus(rol.id_rol, 1);
      setFeedback({ type: 'success', message: res.message });
      fetchRoles();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al cambiar estatus del rol.' });
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivateModal) return;
    try {
      const res = await api.toggleRoleStatus(deactivateModal.id_rol, 0);
      setFeedback({ type: 'success', message: res.message });
      setDeactivateModal(null);
      fetchRoles();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al desactivar el rol.' });
    }
  };

  const handleOpenAssign = async (targetRol = null) => {
    setAssignModal(true);
    try {
      const res = await api.getUsers();
      setUsersList(res.data || []);
      setAssignForm({
        id_usuario: res.data?.[0]?.id_usuario || '',
        id_rol: targetRol ? targetRol.id_rol : (roles?.[0]?.id_rol || '')
      });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al consultar usuarios para asignación.' });
    }
  };

  const handleSaveAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.id_usuario || !assignForm.id_rol) return;

    setSubmitting(true);
    try {
      await api.assignUserRole(assignForm.id_usuario, assignForm.id_rol);
      setFeedback({ type: 'success', message: 'Rol asignado al usuario exitosamente.' });
      setAssignModal(false);
      fetchRoles();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al asignar rol.' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpandido = (id) => setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));

  /** Avatares: solo si el backend envía rol.usuarios (lista con nombre_completo). */
  const renderAvatares = (rol) => {
    const lista = Array.isArray(rol.usuarios) ? rol.usuarios : [];
    if (lista.length === 0) {
      return (
        <div className="rol-avatars">
          <span className="rol-av c0"><Users size={14} /></span>
        </div>
      );
    }
    const mostrados = lista.slice(0, 3);
    const extra = Math.max(0, Number(rol.total_usuarios || lista.length) - mostrados.length);
    return (
      <div className="rol-avatars">
        {mostrados.map((u, i) => (
          <span key={u.id_usuario ?? i} className={`rol-av c${i % 3}`}>
            {iniciales(u.nombre_completo || u.nombre_usuario)}
          </span>
        ))}
        {extra > 0 && <span className="rol-av more">+{extra}</span>}
      </div>
    );
  };

  return (
    <div className="rol">
      {/* Encabezado */}
      <div className="rol-head">
        <div className="rol-head-left">
          <span className="rol-head-ico"><ShieldCheck size={24} /></span>
          <div>
            <h2>Gestión de roles</h2>
            <p>Administra los roles predefinidos (Administrador, Encargado, Vendedor), sus permisos y asignaciones a usuarios.</p>
          </div>
        </div>
        <div className="rol-head-actions">
          <button type="button" className="rol-btn outline" onClick={() => handleOpenAssign()}>
            <UserCog size={17} /> Cambiar rol a usuario
          </button>
          <button type="button" className="rol-btn primary" onClick={handleOpenCreate}>
            <Plus size={18} /> Agregar rol
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <div style={{ flex: 1 }}>{feedback.message}</div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setFeedback(null)}
            aria-label="Cerrar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="rol-stats">
        <div className="stat-card">
          <div className="stat-icon-wrapper"><ShieldCheck size={22} /></div>
          <div><div className="stat-label">Total de roles</div><div className="stat-value">{roles.length}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><ShieldCheck size={22} /></div>
          <div><div className="stat-label">Roles activos</div><div className="stat-value">{totalActivos}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><Users size={22} /></div>
          <div><div className="stat-label">Usuarios asignados</div><div className="stat-value">{totalUsuarios}</div></div>
        </div>
      </div>

      {/* Buscador */}
      <div className="rol-toolbar">
        <div className="table-search-input rol-search">
          <div className="input-with-icon">
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-input form-input-pill"
              placeholder="Buscar rol por nombre..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
        </div>
        <span className="rol-count">Mostrando {visibles.length} de {roles.length} roles</span>
      </div>

      {/* Tarjetas de roles */}
      {loading ? (
        <div className="rol-empty">
          <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
          <div style={{ marginTop: 10 }}>Cargando catálogo de roles...</div>
        </div>
      ) : visibles.length === 0 ? (
        <div className="rol-empty">
          <ShieldCheck size={40} style={{ color: '#C9D2F5', marginBottom: 10 }} />
          <div style={{ fontWeight: 700, color: '#0B132B' }}>No se encontraron roles.</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Prueba con otro término de búsqueda o crea uno nuevo.</div>
        </div>
      ) : (
        <div className="rol-grid">
          {visibles.map((rol) => {
            const permisos = Array.isArray(rol.permisos) ? rol.permisos : [];
            const total = AVAILABLE_PERMISSIONS.length;
            const pct = Math.min(100, Math.round((permisos.length / total) * 100));
            const expandido = Boolean(expandidos[rol.id_rol]);
            const chips = expandido ? permisos : permisos.slice(0, CHIPS_VISIBLES);
            const ocultos = permisos.length - CHIPS_VISIBLES;
            const activo = rol.estatus === 1;
            const totalUsr = Number(rol.total_usuarios || 0);
            const usrActivos = Number(rol.usuarios_activos || 0);

            return (
              <div key={rol.id_rol} className={`rol-card${activo ? '' : ' is-off'}`}>
                <div className="rol-card-body">
                  <div className="rol-top">
                    <div className="rol-top-left">
                      <span className={`rol-icon${rol.id_rol === 1 ? ' is-main' : ''}`}><ShieldCheck size={22} /></span>
                      <div>
                        <div className="rol-name">{rol.nombre}</div>
                        <div className="rol-id">ID #{rol.id_rol}</div>
                      </div>
                    </div>
                    <span className={`rol-status ${activo ? 'on' : 'off'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
                  </div>

                  {rol.es_predefinido && <span className="rol-lock"><Lock size={12} /> Rol predefinido</span>}

                  <p className="rol-desc">{rol.descripcion || 'Sin descripción especificada.'}</p>

                  <div className="rol-users">
                    {renderAvatares(rol)}
                    <div>
                      <b>{totalUsr} {totalUsr === 1 ? 'usuario asignado' : 'usuarios asignados'}</b>
                      <small>
                        <span className="ok">{usrActivos} {usrActivos === 1 ? 'activo' : 'activos'}</span>
                        {' · '}{Math.max(0, totalUsr - usrActivos)} {totalUsr - usrActivos === 1 ? 'inactivo' : 'inactivos'}
                      </small>
                    </div>
                  </div>

                  <div className="rol-perm">
                    <div className="rol-perm-head">
                      <span>Permisos asignados</span>
                      <b>{permisos.length} de {total}</b>
                    </div>
                    <div className="rol-bar"><span style={{ width: `${pct}%` }} /></div>
                    <div className="rol-chips">
                      {chips.length > 0 ? chips.map((p) => (
                        <span key={p} className="rol-chip">{labelPermiso(p)}</span>
                      )) : (
                        <span className="rol-empty-perm">Sin permisos asignados</span>
                      )}
                      {!expandido && ocultos > 0 && (
                        <button type="button" className="rol-chip more" onClick={() => toggleExpandido(rol.id_rol)}>
                          +{ocultos} más
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rol-foot">
                  <button type="button" className="rol-link" onClick={() => toggleExpandido(rol.id_rol)}>
                    {expandido ? <EyeOff size={16} /> : <Eye size={16} />}
                    {expandido ? 'Ocultar permisos' : 'Ver permisos'}
                  </button>
                  <div className="rol-foot-actions">
                    <button type="button" className="rol-icon-btn edit" title="Modificar rol" onClick={() => handleOpenEdit(rol)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="rol-icon-btn"
                      title="Asignar usuarios a este rol"
                      onClick={() => handleOpenAssign(rol)}
                    >
                      <UserCheck size={16} />
                    </button>
                    <button
                      type="button"
                      className={`rol-icon-btn power${activo ? '' : ' activar'}`}
                      title={activo ? 'Desactivar rol' : 'Activar rol'}
                      onClick={() => handleToggleStatus(rol)}
                      disabled={rol.id_rol === 1} // No desactivar Administrador principal
                    >
                      <Power size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR / MODIFICAR ROL */}
      {modalMode && (
        <div className="modal-backdrop">
          <form className="modal-content rol-modal" onSubmit={handleSaveRole}>
            <div className="modal-header" style={{ paddingBottom: 16 }}>
              <div className="modal-title-group">
                <h3><Sliders size={20} color="#142A95" />
                  {modalMode === 'create' ? 'Agregar rol' : `Modificar rol: ${selectedRole?.nombre}`}
                </h3>
                <p className="rol-modal-sub">
                  {modalMode === 'create'
                    ? 'Define el nombre, la descripción y los permisos del nuevo rol.'
                    : `Identificador #${selectedRole?.id_rol} (no modificable).`}
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setModalMode(null)} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NOMBRE DEL ROL <span style={{ color: '#C2362F' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ej. Supervisor de Almacén"
                  value={roleForm.nombre}
                  onChange={(e) => setRoleForm({ ...roleForm, nombre: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">DESCRIPCIÓN</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Describe las funciones y alcance de este rol..."
                  value={roleForm.descripcion}
                  onChange={(e) => setRoleForm({ ...roleForm, descripcion: e.target.value })}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    PERMISOS ({roleForm.permisos.length} de {AVAILABLE_PERMISSIONS.length})
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" className="rol-linkbtn" onClick={handleSelectAllPerms}>Seleccionar todos</button>
                    <span style={{ color: '#C9D2F5' }}>|</span>
                    <button type="button" className="rol-linkbtn" onClick={handleClearAllPerms}>Limpiar</button>
                  </div>
                </div>
                <div className="rol-perm-box">
                  <div className="rol-perm-grid">
                    {AVAILABLE_PERMISSIONS.map((p) => {
                      const checked = roleForm.permisos.includes(p.id);
                      return (
                        <label key={p.id} className={`rol-perm-item${checked ? ' on' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => togglePermission(p.id)} />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #E4E8F5', paddingTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalMode(null)} disabled={submitting}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting && <RotateCw className="spinning" size={16} />}
                {modalMode === 'create' ? 'Crear rol' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE DESACTIVACIÓN */}
      {deactivateModal && (
        <div className="modal-backdrop">
          <div className="modal-content rol-modal sm" style={{ textAlign: 'center', position: 'relative' }}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setDeactivateModal(null)}
              aria-label="Cerrar"
              style={{ position: 'absolute', top: 18, right: 18 }}
            >
              <X size={16} />
            </button>
            <div style={{
              width: 68, height: 68, borderRadius: '50%', background: '#FDF3E1', color: '#B26A00',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <Power size={32} />
            </div>
            <h3 style={{ justifyContent: 'center', marginBottom: 10 }}>¿Desactivar el rol "{deactivateModal.nombre}"?</h3>
            <p style={{ fontSize: '0.9rem', color: '#6B7280', lineHeight: 1.5, marginBottom: 28 }}>
              Los usuarios asignados a este rol (<b>{deactivateModal.total_usuarios || 0}</b>) ya <b>no podrán acceder al sistema</b> mientras
              el rol permanezca inactivo.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeactivateModal(null)}
                style={{ minWidth: 120, borderRadius: 9999, padding: '10px 24px', fontWeight: 600 }}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDeactivation}
                style={{ minWidth: 140, borderRadius: 9999, padding: '10px 24px', fontWeight: 700 }}>
                <Power size={16} /> Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR / CAMBIAR ROL A USUARIO */}
      {assignModal && (
        <div className="modal-backdrop">
          <form className="modal-content rol-modal sm" onSubmit={handleSaveAssign}>
            <div className="modal-header" style={{ paddingBottom: 16 }}>
              <div className="modal-title-group">
                <h3><UserCog size={20} color="#142A95" /> Cambiar rol a usuario</h3>
                <p className="rol-modal-sub">Selecciona al usuario y el nuevo rol que tendrá.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setAssignModal(false)} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">USUARIO</label>
                <select
                  className="form-select"
                  value={assignForm.id_usuario}
                  onChange={(e) => setAssignForm({ ...assignForm, id_usuario: e.target.value })}
                  required
                >
                  {usersList.map((u) => (
                    <option key={u.id_usuario} value={u.id_usuario}>
                      {u.nombre_completo} (@{u.nombre_usuario}) - Rol actual: {u.rol_nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NUEVO ROL</label>
                <select
                  className="form-select"
                  value={assignForm.id_rol}
                  onChange={(e) => setAssignForm({ ...assignForm, id_rol: e.target.value })}
                  required
                >
                  {roles.filter((r) => r.estatus === 1).map((r) => (
                    <option key={r.id_rol} value={r.id_rol}>
                      {r.nombre} {r.es_predefinido ? '(Predefinido)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #E4E8F5', paddingTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAssignModal(false)} disabled={submitting}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting && <RotateCw className="spinning" size={16} />}
                Aplicar cambio
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}