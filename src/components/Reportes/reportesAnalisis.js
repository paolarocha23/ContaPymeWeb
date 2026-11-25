// Utilidades y cálculos 100% de frontend para la vista de Reportes.
// No toca el backend: todo se deriva de lo que ya devuelven los endpoints existentes.

export const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(valor || 0));

export const formatoNumero = (valor) =>
    new Intl.NumberFormat('es-MX').format(Number(valor || 0));

export const formatoFecha = (fecha) => {
    if (!fecha) return '—';
    const valor = String(fecha).slice(0, 10);
    const [anio, mes, dia] = valor.split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : valor;
};

export const formatoFechaHora = (fecha) => {
    if (!fecha) return '—';
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return String(fecha).slice(0, 16);
        return d.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return String(fecha).slice(0, 16);
    }
};

export const formatoEstado = (estado) => {
    if (!estado) return 'Sin estado';

    const estados = {
        pendiente: 'Pendiente',
        pendiente_pago: 'Pendiente de pago',
        pagado: 'Pagado',
        pagada: 'Pagada',
        parcial: 'Parcial',
        completada: 'Completada',
        completado: 'Completado',
        cancelada: 'Cancelada',
        cancelado: 'Cancelado',
        activo: 'Activo',
        inactivo: 'Inactivo'
    };

    const clave = String(estado).toLowerCase();
    return estados[clave] || clave.replace(/_/g, ' ').replace(/^./, (letra) => letra.toUpperCase());
};

/* ---------- Fechas (en hora local, sin el desfase de toISOString) ---------- */

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const aISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseISO = (s) => {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

export const etiquetaDia = (iso) => {
    const d = parseISO(iso);
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
};

export function rangoPeriodo(modo, refISO) {
    const ref = parseISO(refISO);

    if (modo === 'dia') {
        return { fecha_inicio: refISO, fecha_fin: refISO };
    }

    if (modo === 'semana') {
        const diff = (ref.getDay() + 6) % 7;
        const lunes = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - diff);
        const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
        return { fecha_inicio: aISO(lunes), fecha_fin: aISO(domingo) };
    }

    const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const fin = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    return { fecha_inicio: aISO(inicio), fecha_fin: aISO(fin) };
}

export function periodoAnterior(modo, inicio, fin) {
    const i = parseISO(inicio);
    const f = parseISO(fin);

    if (modo === 'mes') {
        return rangoPeriodo('mes', aISO(new Date(i.getFullYear(), i.getMonth() - 1, 1)));
    }

    const dias = Math.round((f - i) / 86400000) + 1;
    const prevFin = new Date(i.getFullYear(), i.getMonth(), i.getDate() - 1);
    const prevIni = new Date(prevFin.getFullYear(), prevFin.getMonth(), prevFin.getDate() - (dias - 1));
    return { fecha_inicio: aISO(prevIni), fecha_fin: aISO(prevFin) };
}

export function textoPeriodo(modo, inicio, fin) {
    if (!inicio || !fin) return 'Todo el historial';
    const i = parseISO(inicio);
    const f = parseISO(fin);

    if (modo === 'mes') return `${MESES[i.getMonth()]} ${i.getFullYear()}`;
    if (inicio === fin) return `${etiquetaDia(inicio)} ${i.getFullYear()}`;
    return `${etiquetaDia(inicio)} – ${etiquetaDia(fin)} ${f.getFullYear()}`;
}

/* ---------- Agregaciones ---------- */

export const suma = (arr, campo) => arr.reduce((acc, r) => acc + Number(r[campo] || 0), 0);

const truncar = (s, n) => {
    const t = String(s || '');
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

function agrupar(registros, claveFn, valorFn) {
    const mapa = new Map();
    registros.forEach((r) => {
        const k = claveFn(r);
        mapa.set(k, (mapa.get(k) || 0) + valorFn(r));
    });
    return [...mapa.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor);
}

function serieDiaria(registros, valorFn, filtros) {
    const porDia = new Map();
    registros.forEach((r) => {
        const k = String(r.fecha || '').slice(0, 10);
        if (!k) return;
        porDia.set(k, (porDia.get(k) || 0) + valorFn(r));
    });

    let claves = null;
    let deRango = false;
    const { fecha_inicio: ini, fecha_fin: fin } = filtros;

    if (ini && fin) {
        const dias = Math.round((parseISO(fin) - parseISO(ini)) / 86400000) + 1;
        if (dias > 0 && dias <= 62) {
            const base = parseISO(ini);
            claves = [];
            for (let i = 0; i < dias; i += 1) {
                claves.push(aISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
            }
            deRango = true;
        }
    }

    if (!claves) claves = [...porDia.keys()].sort();

    return claves.map((k) => ({
        etiqueta: deRango ? String(parseISO(k).getDate()) : etiquetaDia(k),
        etiquetaLarga: etiquetaDia(k),
        valor: porDia.get(k) || 0
    }));
}

/* ---------- Configuración por tipo de reporte ---------- */

export const CAMPO_FECHADO = { ventas: 'total', compras: 'total', ingresos: 'monto', gastos: 'monto' };

const FECHADOS = {
    ventas: {
        campo: 'total',
        titulo: 'Total de ventas',
        registradas: 'Ventas registradas',
        promedio: 'Ticket promedio',
        graf: 'Ventas',
        subGraf: 'Total vendido durante el periodo seleccionado',
        rankClave: (r) => (r.forma_pago ? formatoEstado(r.forma_pago) : 'Sin método'),
        rankTitulo: 'Ventas por método de pago',
        rankSub: 'Importe vendido en el periodo',
        invertir: false
    },
    compras: {
        campo: 'total',
        titulo: 'Total de compras',
        registradas: 'Compras registradas',
        promedio: 'Compra promedio',
        graf: 'Compras',
        subGraf: 'Total comprado durante el periodo seleccionado',
        rankClave: (r) => r.nombre_proveedor || 'Sin nombre',
        rankTitulo: 'Principales proveedores',
        rankSub: 'Importe comprado en el periodo',
        invertir: true
    },
    ingresos: {
        campo: 'monto',
        titulo: 'Total de ingresos',
        registradas: 'Ingresos registrados',
        promedio: 'Ingreso promedio',
        graf: 'Ingresos',
        subGraf: 'Total ingresado durante el periodo seleccionado',
        rankClave: (r) => r.nombre_categoria || 'Sin categoría',
        rankTitulo: 'Ingresos por categoría',
        rankSub: 'Importe por categoría en el periodo',
        invertir: false
    },
    gastos: {
        campo: 'monto',
        titulo: 'Total de gastos',
        registradas: 'Gastos registrados',
        promedio: 'Gasto promedio',
        graf: 'Gastos',
        subGraf: 'Total gastado durante el periodo seleccionado',
        rankClave: (r) => r.nombre_categoria || 'Sin categoría',
        rankTitulo: 'Gastos por categoría',
        rankSub: 'Importe por categoría en el periodo',
        invertir: true
    }
};

const SUFIJO_MODO = { dia: 'del día', semana: 'de la semana', mes: 'del mes' };

const vacio = {
    kpis: [],
    grafica: { titulo: '', subtitulo: '', serie: [], esMoneda: true },
    ranking: { titulo: '', subtitulo: '', items: [] }
};

export function construirAnalisis({ tipo, registros, filtros, modo, previoTotal }) {
    const n = registros.length;

    /* Ventas, compras, ingresos, gastos */
    if (FECHADOS[tipo]) {
        const cfg = FECHADOS[tipo];
        const total = suma(registros, cfg.campo);
        const promedio = n ? total / n : 0;
        const variacion =
            previoTotal != null && previoTotal > 0 ? ((total - previoTotal) / previoTotal) * 100 : null;

        let tonoVar = 'gray';
        if (variacion != null) {
            const bueno = cfg.cuidado ? variacion <= 0 : cfg.invertir ? variacion <= 0 : variacion >= 0;
            tonoVar = bueno ? 'green' : 'red';
        }

        return {
            kpis: [
                { titulo: cfg.titulo, valor: formatoMoneda(total), icono: 'barras', tono: 'blue' },
                { titulo: cfg.registradas, valor: formatoNumero(n), icono: 'lista', tono: 'dark' },
                { titulo: cfg.promedio, valor: formatoMoneda(promedio), icono: 'cartera', tono: 'amber' },
                {
                    titulo: 'Frente al periodo anterior',
                    valor: variacion == null ? '—' : `${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%`,
                    icono: variacion != null && variacion < 0 ? 'baja' : 'tendencia',
                    tono: tonoVar
                }
            ],
            grafica: {
                titulo: `${cfg.graf} ${SUFIJO_MODO[modo] || 'del periodo'}`,
                subtitulo: cfg.subGraf,
                serie: serieDiaria(registros, (r) => Number(r[cfg.campo] || 0), filtros),
                esMoneda: true
            },
            ranking: {
                titulo: cfg.rankTitulo,
                subtitulo: cfg.rankSub,
                items: agrupar(registros, cfg.rankClave, (r) => Number(r[cfg.campo] || 0))
                    .slice(0, 5)
                    .map((x) => ({ ...x, texto: formatoMoneda(x.valor) }))
            }
        };
    }

    /* Existencias de inventario */
    if (tipo === 'inventario') {
        const agotados = registros.filter((r) => Number(r.stock) <= 0).length;
        const bajo = registros.filter(
            (r) =>
                Number(r.stock) > 0 &&
                (r.estado_stock === 'Stock bajo' || Number(r.stock) <= Number(r.stock_minimo))
        ).length;

        const top = [...registros]
            .sort((a, b) => Number(b.valor_inventario || 0) - Number(a.valor_inventario || 0))
            .slice(0, 10);

        return {
            kpis: [
                { titulo: 'Valor del inventario', valor: formatoMoneda(suma(registros, 'valor_inventario')), icono: 'barras', tono: 'blue' },
                { titulo: 'Productos registrados', valor: formatoNumero(n), icono: 'lista', tono: 'dark' },
                { titulo: 'Con stock bajo', valor: formatoNumero(bajo), icono: 'alerta', tono: 'amber' },
                { titulo: 'Agotados', valor: formatoNumero(agotados), icono: 'alerta', tono: 'red' }
            ],
            grafica: {
                titulo: 'Valor por producto',
                subtitulo: 'Productos con mayor valor en inventario',
                serie: top.map((r) => ({
                    etiqueta: truncar(r.nombre, 9),
                    etiquetaLarga: r.nombre || 'Sin nombre',
                    valor: Number(r.valor_inventario || 0)
                })),
                esMoneda: true
            },
            ranking: {
                titulo: 'Estado del stock',
                subtitulo: 'Productos según su existencia actual',
                items: [
                    { label: 'Disponible', valor: Math.max(n - bajo - agotados, 0) },
                    { label: 'Stock bajo', valor: bajo },
                    { label: 'Agotado', valor: agotados }
                ].map((x) => ({ ...x, texto: `${formatoNumero(x.valor)} productos` }))
            }
        };
    }

    /* Movimientos de inventario */
    if (tipo === 'movimientos_inventario') {
        const entradas = registros.filter((r) => r.tipo_movimiento === 'entrada').length;
        const salidas = registros.filter((r) => r.tipo_movimiento === 'salida').length;

        return {
            kpis: [
                { titulo: 'Movimientos', valor: formatoNumero(n), icono: 'barras', tono: 'blue' },
                { titulo: 'Entradas', valor: formatoNumero(entradas), icono: 'tendencia', tono: 'green' },
                { titulo: 'Salidas', valor: formatoNumero(salidas), icono: 'baja', tono: 'red' },
                { titulo: 'Ajustes y otros', valor: formatoNumero(n - entradas - salidas), icono: 'lista', tono: 'dark' }
            ],
            grafica: {
                titulo: 'Movimientos por día',
                subtitulo: 'Entradas, salidas y ajustes durante el periodo',
                serie: serieDiaria(registros, () => 1, filtros),
                esMoneda: false
            },
            ranking: {
                titulo: 'Movimientos por tipo',
                subtitulo: 'Distribución en el periodo',
                items: agrupar(registros, (r) => formatoEstado(r.tipo_movimiento), () => 1)
                    .slice(0, 5)
                    .map((x) => ({ ...x, texto: `${formatoNumero(x.valor)} mov.` }))
            }
        };
    }

    /* Cuentas por cobrar / pagar */
    if (tipo === 'cuentas_por_cobrar' || tipo === 'cuentas_por_pagar') {
        const porCobrar = tipo === 'cuentas_por_cobrar';
        const claveEstado = porCobrar ? 'estado_cobro' : 'estado_pago';
        const claveNombre = porCobrar ? 'nombre_cliente' : 'nombre_proveedor';
        const vencidas = registros.filter((r) => r[claveEstado] === 'Vencida').length;

        return {
            kpis: [
                { titulo: 'Monto original', valor: formatoMoneda(suma(registros, 'monto_original')), icono: 'barras', tono: 'blue' },
                { titulo: 'Saldo pendiente', valor: formatoMoneda(suma(registros, 'saldo_pendiente')), icono: 'cartera', tono: 'amber' },
                { titulo: 'Cuentas registradas', valor: formatoNumero(n), icono: 'lista', tono: 'dark' },
                { titulo: 'Vencidas', valor: formatoNumero(vencidas), icono: 'alerta', tono: 'red' }
            ],
            grafica: {
                titulo: `Saldo pendiente por ${porCobrar ? 'cliente' : 'proveedor'}`,
                subtitulo: 'Saldos actuales, sin filtro de fechas',
                serie: agrupar(
                    registros,
                    (r) => r[claveNombre] || 'Sin nombre',
                    (r) => Number(r.saldo_pendiente || 0)
                )
                    .slice(0, 10)
                    .map((x) => ({ etiqueta: truncar(x.label, 9), etiquetaLarga: x.label, valor: x.valor })),
                esMoneda: true
            },
            ranking: {
                titulo: 'Saldo por estado',
                subtitulo: 'Importe pendiente según su estado',
                items: agrupar(
                    registros,
                    (r) => r[claveEstado] || 'Sin estado',
                    (r) => Number(r.saldo_pendiente || 0)
                )
                    .slice(0, 5)
                    .map((x) => ({ ...x, texto: formatoMoneda(x.valor) }))
            }
        };
    }

    return vacio;
}