const pad = (n, len = 4) => String(n).padStart(len, '0');

export const codigoCategoria = (id) => `CAT-${pad(id)}`;

export const categoriaFromApi = (r) => ({
  id: r.id_categoria,
  codigo: codigoCategoria(r.id_categoria),
  nombre: r.nombre,
  descripcion: r.descripcion || '',
  asociados: r.asociados ?? 0,
  activo: Number(r.estatus) === 1
});

export const categoriaToApi = (f) => ({
  nombre: f.nombre,
  descripcion: f.descripcion
});
