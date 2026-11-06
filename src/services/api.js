const API_BASE = '/api';

export const api = {
  getToken() {
    return localStorage.getItem('contapyme_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('contapyme_token', token);
    } else {
      localStorage.removeItem('contapyme_token');
    }
  },

  getUser() {
    const userStr = localStorage.getItem('contapyme_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('contapyme_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('contapyme_user');
    }
  },

  clearSession() {
    localStorage.removeItem('contapyme_token');
    localStorage.removeItem('contapyme_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({
      success: false,
      message: 'Respuesta no válida del servidor'
    }));

    if (!response.ok) {
      // Si el token expiró o la cuenta fue desactivada mientras navegaba
      if (response.status === 401 || (response.status === 403 && data.code === 'USER_INACTIVE')) {
        if (endpoint !== '/auth/login' && endpoint !== '/auth/verify-2fa') {
          this.clearSession();
          window.dispatchEvent(new CustomEvent('contapyme_auth_expired', { detail: data.message }));
        }
      }
      throw new Error(data.message || 'Error en la petición');
    }

    return data;
  },

  // Auth
  login(nombre_usuario, contrasena) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nombre_usuario, contrasena })
    });
  },

  verify2FA(tempToken, codigo) {
    return this.request('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, codigo })
    });
  },

  resend2FA(tempToken) {
    return this.request('/auth/resend-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken })
    });
  },

  logout(motivo = 'manual') {
    return this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ motivo })
    }).finally(() => {
      this.clearSession();
    });
  },

  forgotPassword(correo_o_usuario) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ correo_o_usuario })
    });
  },

  resetPassword(token, nueva_contrasena) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, nueva_contrasena })
    });
  },

  changePassword(contrasena_actual, nueva_contrasena) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ contrasena_actual, nueva_contrasena })
    });
  },

  getMe() {
    return this.request('/auth/me');
  },

  // Roles
  getRoles(nombre = '') {
    const query = nombre ? `?nombre=${encodeURIComponent(nombre)}` : '';
    return this.request(`/roles${query}`);
  },

  createRole(roleData) {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData)
    });
  },

  updateRole(id, roleData) {
    return this.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    });
  },

  toggleRoleStatus(id, estatus) {
    return this.request(`/roles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus })
    });
  },

  assignUserRole(id_usuario, id_rol) {
    return this.request(`/roles/assign-user/${id_usuario}`, {
      method: 'PUT',
      body: JSON.stringify({ id_rol })
    });
  },

  // Usuarios
  getUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.id_rol) params.append('id_rol', filters.id_rol);
    if (filters.estatus !== undefined && filters.estatus !== '') params.append('estatus', filters.estatus);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/users${qs}`);
  },

  createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  toggleUserStatus(id, estatus) {
    return this.request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus })
    });
  },

  adminResetPassword(id, nueva_contrasena) {
    return this.request(`/users/${id}/reset-password-admin`, {
      method: 'POST',
      body: JSON.stringify({ nueva_contrasena })
    });
  },

  // Clientes
  getClients(filters = {}) {
    const params = new URLSearchParams();
    if (filters.q || filters.search) params.append('q', filters.q || filters.search);
    if (filters.estatus) params.append('estatus', filters.estatus);
    if (filters.ciudad) params.append('ciudad', filters.ciudad);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.colonia) params.append('colonia', filters.colonia);
    if (filters.adeudo) params.append('adeudo', filters.adeudo);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/clientes${qs}`);
  },

  getClientById(id) {
    return this.request(`/clientes/${encodeURIComponent(id)}`);
  },

  getClientHistory(id) {
    return this.request(`/clientes/${encodeURIComponent(id)}/historial`);
  },

  getClientStats() {
    return this.request('/clientes/stats');
  },

  createClient(clientData) {
    return this.request('/clientes', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  },

  updateClient(id, clientData) {
    return this.request(`/clientes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(clientData)
    });
  },

  toggleClientStatus(id, estatusOrActivo) {
    const payload = typeof estatusOrActivo === 'object'
      ? estatusOrActivo
      : typeof estatusOrActivo === 'boolean'
        ? { activo: estatusOrActivo }
        : { estatus: estatusOrActivo };

    return this.request(`/clientes/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  getClientOptions() {
    return this.request('/clientes/opciones');
  },


  // Proveedores

  getSuppliers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.estatus) params.append('estatus', filters.estatus);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/proveedores${qs}`);
  },

  getSupplierStats() {
    return this.request('/proveedores/stats');
  },

  createSupplier(data) {
    return this.request('/proveedores', { method: 'POST', body: JSON.stringify(data) });
  },

  updateSupplier(id, data) {
    return this.request(`/proveedores/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  toggleSupplierStatus(id, estatus) {
    return this.request(`/proveedores/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus })
    });
  },


  // Bitácora
  getBitacora(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/bitacora${qs ? `?${qs}` : ''}`);
  },


  // Cuentas por Pagar
  getCuentasPorPagar(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.estatus) {
      params.append('estatus', filtros.estatus);
    }

    if (filtros.busqueda) {
      params.append('busqueda', filtros.busqueda);
    }

    const qs = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/cxp${qs}`);
  },

  getCuentaPorPagar(id) {
    return this.request(`/cxp/${id}`);
  },

  getPagosCxp(id) {
    return this.request(`/cxp/${id}/pagos`);
  },

  getResumenCxp() {
    return this.request('/cxp/resumen');
  },

  // Categorías
  getCategories(filters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.estatus !== undefined && filters.estatus !== '') params.append('estatus', filters.estatus);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/categorias${qs}`);
  },

  getCategoryStats() {
    return this.request('/categorias/stats');
  },

  createCategory(data) {
    return this.request('/categorias', { method: 'POST', body: JSON.stringify(data) });
  },

  updateCategory(id, data) {
    return this.request(`/categorias/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  toggleCategoryStatus(id, estatus) {
    return this.request(`/categorias/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus })
    });
  },

  // Productos y servicios
  getProducts(filters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.estatus !== undefined && filters.estatus !== '') params.append('estatus', filters.estatus);
    if (filters.id_categoria) params.append('id_categoria', filters.id_categoria);
    if (filters.tipo) params.append('tipo', filters.tipo);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/productos${qs}`);
  },

  getProductStats() {
    return this.request('/productos/stats');
  },

  getProductCategories() {
    return this.request('/productos/categorias');
  },

  getProductById(id) {
    return this.request(`/productos/${encodeURIComponent(id)}`);
  },

  getProductOperations(id) {
    return this.request(`/productos/${encodeURIComponent(id)}/operaciones`);
  },

  createProduct(data) {
    return this.request('/productos', { method: 'POST', body: JSON.stringify(data) });
  },

  updateProduct(id, data) {
    return this.request(`/productos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  toggleProductStatus(id, estatus) {
    return this.request(`/productos/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus })
    });
  },

  deleteProduct(id) {
    return this.request(`/productos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
};

