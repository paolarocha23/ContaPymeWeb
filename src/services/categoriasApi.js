import { api } from './api';

export const categoriasApi = {
  getCategorias(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.estatus !== undefined && filters.estatus !== '') params.append('estatus', filters.estatus);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return api.request(`/categorias${qs}`);
  },

  createCategoria(categoriaData) {
    return api.request('/categorias', {
      method: 'POST',
      body: JSON.stringify(categoriaData)
    });
  },

  updateCategoria(id, categoriaData) {
    return api.request(`/categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoriaData)
    });
  },

  toggleCategoriaStatus(id, estatus) {
    return api.request(`/categorias/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus })
    });
  }
};