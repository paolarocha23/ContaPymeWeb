import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Edit3, 
  Power, 
  Users, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  RotateCw,
  Sliders,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';

const AVAILABLE_PERMISSIONS = [
  { id: 'usuarios', label: 'Gestión de Usuarios', group: 'Seguridad' },
  { id: 'roles', label: 'Gestión de Roles', group: 'Seguridad' },
  { id: 'bitacora', label: 'Ver Bitácora de Accesos', group: 'Seguridad' },
  { id: 'ventas', label: 'Punto de Venta y Facturación', group: 'Comercial' },
  { id: 'clientes', label: 'Catálogo de Clientes', group: 'Comercial' },
  { id: 'productos', label: 'Productos y Servicios', group: 'Inventario' },
  { id: 'inventario', label: 'Movimientos de Inventario', group: 'Inventario' },
  { id: 'compras', label: 'Compras a Proveedores', group: 'Compras' },
  { id: 'proveedores', label: 'Catálogo de Proveedores', group: 'Compras' },
  { id: 'caja', label: 'Control de Caja y Efectivo', group: 'Finanzas' },
  { id: 'ingresos', label: 'Registro de Ingresos', group: 'Finanzas' },
  { id: 'gastos', label: 'Registro de Gastos', group: 'Finanzas' },
  { id: 'cxc', label: 'Cuentas por Cobrar', group: 'Finanzas' },
  { id: 'cxp', label: 'Cuentas por Pagar', group: 'Finanzas' },
  { id: 'reportes', label: 'Reportes y Estadísticas', group: 'Reportes' }
];

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }

  // Modal Crear / Editar Rol
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleForm, setRoleForm] = useState({
    nombre: '',
    descripcion: '',
    permisos: []
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal Cambiar Rol a Usuario
  const [assignModal, setAssignModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [assignForm, setAssignForm] = useState({ id_usuario: '', id_rol: '' });

  // Modal Confirmar Desactivación de Rol
  const [deactivateModal, setDeactivateModal] = useState(null); // role object or null

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.getRoles(searchName);
      setRoles(res.data || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar roles.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [searchName]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedRole(null);
    setRoleForm({
      nombre: '',
      descripcion: '',
      permisos: ['ventas', 'clientes']
    });
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
    setRoleForm(prev => {
      const exists = prev.permisos.includes(permId);
      return {
        ...prev,
        permisos: exists ? prev.permisos.filter(p => p !== permId) : [...prev.permisos, permId]
      };
    });
  };

  const handleSelectAllPerms = () => {
    setRoleForm(prev => ({
      ...prev,
      permisos: AVAILABLE_PERMISSIONS.map(p => p.id)
    }));
  };

  const handleClearAllPerms = () => {
    setRoleForm(prev => ({
      ...prev,
      permisos: []
    }));
  };

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

    // Si se va a activar
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

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Encabezado y Métricas */}
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
            <ShieldAlert size={28} color="#6366f1" />
            Gestión de Roles del Sistema
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '2px' }}>
            Administra los roles predefinidos (Administrador, Encargado, Vendedor), permisos y asignaciones a usuarios.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleOpenAssign()}
          >
            <UserCheck size={16} />
            Cambiar Rol a Usuario
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            Agregar Rol
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <div style={{ flex: 1 }}>{feedback.message}</div>
          <button 
            type="button" 
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setFeedback(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="input-with-icon" style={{ flex: 1, maxWidth: '420px' }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar rol por nombre..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Total de roles: <strong style={{ color: '#f8fafc' }}>{roles.length}</strong>
          </div>
        </div>
      </div>

      {/* Grid de Roles */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <RotateCw className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
          <div>Cargando catálogo de roles...</div>
        </div>
      ) : roles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <ShieldAlert size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', color: '#f8fafc' }}>No se encontraron roles coincidentes.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Prueba con otro término de búsqueda o crea uno nuevo.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '20px'
        }}>
          {roles.map(rol => (
            <div 
              key={rol.id_rol} 
              className="card" 
              style={{
                borderLeft: rol.estatus === 1 ? '4px solid #6366f1' : '4px solid #f43f5e',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Cabecera de Tarjeta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.25rem', color: '#f8fafc' }}>{rol.nombre}</h3>
                      {rol.es_predefinido && (
                        <span className="badge badge-custom" style={{ fontSize: '0.68rem' }}>
                          Predefinido
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      ID: #{rol.id_rol}
                    </span>
                  </div>

                  <span className={`badge ${rol.estatus === 1 ? 'badge-active' : 'badge-inactive'}`}>
                    {rol.estatus === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Descripción */}
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', minHeight: '40px', marginBottom: '16px', lineHeight: '1.4' }}>
                  {rol.descripcion || 'Sin descripción especificada.'}
                </p>

                {/* Conteo de Usuarios Asignados */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  color: '#cbd5e1'
                }}>
                  <Users size={16} color="#818cf8" />
                  <span>
                    <strong>{rol.total_usuarios || 0}</strong> usuario(s) asignado(s) 
                    ({rol.usuarios_activos || 0} activos)
                  </span>
                </div>

                {/* Permisos */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Permisos Asignados ({rol.permisos?.length || 0}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {rol.permisos && rol.permisos.length > 0 ? (
                      rol.permisos.map(p => (
                        <span 
                          key={p} 
                          style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            color: '#a5b4fc',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: '500'
                          }}
                        >
                          {AVAILABLE_PERMISSIONS.find(item => item.id === p)?.label || p}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                        Sin permisos asignados
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '14px',
                marginTop: '10px'
              }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleOpenEdit(rol)}
                >
                  <Edit3 size={15} />
                  Modificar
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenAssign(rol)}
                    title="Asignar usuarios a este rol"
                  >
                    <UserCheck size={15} />
                    Asignar
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${rol.estatus === 1 ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleToggleStatus(rol)}
                    title={rol.estatus === 1 ? 'Desactivar rol' : 'Activar rol'}
                    disabled={rol.id_rol === 1} // No desactivar Administrador principal
                  >
                    <Power size={15} />
                    {rol.estatus === 1 ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================
          MODAL CREAR / MODIFICAR ROL
          ============================================================ */}
      {modalMode && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Sliders size={20} color="#6366f1" />
                {modalMode === 'create' ? 'Agregar Nuevo Rol' : `Modificar Rol: ${selectedRole?.nombre}`}
              </h3>
              <button type="button" className="btn-icon" onClick={() => setModalMode(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRole}>
              <div className="modal-body">
                {modalMode === 'edit' && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Identificador (id_rol): <strong>#{selectedRole?.id_rol}</strong> (No modificable)
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nombre del Rol *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ej. Supervisor de Almacén"
                    value={roleForm.nombre}
                    onChange={(e) => setRoleForm({ ...roleForm, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción del Rol</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Describe las funciones y alcance de este rol..."
                    value={roleForm.descripcion}
                    onChange={(e) => setRoleForm({ ...roleForm, descripcion: e.target.value })}
                  />
                </div>

                {/* Selector de Permisos */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Permisos del Rol ({roleForm.permisos.length} seleccionados)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleSelectAllPerms}
                        style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Seleccionar todos
                      </button>
                      <span style={{ color: '#64748b' }}>|</span>
                      <button
                        type="button"
                        onClick={handleClearAllPerms}
                        style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px',
                    background: 'var(--bg-input)'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '8px'
                    }}>
                      {AVAILABLE_PERMISSIONS.map(p => {
                        const checked = roleForm.permisos.includes(p.id);
                        return (
                          <label 
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: checked ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                              border: checked ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                              cursor: 'pointer',
                              fontSize: '0.82rem',
                              color: checked ? '#f8fafc' : '#94a3b8'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.id)}
                              style={{ accentColor: '#6366f1' }}
                            />
                            <span>{p.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalMode(null)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <RotateCw className="animate-spin" size={16} /> : null}
                  {modalMode === 'create' ? 'Crear Rol' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL CONFIRMACIÓN DE DESACTIVACIÓN DE ROL
          ============================================================ */}
      {deactivateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#f43f5e' }}>
                <AlertCircle size={22} color="#f43f5e" />
                Desactivar Rol: {deactivateModal.nombre}
              </h3>
              <button type="button" className="btn-icon" onClick={() => setDeactivateModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ color: '#f8fafc', fontSize: '0.95rem', lineHeight: '1.5' }}>
                ¿Estás seguro de que deseas desactivar el rol <strong>"{deactivateModal.nombre}"</strong>?
              </p>
              <div className="alert alert-warning" style={{ margin: '8px 0' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>¡Importante!</strong> Los usuarios asignados a este rol (<strong>{deactivateModal.total_usuarios || 0} usuario(s)</strong>) ya <strong>NO podrán acceder al sistema</strong> ni realizar operaciones mientras el rol permanezca inactivo.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeactivateModal(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDeactivation}>
                Confirmar Desactivación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL ASIGNAR / CAMBIAR ROL A USUARIO
          ============================================================ */}
      {assignModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <UserCheck size={20} color="#6366f1" />
                Cambiar Rol a Usuario
              </h3>
              <button type="button" className="btn-icon" onClick={() => setAssignModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssign}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Selecciona el Usuario</label>
                  <select
                    className="form-select"
                    value={assignForm.id_usuario}
                    onChange={(e) => setAssignForm({ ...assignForm, id_usuario: e.target.value })}
                    required
                  >
                    {usersList.map(u => (
                      <option key={u.id_usuario} value={u.id_usuario}>
                        {u.nombre_completo} (@{u.nombre_usuario}) - Rol actual: {u.rol_nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nuevo Rol a Asignar</label>
                  <select
                    className="form-select"
                    value={assignForm.id_rol}
                    onChange={(e) => setAssignForm({ ...assignForm, id_rol: e.target.value })}
                    required
                  >
                    {roles.filter(r => r.estatus === 1).map(r => (
                      <option key={r.id_rol} value={r.id_rol}>
                        {r.nombre} {r.es_predefinido ? '(Predefinido)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAssignModal(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <RotateCw className="animate-spin" size={16} /> : null}
                  Aplicar Cambio de Rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
