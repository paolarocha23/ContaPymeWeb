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

  // Bitácora
  getBitacora(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/bitacora${qs ? `?${qs}` : ''}`);
  }
};
