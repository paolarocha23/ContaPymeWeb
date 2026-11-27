import pool from '../config/db.js';
import { GoogleGenAI } from '@google/genai';

/**
 * Calcula variación porcentual entre dos valores numéricos.
 */
function calcularVariacion(actual, previo) {
  const cur = Number(actual || 0);
  const prev = Number(previo || 0);

  if (prev === 0 && cur === 0) {
    return { porcentaje: 0, texto: '0.0%', suficiente: true };
  }
  if (prev === 0) {
    return { porcentaje: 100, texto: '+100% (Sin datos en periodo anterior)', suficiente: false };
  }

  const dif = ((cur - prev) / prev) * 100;
  const redondeado = Math.round(dif * 10) / 10;
  const signo = redondeado > 0 ? '+' : '';
  return {
    porcentaje: redondeado,
    texto: `${signo}${redondeado}%`,
    suficiente: true
  };
}

/**
 * Recopila todos los datos financieros requeridos mediante consultas SELECT estrictas.
 * NO modifica ni altera ninguna tabla o registro.
 */
export async function recopilarDatosFinancieros(empresaId = 1) {
  // 1. Métricas comparativas: Mes actual vs Mes anterior
  const metricsSql = `
    WITH current_month AS (
      SELECT 
        date_trunc('month', CURRENT_DATE) AS start_cur,
        date_trunc('month', CURRENT_DATE) + interval '1 month' AS end_cur,
        date_trunc('month', CURRENT_DATE) - interval '1 month' AS start_prev,
        date_trunc('month', CURRENT_DATE) AS end_prev
    )
    SELECT
      -- Ventas
      COALESCE((SELECT SUM(total) FROM ventas WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::numeric AS ventas_monto,
      COALESCE((SELECT COUNT(*) FROM ventas WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::int AS ventas_cantidad,
      COALESCE((SELECT SUM(total) FROM ventas WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::numeric AS ventas_monto_prev,
      COALESCE((SELECT COUNT(*) FROM ventas WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::int AS ventas_cantidad_prev,
      
      -- Compras
      COALESCE((SELECT SUM(total) FROM compras WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::numeric AS compras_monto,
      COALESCE((SELECT COUNT(*) FROM compras WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::int AS compras_cantidad,
      COALESCE((SELECT SUM(total) FROM compras WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::numeric AS compras_monto_prev,

      -- Gastos operativos
      COALESCE((SELECT SUM(monto) FROM gastos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::numeric AS gastos_monto,
      COALESCE((SELECT COUNT(*) FROM gastos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::int AS gastos_cantidad,
      COALESCE((SELECT SUM(monto) FROM gastos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::numeric AS gastos_monto_prev,

      -- Ingresos recibidos
      COALESCE((SELECT SUM(monto) FROM ingresos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::numeric AS ingresos_monto,
      COALESCE((SELECT COUNT(*) FROM ingresos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::int AS ingresos_cantidad,
      COALESCE((SELECT SUM(monto) FROM ingresos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0)::numeric AS ingresos_monto_prev
    FROM current_month cm
  `;

  // 2. Caja y Efectivo disponible
  const cajaSql = `
    SELECT COALESCE(
      SUM(CASE WHEN LOWER(tipo) IN ('ingreso', 'entrada') THEN monto ELSE -monto END),
      0
    )::numeric AS saldo_caja
    FROM movimientos_caja
    WHERE ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
  `;

  // 3. Cuentas por Cobrar (CxC)
  const cxcSql = `
    SELECT
      COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0 AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada')), 0)::numeric AS saldo_total,
      COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada')), 0)::numeric AS saldo_vencido,
      COUNT(*) FILTER (WHERE saldo_pendiente > 0 AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada'))::int AS total_cuentas,
      COUNT(*) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada'))::int AS vencidas_count
    FROM cuentas_por_cobrar
    WHERE ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
  `;

  // 4. Cuentas por Pagar (CxP)
  const cxpSql = `
    SELECT
      COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0 AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada')), 0)::numeric AS saldo_total,
      COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada')), 0)::numeric AS saldo_vencido,
      COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento <= CURRENT_DATE + 7 AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada')), 0)::numeric AS saldo_proximo_7d,
      COUNT(*) FILTER (WHERE saldo_pendiente > 0 AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada'))::int AS total_cuentas,
      COUNT(*) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada'))::int AS vencidas_count
    FROM cuentas_por_pagar
    WHERE ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
  `;

  // 5. Inventario
  const invSql = `
    SELECT
      COUNT(*)::int AS total_productos,
      COALESCE(SUM(COALESCE(stock, 0) * precio_compra), 0)::numeric AS valor_inventario,
      COUNT(*) FILTER (WHERE stock > COALESCE(stock_minimo, 0) AND stock > 0)::int AS stock_normal,
      COUNT(*) FILTER (WHERE stock <= stock_minimo AND stock > 0)::int AS stock_bajo,
      COUNT(*) FILTER (WHERE stock <= 0)::int AS stock_agotado
    FROM productos
    WHERE estatus = 1 AND LOWER(tipo) = 'producto'
      AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
  `;

  const [mRes, cajaRes, cxcRes, cxpRes, invRes] = await Promise.all([
    pool.query(metricsSql, [empresaId]),
    pool.query(cajaSql, [empresaId]),
    pool.query(cxcSql, [empresaId]),
    pool.query(cxpSql, [empresaId]),
    pool.query(invSql, [empresaId])
  ]);

  const rawM = mRes.rows[0] || {};
  const rawCaja = cajaRes.rows[0] || {};
  const rawCxc = cxcRes.rows[0] || {};
  const rawCxp = cxpRes.rows[0] || {};
  const rawInv = invRes.rows[0] || {};

  // Conversión numérica y cálculos en JavaScript
  const ventasActual = Number(rawM.ventas_monto || 0);
  const ventasPrevio = Number(rawM.ventas_monto_prev || 0);
  const comprasActual = Number(rawM.compras_monto || 0);
  const comprasPrevio = Number(rawM.compras_monto_prev || 0);
  const gastosActual = Number(rawM.gastos_monto || 0);
  const gastosPrevio = Number(rawM.gastos_monto_prev || 0);
  const ingresosActual = Number(rawM.ingresos_monto || 0);
  const ingresosPrevio = Number(rawM.ingresos_monto_prev || 0);

  const saldoCaja = Number(rawCaja.saldo_caja || 0);
  const cxcTotal = Number(rawCxc.saldo_total || 0);
  const cxcVencido = Number(rawCxc.saldo_vencido || 0);
  const cxpTotal = Number(rawCxp.saldo_total || 0);
  const cxpVencido = Number(rawCxp.saldo_vencido || 0);
  const cxpProximo7d = Number(rawCxp.saldo_proximo_7d || 0);

  const valorInventario = Number(rawInv.valor_inventario || 0);
  const stockBajo = Number(rawInv.stock_bajo || 0);
  const stockAgotado = Number(rawInv.stock_agotado || 0);
  const totalProductos = Number(rawInv.total_productos || 0);

  // Balances e indicadores calculados
  const flujoEfectivo = ingresosActual - gastosActual;
  const margenVentasCompras = ventasActual - comprasActual;
  const balanceCuentas = cxcTotal - cxpTotal;
  const liquidezInmediata = cxpProximo7d > 0 ? Math.round((saldoCaja / cxpProximo7d) * 100) / 100 : null;

  return {
    periodo: {
      mes_actual: new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
      dias_transcurridos: new Date().getDate()
    },
    metricas: {
      ventas: {
        actual: ventasActual,
        previo: ventasPrevio,
        cantidad_actual: Number(rawM.ventas_cantidad || 0),
        cantidad_previo: Number(rawM.ventas_cantidad_prev || 0),
        variacion: calcularVariacion(ventasActual, ventasPrevio)
      },
      compras: {
        actual: comprasActual,
        previo: comprasPrevio,
        cantidad_actual: Number(rawM.compras_cantidad || 0),
        variacion: calcularVariacion(comprasActual, comprasPrevio)
      },
      ingresos: {
        actual: ingresosActual,
        previo: ingresosPrevio,
        cantidad_actual: Number(rawM.ingresos_cantidad || 0),
        variacion: calcularVariacion(ingresosActual, ingresosPrevio)
      },
      gastos: {
        actual: gastosActual,
        previo: gastosPrevio,
        cantidad_actual: Number(rawM.gastos_cantidad || 0),
        variacion: calcularVariacion(gastosActual, gastosPrevio)
      },
      caja: {
        saldo_disponible: saldoCaja
      },
      cuentas_por_cobrar: {
        saldo_total: cxcTotal,
        saldo_vencido: cxcVencido,
        cuentas_totales: Number(rawCxc.total_cuentas || 0),
        cuentas_vencidas: Number(rawCxc.vencidas_count || 0)
      },
      cuentas_por_pagar: {
        saldo_total: cxpTotal,
        saldo_vencido: cxpVencido,
        vencimiento_7_dias: cxpProximo7d,
        cuentas_totales: Number(rawCxp.total_cuentas || 0),
        cuentas_vencidas: Number(rawCxp.vencidas_count || 0)
      },
      inventario: {
        total_productos: totalProductos,
        valor_inventario: valorInventario,
        stock_normal: Number(rawInv.stock_normal || 0),
        stock_bajo: stockBajo,
        stock_agotado: stockAgotado
      }
    },
    indicadores_calculados: {
      flujo_efectivo_mes: flujoEfectivo,
      margen_ventas_vs_compras: margenVentasCompras,
      balance_cartera_vs_deuda: balanceCuentas,
      ratio_cobertura_7dias: liquidezInmediata
    }
  };
}

/**
 * Genera análisis alternativo basado en reglas locales si Gemini no está disponible o falla la red.
 */
function generarAnalisisLocal(datos) {
  const m = datos.metricas;
  const ind = datos.indicadores_calculados;

  const tendencias = [
    {
      indicador: 'Ventas',
      tipo: m.ventas.variacion.porcentaje >= 0 ? 'positiva' : 'negativa',
      variacion_porcentaje: m.ventas.variacion.texto,
      analisis: `Ventas registradas de $${m.ventas.actual.toLocaleString('es-MX')} vs $${m.ventas.previo.toLocaleString('es-MX')} del mes anterior.`
    },
    {
      indicador: 'Gastos',
      tipo: m.gastos.variacion.porcentaje <= 0 ? 'positiva' : 'negativa',
      variacion_porcentaje: m.gastos.variacion.texto,
      analisis: `Gastos operativos de $${m.gastos.actual.toLocaleString('es-MX')} en el periodo.`
    },
    {
      indicador: 'Ingresos vs Gastos',
      tipo: ind.flujo_efectivo_mes >= 0 ? 'positiva' : 'negativa',
      variacion_porcentaje: ind.flujo_efectivo_mes >= 0 ? 'Superávit' : 'Déficit',
      analisis: `Balance neto operativo de $${ind.flujo_efectivo_mes.toLocaleString('es-MX')} en el mes.`
    }
  ];

  const riesgos = [];
  if (m.cuentas_por_cobrar.saldo_vencido > 0) {
    riesgos.push({
      titulo: 'Cartera vencida por cobrar',
      nivel: 'confirmado',
      descripcion: `Existen $${m.cuentas_por_cobrar.saldo_vencido.toLocaleString('es-MX')} en ${m.cuentas_por_cobrar.cuentas_vencidas} cuentas vencidas.`,
      impacto_estimado: 'Afectación directa a la liquidez de caja.'
    });
  }

  if (m.cuentas_por_pagar.saldo_vencido > 0) {
    riesgos.push({
      titulo: 'Cuentas por pagar a proveedores vencidas',
      nivel: 'confirmado',
      descripcion: `Se adeudan $${m.cuentas_por_pagar.saldo_vencido.toLocaleString('es-MX')} con fecha de vencimiento superada.`,
      impacto_estimado: 'Riesgo de corte de suministros o recargos comerciales.'
    });
  }

  if (m.inventario.stock_agotado > 0) {
    riesgos.push({
      titulo: 'Productos con existencia agotada',
      nivel: 'confirmado',
      descripcion: `${m.inventario.stock_agotado} productos no tienen stock disponible para venta.`,
      impacto_estimado: 'Pérdida inmediata de oportunidades de venta.'
    });
  }

  if (m.caja.saldo_disponible < m.cuentas_por_pagar.vencimiento_7_dias && m.cuentas_por_pagar.vencimiento_7_dias > 0) {
    riesgos.push({
      titulo: 'Riesgo de liquidez a 7 días',
      nivel: 'potencial',
      descripcion: `Los pagos a proveedores de los próximos 7 días ($${m.cuentas_por_pagar.vencimiento_7_dias.toLocaleString('es-MX')}) superan el saldo en caja ($${m.caja.saldo_disponible.toLocaleString('es-MX')}).`,
      impacto_estimado: 'Insuficiencia de fondos para pagos inmediatos.'
    });
  }

  const recomendaciones = [
    {
      titulo: 'Gestionar cobranza prioritaria',
      indicador_origen: 'Cuentas por Cobrar',
      accion: 'Contactar a los clientes con saldo vencido para convenir pagos inmediatos.',
      justificacion: 'Recuperar flujo de efectivo sin recurrir a financiamiento externo.'
    },
    {
      titulo: 'Reabastecer productos agotados',
      indicador_origen: 'Inventario',
      accion: 'Generar órdenes de compra para los artículos con existencia en cero.',
      justificacion: 'Evitar perder clientes por falta de existencias.'
    }
  ];

  return {
    fuente: 'local',
    fecha_generacion: new Date().toISOString(),
    diagnostico_general: {
      estado_salud: ind.flujo_efectivo_mes >= 0 && m.cuentas_por_cobrar.saldo_vencido === 0 ? 'Saludable' : 'Moderado',
      resumen_ejecutivo: `La empresa presenta un flujo neto de $${ind.flujo_efectivo_mes.toLocaleString('es-MX')} en el mes en curso, con un saldo en caja de $${m.caja.saldo_disponible.toLocaleString('es-MX')}.`,
      fortalezas: [
        m.caja.saldo_disponible > 0 ? `Saldo positivo en caja disponible de $${m.caja.saldo_disponible.toLocaleString('es-MX')}` : 'Actividad operativa constante',
        ind.flujo_efectivo_mes >= 0 ? 'Flujo operativo positivo en el mes' : 'Control en compras del periodo'
      ],
      areas_oportunidad: [
        m.cuentas_por_cobrar.saldo_vencido > 0 ? `Recuperar $${m.cuentas_por_cobrar.saldo_vencido.toLocaleString('es-MX')} de cartera vencida` : 'Ampliar base de clientes activos',
        m.inventario.stock_agotado > 0 ? `Reabastecer ${m.inventario.stock_agotado} productos agotados` : 'Optimizar rotación de productos'
      ],
      balance_operativo: ind.flujo_efectivo_mes >= 0 ? 'Positivo (Ingresos superan gastos)' : 'Negativo (Gastos superan ingresos recibidos)',
      situacion_liquidez: m.caja.saldo_disponible >= m.cuentas_por_pagar.saldo_total ? 'Holgada' : 'Atención requerida'
    },
    tendencias,
    riesgos,
    recomendaciones,
    datos_base: datos
  };
}

/**
 * Invoca el Asistente Financiero Inteligente con Gemini.
 * Recopila los datos de BD vía SELECT, calcula métricas en JS, envía a Gemini y valida la respuesta.
 */
export async function generarAnalisisFinancieroIA(empresaId = 1) {
  const datos = await recopilarDatosFinancieros(empresaId);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    const local = generarAnalisisLocal(datos);
    local.mensaje_aviso = 'API Key de Gemini no configurada en .env. Se muestra análisis financiero automático local.';
    return local;
  }

  const promptInstrucciones = `
Eres el Asistente Financiero Inteligente oficial de ContaPyme, un sistema de gestión empresarial para pequeñas y medianas empresas.
Tu función es interpretar rigurosamente los siguientes indicadores financieros que ya fueron extraídos y calculados con exactitud por el backend de ContaPyme.

DATOS FINANCIEROS VERIFICADOS DE LA EMPRESA:
${JSON.stringify(datos, null, 2)}

REGLAS ESTRICTAS DE INTERPRETACIÓN:
1. No inventes números, porcentajes ni operaciones que no figuren en los datos provistos.
2. No calcules matemáticas nuevas; apóyate en los datos de "metricas" e "indicadores_calculados".
3. Distingue claramente:
   - "confirmado": Un problema real existente hoy (ej. $X de cuentas vencidas, productos agotados en inventario).
   - "potencial": Un riesgo que podría ocurrir si la tendencia continúa (ej. liquidez ajustada a 7 días).
   - "seguimiento": Situación que requiere más observación o datos de periodos completos.
4. No presentes sospechas como hechos. Si un dato es preliminar o el periodo está en curso, menciónalo.
5. Cada recomendación debe ser personalizada, citar el indicador exacto que la origina y justificar el beneficio comercial.

FORMATO DE RESPUESTA:
Debes responder ÚNICAMENTE con un objeto JSON válido (sin texto introductorio ni bloques que rompan el parser JSON) con la siguiente estructura:
{
  "diagnostico_general": {
    "estado_salud": "Saludable" | "Moderado" | "En riesgo" | "Información preliminar",
    "resumen_ejecutivo": "Explicación clara de la situación financiera actual",
    "fortalezas": ["Fortaleza 1 detectada", "Fortaleza 2 detectada"],
    "areas_oportunidad": ["Área de oportunidad 1", "Área de oportunidad 2"],
    "balance_operativo": "Evaluación del balance entre ingresos y gastos",
    "situacion_liquidez": "Evaluación del efectivo disponible frente a compromisos de deuda"
  },
  "tendencias": [
    {
      "indicador": "Ventas" | "Compras" | "Ingresos" | "Gastos" | "Inventario" | "Cartera",
      "tipo": "positiva" | "negativa" | "neutral",
      "variacion_porcentaje": "+X% / -X% / Sin periodo previo",
      "analisis": "Breve explicación del comportamiento observado"
    }
  ],
  "riesgos": [
    {
      "titulo": "Nombre del riesgo o problema",
      "nivel": "confirmado" | "potencial" | "seguimiento",
      "descripcion": "Detalle basado en los datos cuantitativos",
      "impacto_estimado": "Consecuencia para el negocio"
    }
  ],
  "recomendaciones": [
    {
      "titulo": "Acción recomendada",
      "indicador_origen": "Indicador que motivó la recomendación",
      "accion": "Paso práctico a realizar",
      "justificacion": "Por qué es prioritario atenderlo"
    }
  ]
}
`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptInstrucciones,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const rawText = response.text || '';
    const cleanText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanText);

    // Validación de estructura mínima
    if (!parsed.diagnostico_general || !Array.isArray(parsed.tendencias)) {
      throw new Error('Estructura de respuesta de IA incompleta');
    }

    return {
      fuente: 'gemini',
      modelo: modelName,
      fecha_generacion: new Date().toISOString(),
      ...parsed,
      datos_base: datos
    };
  } catch (err) {
    console.warn('Advertencia al consultar Gemini AI, activando análisis seguro local:', err.message);
    const fallback = generarAnalisisLocal(datos);
    fallback.mensaje_aviso = `Análisis generado con motor financiero local (${err.message}).`;
    return fallback;
  }
}
