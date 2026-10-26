import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Power, 
  KeyRound, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw,
  Eye,
  EyeOff,
  Mail,
  User,
  Shield,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

export default function UserCatalog({ currentAdminUser }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    id_rol: '',
    estatus: ''
  });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modales
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombre_usuario: '',
    correo: '',
    contrasena: '',
    confirmar_contrasena: '',
    id_rol: '',
    nueva_contrasena: '',
    estatus: 1
  });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Confirmar Desactivar / Activar Usuario (conforme a img/DesactivarUsuario.png)
  const [statusConfirmUser, setStatusConfirmUser] = useState(null);
  const [statusToggling, setStatusToggling] = useState(false);

  // Modal Restablecer Contraseña (Admin)
  const [adminResetModal, setAdminResetModal] = useState(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [adminResetSubmitting, setAdminResetSubmitting] = useState(false);

  // Cargar datos
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.getUsers(filters),
        api.getRoles()
      ]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar usuarios.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    setCurrentPage(1);
  }, [filters]);

  const handleOpenCreate = () => {
    const activeRoles = roles.filter(r => r.estatus === 1);
    setModalMode('create');
    setSelectedUser(null);
    setUserForm({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      nombre_usuario: '',
      correo: '',
      contrasena: '',
      confirmar_contrasena: '',
      id_rol: activeRoles[0]?.id_rol || '',
      nueva_contrasena: '',
      estatus: 1
    });
    setShowPwd(false);
  };

  const handleOpenEdit = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setUserForm({
      nombre: user.nombre,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno || '',
      nombre_usuario: user.nombre_usuario,
      correo: user.correo,
      id_rol: user.id_rol,
      nueva_contrasena: '',
      estatus: user.estatus
    });
    setShowPwd(false);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();

    if (modalMode === 'create') {
      if (!userForm.nombre || !userForm.apellido_paterno || !userForm.nombre_usuario || !userForm.correo || !userForm.contrasena) {
        setFeedback({ type: 'error', message: 'Por favor, llena todos los campos obligatorios.' });
        return;
      }
      if (userForm.contrasena.length < 6) {
        setFeedback({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' });
        return;
      }
      if (userForm.contrasena !== userForm.confirmar_contrasena) {
        setFeedback({ type: 'error', message: 'Las contraseñas no coinciden.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const payload = {
          nombre: userForm.nombre,
          apellido_paterno: userForm.apellido_paterno,
          apellido_materno: userForm.apellido_materno,
          nombre_usuario: userForm.nombre_usuario,
          correo: userForm.correo,
          contrasena: userForm.contrasena,
          id_rol: userForm.id_rol
        };
        const res = await api.createUser(payload);
        setFeedback({ type: 'success', message: res.message });
      } else {
        const payload = {
          nombre: userForm.nombre,
          apellido_paterno: userForm.apellido_paterno,
          apellido_materno: userForm.apellido_materno,
          correo: userForm.correo,
          id_rol: userForm.id_rol,
          nueva_contrasena: userForm.nueva_contrasena || undefined
        };
        const res = await api.updateUser(selectedUser.id_usuario, payload);
        
        // Si el estatus cambió en el modal de edición, actualizarlo
        if (userForm.estatus !== selectedUser.estatus) {
          await api.toggleUserStatus(selectedUser.id_usuario, userForm.estatus);
        }

        setFeedback({ type: 'success', message: res.message });
      }
      setModalMode(null);
      fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al guardar el usuario.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir modal de confirmación de Desactivar / Activar
  const handleRequestToggleStatus = (user) => {
    if (Number(user.id_usuario) === Number(currentAdminUser?.id_usuario)) {
      setFeedback({ type: 'error', message: 'No puedes desactivar tu propia cuenta administradora en uso.' });
      return;
    }
    setStatusConfirmUser(user);
  };

  // Ejecutar cambio de estatus tras confirmar en modal
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmUser) return;
    setStatusToggling(true);
    const newStatus = statusConfirmUser.estatus === 1 ? 0 : 1;
    try {
      const res = await api.toggleUserStatus(statusConfirmUser.id_usuario, newStatus);
      setFeedback({ type: 'success', message: res.message });
      setStatusConfirmUser(null);
      fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al cambiar estatus del usuario.' });
    } finally {
      setStatusToggling(false);
    }
  };

  const handleOpenAdminReset = (user) => {
    setAdminResetModal(user);
    setAdminNewPassword('');
    setShowAdminPwd(false);
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!adminNewPassword || adminNewPassword.length < 6) {
      setFeedback({ type: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setAdminResetSubmitting(true);
    try {
      const res = await api.adminResetPassword(adminResetModal.id_usuario, adminNewPassword);
      setFeedback({ type: 'success', message: res.message });
      setAdminResetModal(null);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al restablecer la contraseña.' });
    } finally {
      setAdminResetSubmitting(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminNewPassword(pwd);
  };

  // Helpers de Formato
  const formatUserId = (id) => `USR-${String(id || 0).padStart(4, '0')}`;

  const getUserInitials = (u) => {
    if (!u) return 'U';
    const n = u.nombre ? u.nombre.trim()[0] : '';
    const a = u.apellido_paterno ? u.apellido_paterno.trim()[0] : '';
    return (n + a).toUpperCase() || (u.nombre_usuario || 'U').slice(0, 2).toUpperCase();
  };

  // Contadores métricos
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.estatus === 1).length;
  const inactiveUsers = users.filter(u => u.estatus === 0).length;

  // Paginación local de la lista filtrada
  const totalPages = Math.ceil(users.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = users.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Encabezado Principal y Botón Agregar Usuario */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#0f172a',
            lineHeight: 1.2
          }}>
            Usuarios
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '2px' }}>
            Consulta, agrega y modifica a los usuarios y sus roles.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenCreate}
          style={{ padding: '11px 24px', fontSize: '0.92rem' }}
        >
          <Plus size={18} />
          Agregar usuario
        </button>
      </div>

      {/* Alerta de Feedback */}
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

      {/* Tarjetas de Métricas (Total, Activos, Inactivos) */}
      <div className="stat-card-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Users size={22} />
          </div>
          <div>
            <div className="stat-label">Total de usuarios</div>
            <div className="stat-value">{totalUsers}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="stat-label">Usuarios activos</div>
            <div className="stat-value">{activeUsers}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <UserX size={22} />
          </div>
          <div>
            <div className="stat-label">Usuarios inactivos</div>
            <div className="stat-value">{inactiveUsers}</div>
          </div>
        </div>
      </div>

      {/* Caja de Tabla con Filtros Integrados */}
      <div className="content-box">
        {/* Barra de Filtros */}
        <div className="table-filter-bar">
          {/* Búsqueda por nombre / usuario */}
          <div className="input-with-icon table-search-input">
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar usuario por nombre..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          {/* Filtro por Rol */}
          <div>
            <select
              className="table-pill-select"
              value={filters.id_rol}
              onChange={(e) => setFilters({ ...filters, id_rol: e.target.value })}
            >
              <option value="">Rol: Todos</option>
              {roles.map(r => (
                <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Estatus */}
          <div>
            <select
              className="table-pill-select"
              value={filters.estatus}
              onChange={(e) => setFilters({ ...filters, estatus: e.target.value })}
            >
              <option value="">Estatus: Todos</option>
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
            </select>
          </div>

          {/* Limpiar Filtros */}
          {(filters.search || filters.id_rol || filters.estatus) && (
            <button
              type="button"
              onClick={() => setFilters({ search: '', id_rol: '', estatus: '' })}
              style={{
                background: 'none',
                border: 'none',
                color: '#183b9c',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla Limpia */}
        <div className="table-container-clean">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <RotateCw className="animate-spin" size={32} style={{ margin: '0 auto 12px', color: '#183b9c' }} />
              <div>Cargando catálogo de usuarios...</div>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
              <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                No se encontraron usuarios
              </p>
              <p style={{ fontSize: '0.85rem' }}>Prueba ajustando los filtros de búsqueda.</p>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>NOMBRE COMPLETO</th>
                  <th>NOMBRE DE USUARIO</th>
                  <th>ROL</th>
                  <th>ESTATUS</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => {
                  const isAdminRole = (u.rol_nombre || '').toLowerCase().includes('admin');
                  const isCurrentActive = u.estatus === 1;

                  return (
                    <tr key={u.id_usuario}>
                      {/* Nombre Completo con Avatar Circular */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="user-avatar-initials">
                            {getUserInitials(u)}
                          </div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>
                            {u.nombre_completo}
                          </div>
                        </div>
                      </td>

                      {/* Nombre de Usuario */}
                      <td style={{ color: '#475569', fontSize: '0.88rem' }}>
                        {u.nombre_usuario}
                      </td>

                      {/* Rol */}
                      <td>
                        <span className={`badge ${isAdminRole ? 'badge-admin' : 'badge-encargado'}`}>
                          {u.rol_nombre}
                        </span>
                      </td>

                      {/* Estatus con Switch Toggle */}
                      <td>
                        <button
                          type="button"
                          className="switch-toggle"
                          onClick={() => handleRequestToggleStatus(u)}
                          title={`Click para ${isCurrentActive ? 'desactivar' : 'activar'}`}
                        >
                          <span className={`switch-track ${isCurrentActive ? 'active' : ''}`}>
                            <span className="switch-thumb" />
                          </span>
                          <span className={isCurrentActive ? 'status-label-active' : 'status-label-inactive'}>
                            ● {isCurrentActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </button>
                      </td>

                      {/* Acciones */}
                      <td>
                        <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="action-circle-btn"
                            onClick={() => handleOpenEdit(u)}
                            title="Modificar usuario"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            className="action-circle-btn"
                            onClick={() => handleOpenAdminReset(u)}
                            title="Restablecer contraseña"
                          >
                            <KeyRound size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {users.length > 0 && (
          <div className="table-pagination-footer">
            <div>
              Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, users.length)} de {users.length} usuarios
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL: AGREGAR USUARIO (conforme a img/AgregarUsuario.png)
          ============================================================ */}
      {modalMode === 'create' && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Agregar usuario</h3>
                <p>Registra un nuevo usuario y asígnale un rol activo.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setModalMode(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                {/* Fila 1: Nombre(s), Apellido Paterno, Apellido Materno */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">NOMBRE(S)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nombre"
                      value={userForm.nombre}
                      onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">APELLIDO PATERNO</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Apellido paterno"
                      value={userForm.apellido_paterno}
                      onChange={(e) => setUserForm({ ...userForm, apellido_paterno: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">APELLIDO MATERNO</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Apellido materno"
                      value={userForm.apellido_materno}
                      onChange={(e) => setUserForm({ ...userForm, apellido_materno: e.target.value })}
                    />
                  </div>
                </div>

                {/* Fila 2: Nombre de Usuario y Correo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">NOMBRE DE USUARIO</label>
                    <div className="input-with-icon">
                      <User className="input-icon" size={17} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej. laura.mendez"
                        value={userForm.nombre_usuario}
                        onChange={(e) => setUserForm({ ...userForm, nombre_usuario: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-helper">Debe ser único en el sistema.</div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">CORREO</label>
                    <div className="input-with-icon">
                      <Mail className="input-icon" size={17} />
                      <input
                        type="email"
                        className="form-input"
                        placeholder="correo@empresa.com"
                        value={userForm.correo}
                        onChange={(e) => setUserForm({ ...userForm, correo: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Fila 3: Contraseña y Rol */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">CONTRASEÑA</label>
                    <div className="input-with-icon">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        className="form-input"
                        style={{ paddingLeft: '40px' }}
                        placeholder="Crea una contraseña"
                        value={userForm.contrasena}
                        onChange={(e) => {
                          setUserForm({ 
                            ...userForm, 
                            contrasena: e.target.value,
                            confirmar_contrasena: e.target.value // autocargar confirmación para simplicidad
                          });
                        }}
                        required
                      />
                      <button
                        type="button"
                        className="input-action-btn"
                        onClick={() => setShowPwd(!showPwd)}
                        tabIndex={-1}
                      >
                        {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    <div className="form-helper">Se almacena cifrada y nunca se muestra.</div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ROL</label>
                    <div className="input-with-icon">
                      <Shield className="input-icon" size={17} />
                      <select
                        className="form-select"
                        value={userForm.id_rol}
                        onChange={(e) => setUserForm({ ...userForm, id_rol: e.target.value })}
                        required
                      >
                        <option value="">Selecciona un rol</option>
                        {roles.filter(r => r.estatus === 1).map(r => (
                          <option key={r.id_rol} value={r.id_rol}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-helper">Solo se muestran roles activos.</div>
                  </div>
                </div>

                {/* Mensaje Informativo Verde */}
                <div className="modal-alert-green">
                  <UserCheck size={18} color="#059669" />
                  <span>El usuario se creará con estatus Activo.</span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalMode(null)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? <RotateCw className="animate-spin" size={16} /> : <Plus size={16} />}
                  Guardar usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: MODIFICAR USUARIO (conforme a img/ModificarUsuario.png)
          ============================================================ */}
      {modalMode === 'edit' && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Modificar usuario</h3>
                <p>Actualiza los datos y el rol. El identificador no se puede cambiar.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setModalMode(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                {/* Fila 1: ID de Usuario y Switch Estatus */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', alignItems: 'center' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ID DE USUARIO</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formatUserId(selectedUser.id_usuario)}
                      disabled
                      style={{ fontWeight: '700', color: '#1e3a8a' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ESTATUS</label>
                    <div style={{ paddingTop: '8px' }}>
                      <button
                        type="button"
                        className="switch-toggle"
                        onClick={() => setUserForm({ ...userForm, estatus: userForm.estatus === 1 ? 0 : 1 })}
                      >
                        <span className={`switch-track ${userForm.estatus === 1 ? 'active' : ''}`}>
                          <span className="switch-thumb" />
                        </span>
                        <span className={userForm.estatus === 1 ? 'status-label-active' : 'status-label-inactive'}>
                          ● {userForm.estatus === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fila 2: Nombre(s), Apellido Paterno, Apellido Materno */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">NOMBRE(S)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nombre"
                      value={userForm.nombre}
                      onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">APELLIDO PATERNO</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Apellido paterno"
                      value={userForm.apellido_paterno}
                      onChange={(e) => setUserForm({ ...userForm, apellido_paterno: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">APELLIDO MATERNO</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Apellido materno"
                      value={userForm.apellido_materno}
                      onChange={(e) => setUserForm({ ...userForm, apellido_materno: e.target.value })}
                    />
                  </div>
                </div>

                {/* Fila 3: Nombre de Usuario y Correo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">NOMBRE DE USUARIO</label>
                    <div className="input-with-icon">
                      <User className="input-icon" size={17} />
                      <input
                        type="text"
                        className="form-input"
                        value={userForm.nombre_usuario}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">CORREO</label>
                    <div className="input-with-icon">
                      <Mail className="input-icon" size={17} />
                      <input
                        type="email"
                        className="form-input"
                        value={userForm.correo}
                        onChange={(e) => setUserForm({ ...userForm, correo: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Fila 4: Nueva Contraseña y Rol */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">NUEVA CONTRASEÑA</label>
                    <div className="input-with-icon">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        className="form-input"
                        style={{ paddingLeft: '40px' }}
                        placeholder="Dejar en blanco para conservar la actual"
                        value={userForm.nueva_contrasena}
                        onChange={(e) => setUserForm({ ...userForm, nueva_contrasena: e.target.value })}
                      />
                      <button
                        type="button"
                        className="input-action-btn"
                        onClick={() => setShowPwd(!showPwd)}
                        tabIndex={-1}
                      >
                        {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    <div className="form-helper">La contraseña se almacena cifrada y nunca se muestra.</div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ROL</label>
                    <div className="input-with-icon">
                      <Shield className="input-icon" size={17} />
                      <select
                        className="form-select"
                        value={userForm.id_rol}
                        onChange={(e) => setUserForm({ ...userForm, id_rol: e.target.value })}
                        required
                      >
                        {roles.map(r => (
                          <option key={r.id_rol} value={r.id_rol}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalMode(null)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? <RotateCw className="animate-spin" size={16} /> : null}
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: DESACTIVAR / ACTIVAR USUARIO (conforme a img/DesactivarUsuario.png)
          ============================================================ */}
      {statusConfirmUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '36px 32px 28px 32px', alignItems: 'center' }}>
              {/* Ícono Circular Centrado */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: statusConfirmUser.estatus === 1 ? '#fef3c7' : '#ecfdf5',
                color: statusConfirmUser.estatus === 1 ? '#d97706' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Power size={32} />
              </div>

              {/* Titular */}
              <h3 style={{
                fontSize: '1.35rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '10px'
              }}>
                {statusConfirmUser.estatus === 1
                  ? `¿Desactivar a ${statusConfirmUser.nombre_completo}?`
                  : `¿Activar a ${statusConfirmUser.nombre_completo}?`
                }
              </h3>

              {/* Descripción */}
              <p style={{
                color: '#64748b',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                marginBottom: '24px'
              }}>
                {statusConfirmUser.estatus === 1
                  ? 'Un usuario inactivo no podrá iniciar sesión ni realizar operaciones en el sistema. Podrás activarlo de nuevo cuando quieras.'
                  : 'El usuario volverá a tener acceso al sistema y podrá iniciar sesión con sus credenciales habituales.'
                }
              </p>

              {/* Botones */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%'
              }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '10px 20px' }}
                  onClick={() => setStatusConfirmUser(null)}
                  disabled={statusToggling}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={handleConfirmToggleStatus}
                  disabled={statusToggling}
                >
                  {statusToggling ? (
                    <RotateCw className="animate-spin" size={16} />
                  ) : (
                    <Power size={16} />
                  )}
                  {statusConfirmUser.estatus === 1 ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: RESTABLECER CONTRASEÑA POR ADMINISTRADOR
          ============================================================ */}
      {adminResetModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Restablecer contraseña</h3>
                <p>Establece una nueva clave para {adminResetModal.nombre_completo}.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setAdminResetModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword}>
              <div className="modal-body">
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>
                  El usuario podrá iniciar sesión con esta nueva contraseña de inmediato. La contraseña se almacenará cifrada mediante bcrypt.
                </p>

                <div className="form-group">
                  <div className="form-label">
                    <span>NUEVA CONTRASEÑA</span>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#183b9c',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Generar aleatoria
                    </button>
                  </div>
                  <div className="input-with-icon">
                    <input
                      type={showAdminPwd ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Mínimo 6 caracteres"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      required
                      style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
                    />
                    <button
                      type="button"
                      className="input-action-btn"
                      onClick={() => setShowAdminPwd(!showAdminPwd)}
                      tabIndex={-1}
                    >
                      {showAdminPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <div className="form-helper">Debe contener al menos 6 caracteres.</div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAdminResetModal(null)}
                  disabled={adminResetSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adminResetSubmitting}
                >
                  {adminResetSubmitting ? <RotateCw className="animate-spin" size={16} /> : <KeyRound size={16} />}
                  Restablecer contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
