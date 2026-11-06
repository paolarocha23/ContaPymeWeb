import React, { useEffect, useState } from 'react';
import { Trash2, Power, RotateCw, TriangleAlert } from 'lucide-react';
import { api } from '../../services/api';

// modo = 'estatus' (activar/desactivar) | 'eliminar'
// En 'eliminar' primero se consulta si tiene operaciones (RF0702):
//   sin operaciones → confirmar eliminación
//   con operaciones → solo se puede desactivar
export default function ProductoDeactivateModal({ producto, modo = 'estatus', onClose, onConfirm, onDesactivar }) {
  const [procesando, setProcesando] = useState(false);
  const [ops, setOps] = useState(null);          // null = cargando

  const eliminar = modo === 'eliminar';
  const activo = Number(producto.estatus) === 1;

  useEffect(() => {
    if (!eliminar) return undefined;
    let vivo = true;
    api.getProductOperations(producto.id_producto)
      .then(res => { if (vivo) setOps(res.data); })
      .catch(() => { if (vivo) setOps({ tiene_operaciones: false }); }); // el servidor igual lo valida
    return () => { vivo = false; };
  }, [eliminar, producto.id_producto]);

  const revisando = eliminar && ops === null;
  const bloqueado = eliminar && ops?.tiene_operaciones;

  const color = bloqueado ? 'red' : eliminar ? 'red' : activo ? 'amber' : 'green';

  let titulo; let texto;
  if (bloqueado) {
    titulo = 'No se puede eliminar';
    texto = `“${producto.nombre}” tiene operaciones relacionadas (${ops.total_relacionadas}). Para conservar el historial solo puede desactivarse.`;
  } else if (eliminar) {
    titulo = `¿Eliminar “${producto.nombre}”?`;
    texto = revisando
      ? 'Revisando si tiene operaciones relacionadas…'
      : 'Este registro no tiene operaciones relacionadas, por lo que puede eliminarse. Esta acción no se puede deshacer.';
  } else {
    titulo = activo ? `¿Desactivar “${producto.nombre}”?` : `¿Activar “${producto.nombre}”?`;
    texto = activo
      ? 'Un registro inactivo no podrá usarse en nuevas operaciones, pero conservará su historial. Podrás activarlo cuando quieras.'
      : 'El registro volverá a estar disponible para nuevas operaciones.';
  }

  const ejecutar = async (accion) => {
    setProcesando(true);
    try {
      await accion(producto);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="prd-overlay">
      <div className="prd-modal prd-modal-sm">
        <div className={`prd-ic ${color}`}>
          {bloqueado ? <TriangleAlert size={28} /> : eliminar ? <Trash2 size={28} /> : <Power size={28} />}
        </div>

        <h4>{titulo}</h4>
        <p>{texto}</p>

        <div className="prd-actions prd-actions-center">
          {bloqueado ? (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={procesando}>
                {activo ? 'Cancelar' : 'Entendido'}
              </button>
              {activo && (
                <button type="button" className="btn btn-danger" disabled={procesando}
                  onClick={() => ejecutar(onDesactivar)}>
                  {procesando ? <RotateCw className="animate-spin" size={16} /> : <Power size={16} />}
                  Desactivar
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={procesando}>Cancelar</button>
              <button
                type="button"
                className={`btn ${eliminar || activo ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => ejecutar(onConfirm)}
                disabled={procesando || revisando}
              >
                {procesando || revisando
                  ? <RotateCw className="animate-spin" size={16} />
                  : eliminar ? <Trash2 size={16} /> : <Power size={16} />}
                {eliminar ? 'Eliminar' : activo ? 'Desactivar' : 'Activar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
