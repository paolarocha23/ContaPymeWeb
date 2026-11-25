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
      // Si el token expiró o la cuenta/empresa fue desactivada mientras navegaba
      if (response.status === 401 || (response.status === 403 && ['USER_INACTIVE', 'EMPRESA_INACTIVE', 'NO_EMPRESA_ASSIGNED'].includes(data.code))) {
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

  registrarPagoCxp(id, datos) {
    return this.request(`/cxp/${encodeURIComponent(id)}/pagos`, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  getResumenCxp() {
    return this.request('/cxp/resumen');
  },


  // Cuentas por Cobrar
  getCuentasPorCobrar(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.estatus) {
      params.append('estatus', filtros.estatus);
    }

    if (filtros.busqueda) {
      params.append('busqueda', filtros.busqueda);
    }

    const qs = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/cxc${qs}`);
  },

  getCuentaPorCobrar(id) {
    return this.request(`/cxc/${encodeURIComponent(id)}`);
  },

  getPagosCxc(id) {
    return this.request(`/cxc/${encodeURIComponent(id)}/pagos`);
  },

  registrarCobroCxc(id, datos) {
    return this.request(`/cxc/${encodeURIComponent(id)}/pagos`, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  getResumenCxc() {
    return this.request('/cxc/resumen');
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
    return this.request(`/productos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  // Gastos
  getGastos(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
    if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
    if (filtros.id_categoria) params.append('id_categoria', filtros.id_categoria);
    if (filtros.concepto) params.append('concepto', filtros.concepto);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/gastos${query}`);
  },

  getGasto(id) {
    return this.request(`/gastos/${id}`);
  },

  getCategoriasGastos() {
    return this.request('/gastos/categorias');
  },

  getResumenGastos() {
    return this.request('/gastos/resumen');
  },

  crearGasto(datos) {
    return this.request('/gastos', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  actualizarGasto(id, datos) {
    return this.request(`/gastos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(datos)
    });
  },

  cancelarGasto(id) {
    return this.request(`/gastos/${id}/cancelar`, {
      method: 'PATCH'
    });
  },

  // Inventario
  getInventory(filters = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.estatus !== undefined && filters.estatus !== '') {
      params.append('estatus', filters.estatus);
    }
    if (filters.id_categoria) params.append('id_categoria', filters.id_categoria);
    if (filters.estado) params.append('estado', filters.estado);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/inventario${qs}`);
  },

  getInventoryStats() {
    return this.request('/inventario/stats');
  },

  getInventoryCategories() {
    return this.request('/inventario/categorias');
  },

  getInventoryLowStock() {
    return this.request('/inventario/stock-bajo');
  },

  getInventoryMovements(filters = {}) {
    const params = new URLSearchParams();

    ['q', 'id_producto', 'tipo_movimiento', 'origen', 'desde', 'hasta', 'pagina', 'limite']
      .forEach((k) => {
        if (filters[k] !== undefined && filters[k] !== '') {
          params.append(k, filters[k]);
        }
      });

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/inventario/movimientos${qs}`);
  },

  getInventoryProduct(id) {
    return this.request(`/inventario/${encodeURIComponent(id)}`);
  },

  createInventoryEntry(data) {
    return this.request('/inventario/entradas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  createInventoryExit(data) {
    return this.request('/inventario/salidas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  createInventoryAdjustment(data) {
    return this.request('/inventario/ajustes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Ingresos
  getIncomes(filters = {}) {
    const params = new URLSearchParams();
    ['q', 'desde', 'hasta', 'id_categoria', 'origen', 'forma_pago', 'estatus'].forEach((k) => {
      if (filters[k] !== undefined && filters[k] !== '') params.append(k, filters[k]);
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/ingresos${qs}`);
  },

  getIncomeStats() {
    return this.request('/ingresos/stats');
  },

  getIncomeCategories() {
    return this.request('/ingresos/categorias');
  },

  getIncomeById(id) {
    return this.request(`/ingresos/${encodeURIComponent(id)}`);
  },

  // { concepto, id_categoria, fecha, monto, forma_pago, origen: 'otro' }
  createIncome(data) {
    return this.request('/ingresos', { method: 'POST', body: JSON.stringify(data) });
  },

  updateIncome(id, data) {
    return this.request(`/ingresos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  cancelIncome(id, motivo = '') {
    return this.request(`/ingresos/${encodeURIComponent(id)}/cancelar`, {
      method: 'PATCH',
      body: JSON.stringify({ motivo })
    });
  },


  // CAJA / EFECTIVO

  // Consultar movimientos de Caja
  async getMovimientosCaja(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) {
      params.append('fecha_inicio', filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      params.append('fecha_fin', filtros.fecha_fin);
    }

    if (filtros.tipo) {
      params.append('tipo', filtros.tipo);
    }

    if (filtros.concepto) {
      params.append('concepto', filtros.concepto);
    }

    const query = params.toString()
      ? `?${params.toString()}`
      : '';

    return this.request(`/caja${query}`);
  },

  // Consultar un movimiento por ID
  async getMovimientoCaja(id) {
    return this.request(`/caja/${id}`);
  },

  // Registrar entrada o salida manual
  async crearMovimientoCaja(datos) {
    return this.request('/caja', {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  // Consultar resumen de Caja
  async getResumenCaja(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) {
      params.append('fecha_inicio', filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      params.append('fecha_fin', filtros.fecha_fin);
    }

    const query = params.toString()
      ? `?${params.toString()}`
      : '';

    return this.request(`/caja/resumen${query}`);
  },

  // REPORTES
  async getReportesResumen(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) {
      params.append('fecha_inicio', filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      params.append('fecha_fin', filtros.fecha_fin);
    }

    const query = params.toString();

    return this.request(
      `/reportes/resumen${query ? `?${query}` : ''}`
    );
  },

  // Obtener el detalle de las ventas.
  async getReportesDetalleVentas(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) {
      params.append('fecha_inicio', filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      params.append('fecha_fin', filtros.fecha_fin);
    }

    const query = params.toString();

    return this.request(
      `/reportes/ventas/detalle${query ? `?${query}` : ''}`
    );
  },

  // Obtener el detalle de las compras.
  async getReportesDetalleCompras(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) {
      params.append('fecha_inicio', filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      params.append('fecha_fin', filtros.fecha_fin);
    }

    const query = params.toString();

    return this.request(
      `/reportes/compras/detalle${query ? `?${query}` : ''}`
    );
  },

  // Obtener el detalle de los ingresos.
  async getReportesDetalleIngresos(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) {
      params.append('fecha_inicio', filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      params.append('fecha_fin', filtros.fecha_fin);
    }

    const query = params.toString();

    return this.request(
      `/reportes/ingresos/detalle${query ? `?${query}` : ''}`
    );
  },

  // Obtener el detalle de los gastos.
  async getReportesDetalleGastos(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) {
      params.append('fecha_inicio', filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      params.append('fecha_fin', filtros.fecha_fin);
    }

    const query = params.toString();

    return this.request(
      `/reportes/gastos/detalle${query ? `?${query}` : ''}`
    );
  },

  async getReportesDetalleInventario() {
    return this.request('/reportes/inventario/detalle');
  },

  async getReportesDetalleMovimientosInventario(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
    if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
    const query = params.toString();
    return this.request(
      `/reportes/inventario/movimientos${query ? `?${query}` : ''}`
    );
  },

  async getReportesDetalleCuentasPorCobrar() {
    return this.request('/reportes/cxc/detalle');
  },

  async getReportesDetalleCuentasPorPagar() {
    return this.request('/reportes/cxp/detalle');
  },

  async getNotificaciones(dias = 30) {
    const query = dias ? `?dias=${dias}` : '';
    return this.request(`/notificaciones${query}`);
  },

  // Ventas
  async getVentas(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.q) params.append('q', filtros.q);
    if (filtros.estatus) params.append('estatus', filtros.estatus);
    if (filtros.condiciones_pago) params.append('condiciones_pago', filtros.condiciones_pago);
    if (filtros.forma_pago) params.append('forma_pago', filtros.forma_pago);
    if (filtros.desde) params.append('desde', filtros.desde);
    if (filtros.hasta) params.append('hasta', filtros.hasta);
    if (filtros.id_cliente) params.append('id_cliente', filtros.id_cliente);
    if (filtros.limite) params.append('limite', filtros.limite);
    if (filtros.pagina) params.append('pagina', filtros.pagina);

    const query = params.toString();
    return this.request(`/ventas${query ? `?${query}` : ''}`);
  },

  async getVentasStats() {
    return this.request('/ventas/stats');
  },

  async getVentaById(id) {
    return this.request(`/ventas/${id}`);
  },

  async getSiguienteFolioVenta() {
    return this.request('/ventas/siguiente-folio');
  },

  async createVenta(data) {
    return this.request('/ventas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async cancelarVenta(id, motivo = '') {
    return this.request(`/ventas/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo })
    });
  },
  async crearDevolucionVenta(id, data) {
    return this.request(`/ventas/${id}/devoluciones`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Compras
  async getCompras(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.q) params.append('q', filtros.q);
    if (filtros.estatus && filtros.estatus !== 'todas') params.append('estatus', filtros.estatus);
    if (filtros.condiciones_pago && filtros.condiciones_pago !== 'todas') {
      params.append('condiciones_pago', filtros.condiciones_pago);
    }
    if (filtros.desde) params.append('desde', filtros.desde);
    if (filtros.hasta) params.append('hasta', filtros.hasta);
    if (filtros.id_proveedor) params.append('id_proveedor', filtros.id_proveedor);
    if (filtros.limite) params.append('limite', filtros.limite);
    if (filtros.pagina) params.append('pagina', filtros.pagina);

    const query = params.toString();
    return this.request(`/compras${query ? `?${query}` : ''}`);
  },

  async getComprasStats() {
    return this.request('/compras/stats');
  },

  async getCompraById(id) {
    return this.request(`/compras/${id}`);
  },

  async getSiguienteFolioCompra() {
    return this.request('/compras/siguiente-folio');
  },

  async createCompra(data) {
    return this.request('/compras', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async cancelarCompra(id, motivo = '') {
    return this.request(`/compras/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo })
    });
  },

  async crearDevolucionCompra(id, datos) {
    return this.request(`/compras/${encodeURIComponent(id)}/devoluciones`, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
  },

  async getDevolucionesCompra(id) {
    return this.request(`/compras/${encodeURIComponent(id)}/devoluciones`);
  },

  async getDashboardData() {
    return this.request('/dashboard');
  }
};

export default api;
