import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  X,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
  Target,
  Scale,
  Wallet,
  Clock,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';

export default function AsistenteFinanciero() {
  const [analisis, setAnalisis] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState(1); // 1: Situación financiera, 2: Tendencias, 3: Riesgos, 4: Recomendaciones
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const cargarAnalisis = async () => {
    setCargando(true);
    setError('');
    try {
      const res = await api.getAsistenteFinanciero();
      if (res?.data) {
        setAnalisis(res.data);
        setUltimaActualizacion(new Date());
      } else {
        setError('No se pudo obtener el análisis del asistente.');
      }
    } catch (err) {
      setError(err.message || 'Error al conectar con el Asistente Financiero.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAnalisis();
  }, []);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setModalAbierto(false);
    };
    if (modalAbierto) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAbierto]);

  const abrirSeccion = (num) => {
    setSeccionActiva(num);
    setModalAbierto(true);
  };

  const diag = analisis?.diagnostico_general || {};
  const tendencias = analisis?.tendencias || [];
  const riesgos = analisis?.riesgos || [];
  const recomendaciones = analisis?.recomendaciones || [];

  const getSaludBadge = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'saludable':
        return { label: 'Saludable', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dot: '#10b981' };
      case 'moderado':
        return { label: 'Moderado', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' };
      case 'en riesgo':
        return { label: 'En riesgo', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#ef4444' };
      default:
        return { label: estado || 'Evaluando', bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dot: '#94a3b8' };
    }
  };

  const getNivelRiesgoBadge = (nivel) => {
    switch (nivel?.toLowerCase()) {
      case 'confirmado':
        return { label: 'Problema confirmado', bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: <AlertCircle size={14} /> };
      case 'potencial':
        return { label: 'Riesgo potencial', bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: <AlertTriangle size={14} /> };
      case 'seguimiento':
      default:
        return { label: 'Requiere seguimiento', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', icon: <HelpCircle size={14} /> };
    }
  };

  const getIconoTendencia = (tipo) => {
    if (tipo === 'positiva') return <ArrowUpRight size={16} style={{ color: '#16a34a' }} />;
    if (tipo === 'negativa') return <ArrowDownRight size={16} style={{ color: '#dc2626' }} />;
    return <Minus size={16} style={{ color: '#64748b' }} />;
  };

  const salud = getSaludBadge(diag.estado_salud);

  const horaTexto = ultimaActualizacion
    ? ultimaActualizacion.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      {/* ========================================================
          1 & 2. RESUMEN DEL ANÁLISIS FINANCIERO EN EL DASHBOARD
          ======================================================== */}
      <article className="cpy-card cpy-ai-summary-widget">
        <div className="cpy-ai-widget-header">
          <div className="cpy-ai-widget-title-wrap">
            <div className="cpy-ai-widget-icon" title="Inteligencia Artificial Gemini">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="cpy-ai-widget-badges">
                <h2>Asistente Financiero Inteligente</h2>
                <span className="cpy-ai-chip-tech">
                  <Sparkles size={11} /> {analisis?.fuente === 'gemini' ? 'Gemini AI' : 'Motor Financiero'}
                </span>
                {diag.estado_salud && (
                  <span
                    className="cpy-ai-chip-status"
                    style={{ background: salud.bg, color: salud.color, borderColor: salud.border }}
                  >
                    <span className="cpy-ai-status-dot" style={{ background: salud.dot }} />
                    {salud.label}
                  </span>
                )}
              </div>
              <p className="cpy-ai-widget-subtitle">
                Diagnóstico financiero, tendencias operativas y recomendaciones en tiempo real
              </p>
            </div>
          </div>

          <div className="cpy-ai-widget-actions">
            {horaTexto && (
              <span className="cpy-ai-widget-time">
                <Clock size={12} /> {horaTexto}
              </span>
            )}
            <button
              type="button"
              className="cpy-ai-btn-refresh"
              onClick={cargarAnalisis}
              disabled={cargando}
              title="Actualizar análisis con nuevos movimientos"
            >
              <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
              {cargando ? 'Analizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Estado de Carga */}
        {cargando && (
          <div className="cpy-ai-loading-box">
            <RefreshCw size={24} className="animate-spin" />
            <p>Generando resumen del análisis financiero con IA...</p>
          </div>
        )}

        {/* Estado de Error */}
        {!cargando && error && (
          <div className="cpy-ai-error-box">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button type="button" onClick={cargarAnalisis}>Reintentar</button>
          </div>
        )}

        {/* Contenido del Resumen */}
        {!cargando && !error && (
          <div className="cpy-ai-widget-body">
            <div className="cpy-ai-summary-text-box">
              <p>
                {diag.resumen_ejecutivo ||
                  'No hay suficiente actividad registrada para generar un análisis completo. Registra ventas, compras y gastos para desbloquear el diagnóstico.'}
              </p>
            </div>

            {/* 4 Indicadores Resumen (Clickables para navegar directamente) */}
            <div className="cpy-ai-kpis-mini-grid">
              <div
                className="cpy-ai-mini-kpi kpi-salud"
                onClick={() => abrirSeccion(1)}
                title="Ver Situación Financiera completa"
              >
                <div className="cpy-ai-mini-kpi-top">
                  <small>1. Situación financiera</small>
                  <ChevronRight size={13} className="kpi-arrow" />
                </div>
                <div className="cpy-ai-mini-kpi-val">
                  <Activity size={16} style={{ color: salud.color }} />
                  <b style={{ color: salud.color }}>{salud.label}</b>
                </div>
              </div>

              <div
                className="cpy-ai-mini-kpi kpi-tendencias"
                onClick={() => abrirSeccion(2)}
                title="Ver Tendencias detectadas"
              >
                <div className="cpy-ai-mini-kpi-top">
                  <small>2. Tendencias</small>
                  <ChevronRight size={13} className="kpi-arrow" />
                </div>
                <div className="cpy-ai-mini-kpi-val">
                  <TrendingUp size={16} style={{ color: '#1d4ed8' }} />
                  <b>{tendencias.length} analizadas</b>
                </div>
              </div>

              <div
                className="cpy-ai-mini-kpi kpi-riesgos"
                onClick={() => abrirSeccion(3)}
                title="Ver Riesgos identificados"
              >
                <div className="cpy-ai-mini-kpi-top">
                  <small>3. Riesgos financieros</small>
                  <ChevronRight size={13} className="kpi-arrow" />
                </div>
                <div className="cpy-ai-mini-kpi-val">
                  <AlertTriangle
                    size={16}
                    style={{ color: riesgos.length > 0 ? '#b91c1c' : '#16a34a' }}
                  />
                  <b style={{ color: riesgos.length > 0 ? '#b91c1c' : '#16a34a' }}>
                    {riesgos.length} {riesgos.length === 1 ? 'riesgo' : 'riesgos'}
                  </b>
                </div>
              </div>

              <div
                className="cpy-ai-mini-kpi kpi-recs"
                onClick={() => abrirSeccion(4)}
                title="Ver Recomendaciones sugeridas"
              >
                <div className="cpy-ai-mini-kpi-top">
                  <small>4. Recomendaciones</small>
                  <ChevronRight size={13} className="kpi-arrow" />
                </div>
                <div className="cpy-ai-mini-kpi-val">
                  <Lightbulb size={16} style={{ color: '#d97706' }} />
                  <b style={{ color: '#0f172a' }}>{recomendaciones.length} sugeridas</b>
                </div>
              </div>
            </div>

            {/* 3. BOTÓN «Ver análisis completo» */}
            <div className="cpy-ai-widget-footer">
              <button
                type="button"
                className="cpy-ai-btn-primary"
                onClick={() => setModalAbierto(true)}
              >
                <span>Ver análisis completo</span>
                <ArrowRight size={16} className="btn-icon-arrow" />
              </button>
            </div>
          </div>
        )}
      </article>

      {/* ========================================================
          4. MODAL CON LAS 4 SECCIONES COMPLETAS
          ======================================================== */}
      {modalAbierto && (
        <div className="cpy-ai-modal-overlay" onClick={() => setModalAbierto(false)}>
          <div
            className="cpy-ai-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cpy-ai-modal-title"
          >
            {/* Modal Header */}
            <div className="cpy-ai-modal-header">
              <div className="cpy-ai-modal-title-wrap">
                <div className="cpy-ai-modal-icon">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 id="cpy-ai-modal-title">Análisis Financiero Completo</h2>
                    <span className="cpy-ai-chip-tech">
                      <Sparkles size={11} /> Gemini AI
                    </span>
                  </div>
                  <p>Diagnóstico ejecutivo inteligente y recomendaciones para ContaPyme</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="cpy-ai-btn-refresh-sm"
                  onClick={cargarAnalisis}
                  disabled={cargando}
                  title="Actualizar análisis"
                >
                  <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} />
                  Actualizar
                </button>
                <button
                  type="button"
                  className="cpy-ai-modal-close"
                  onClick={() => setModalAbierto(false)}
                  aria-label="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Pestañas de las 4 secciones solicitadas */}
            <div className="cpy-ai-modal-tabs">
              <button
                type="button"
                className={`cpy-ai-modal-tab ${seccionActiva === 1 ? 'active' : ''}`}
                onClick={() => setSeccionActiva(1)}
              >
                <Activity size={15} />
                <span>1. Situación financiera</span>
              </button>

              <button
                type="button"
                className={`cpy-ai-modal-tab ${seccionActiva === 2 ? 'active' : ''}`}
                onClick={() => setSeccionActiva(2)}
              >
                <TrendingUp size={15} />
                <span>2. Tendencias</span>
                <span className="tab-pill">{tendencias.length}</span>
              </button>

              <button
                type="button"
                className={`cpy-ai-modal-tab ${seccionActiva === 3 ? 'active' : ''}`}
                onClick={() => setSeccionActiva(3)}
              >
                <AlertTriangle size={15} />
                <span>3. Riesgos financieros</span>
                <span className="tab-pill">{riesgos.length}</span>
              </button>

              <button
                type="button"
                className={`cpy-ai-modal-tab ${seccionActiva === 4 ? 'active' : ''}`}
                onClick={() => setSeccionActiva(4)}
              >
                <Lightbulb size={15} />
                <span>4. Recomendaciones</span>
                <span className="tab-pill">{recomendaciones.length}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="cpy-ai-modal-body">
              {/* ----------------------------------------------------
                  SECCIÓN 1: SITUACIÓN FINANCIERA
                  Explica cómo se encuentra actualmente tu negocio,
                  sus fortalezas y áreas de oportunidad.
                  ---------------------------------------------------- */}
              {seccionActiva === 1 && (
                <div className="cpy-ai-section-content">
                  <div className="cpy-ai-box-primary">
                    <div className="cpy-ai-box-head">
                      <div className="cpy-ai-box-head-title">
                        <Activity size={18} style={{ color: '#142a95' }} />
                        <h3>Diagnóstico actual del negocio</h3>
                      </div>
                      {diag.estado_salud && (
                        <span
                          className="cpy-ai-chip-status"
                          style={{ background: salud.bg, color: salud.color, borderColor: salud.border }}
                        >
                          <span className="cpy-ai-status-dot" style={{ background: salud.dot }} />
                          {salud.label}
                        </span>
                      )}
                    </div>
                    <p className="cpy-ai-lead-text">
                      {diag.resumen_ejecutivo || 'Sin suficiente información para emitir diagnóstico.'}
                    </p>
                  </div>

                  <div className="cpy-ai-columns-grid">
                    {/* Fortalezas del negocio */}
                    <div className="cpy-ai-feature-card strengths">
                      <div className="cpy-ai-card-title">
                        <CheckCircle2 size={17} style={{ color: '#059669' }} />
                        <h4>Fortalezas del negocio</h4>
                      </div>
                      {Array.isArray(diag.fortalezas) && diag.fortalezas.length > 0 ? (
                        <ul className="cpy-ai-list">
                          {diag.fortalezas.map((f, i) => (
                            <li key={i}>
                              <span className="li-bullet green"><Check size={12} /></span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="cpy-ai-empty-text">No se identificaron fortalezas destacadas en el periodo.</p>
                      )}
                    </div>

                    {/* Áreas de oportunidad */}
                    <div className="cpy-ai-feature-card opportunities">
                      <div className="cpy-ai-card-title">
                        <Target size={17} style={{ color: '#2563eb' }} />
                        <h4>Áreas de oportunidad</h4>
                      </div>
                      {Array.isArray(diag.areas_oportunidad) && diag.areas_oportunidad.length > 0 ? (
                        <ul className="cpy-ai-list">
                          {diag.areas_oportunidad.map((op, i) => (
                            <li key={i}>
                              <span className="li-bullet blue"><Target size={12} /></span>
                              <span>{op}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="cpy-ai-empty-text">Sin áreas de oportunidad registradas.</p>
                      )}
                    </div>
                  </div>

                  {/* Balance y Liquidez */}
                  <div className="cpy-ai-columns-grid" style={{ marginTop: 4 }}>
                    <div className="cpy-ai-metric-detail-box">
                      <div className="head">
                        <Scale size={16} style={{ color: '#142a95' }} />
                        <strong>Balance operativo</strong>
                      </div>
                      <p>{diag.balance_operativo || 'Sin operaciones suficientes registradas.'}</p>
                    </div>

                    <div className="cpy-ai-metric-detail-box">
                      <div className="head">
                        <Wallet size={16} style={{ color: '#142a95' }} />
                        <strong>Situación de liquidez</strong>
                      </div>
                      <p>{diag.situacion_liquidez || 'Sin compromisos registrados.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  SECCIÓN 2: TENDENCIAS
                  Muestra cómo han evolucionado tus ventas, ingresos,
                  gastos y otros indicadores.
                  ---------------------------------------------------- */}
              {seccionActiva === 2 && (
                <div className="cpy-ai-section-content">
                  <div className="cpy-ai-section-banner">
                    <p>
                      Comparación de comportamiento financiero entre periodos equivalentes calculados por el sistema
                      e interpretados por IA.
                    </p>
                  </div>

                  {tendencias.length === 0 ? (
                    <div className="cpy-ai-empty-block">
                      No se detectaron tendencias suficientes con los movimientos registrados.
                    </div>
                  ) : (
                    <div className="cpy-ai-trends-grid">
                      {tendencias.map((t, idx) => (
                        <div key={idx} className={`cpy-ai-trend-card trend-type-${t.tipo || 'neutra'}`}>
                          <div className="trend-top">
                            <span className="trend-title">{t.indicador}</span>
                            <span
                              className={`trend-pill ${t.tipo === 'positiva' ? 'pos' : t.tipo === 'negativa' ? 'neg' : 'neu'}`}
                            >
                              {getIconoTendencia(t.tipo)}
                              {t.variacion_porcentaje}
                            </span>
                          </div>
                          <p className="trend-desc">{t.analisis}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------
                  SECCIÓN 3: RIESGOS FINANCIEROS
                  Identifica situaciones que podrían afectar la estabilidad
                  del negocio (confirmados, potenciales y seguimiento).
                  ---------------------------------------------------- */}
              {seccionActiva === 3 && (
                <div className="cpy-ai-section-content">
                  {riesgos.length === 0 ? (
                    <div className="cpy-ai-empty-success">
                      <CheckCircle2 size={24} style={{ color: '#059669', flexShrink: 0 }} />
                      <div>
                        <strong>No se detectaron riesgos financieros críticos</strong>
                        <p>Las obligaciones, liquidez y existencias operan dentro de los márgenes previstos.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="cpy-ai-risks-list">
                      {riesgos.map((r, idx) => {
                        const badge = getNivelRiesgoBadge(r.nivel);
                        return (
                          <div key={idx} className={`cpy-ai-risk-card level-${r.nivel || 'seguimiento'}`}>
                            <div className="risk-header">
                              <div className="risk-title-line">
                                <ShieldAlert size={16} className="risk-icon" />
                                <strong>{r.titulo}</strong>
                              </div>
                              <span
                                className="risk-badge"
                                style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}
                              >
                                {badge.icon}
                                {badge.label}
                              </span>
                            </div>
                            <p className="risk-body">{r.descripcion}</p>
                            {r.impacto_estimado && (
                              <div className="risk-impact">
                                <span className="risk-impact-tag">Impacto previsto:</span> {r.impacto_estimado}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------
                  SECCIÓN 4: RECOMENDACIONES
                  Propone acciones concretas para mejorar la administración.
                  ---------------------------------------------------- */}
              {seccionActiva === 4 && (
                <div className="cpy-ai-section-content">
                  {recomendaciones.length === 0 ? (
                    <div className="cpy-ai-empty-block">
                      No hay recomendaciones pendientes para las operaciones actuales.
                    </div>
                  ) : (
                    <div className="cpy-ai-recs-list">
                      {recomendaciones.map((rec, idx) => (
                        <div key={idx} className="cpy-ai-rec-card">
                          <div className="rec-header">
                            <div className="rec-title-wrap">
                              <span className="rec-number">{idx + 1}</span>
                              <h4>{rec.titulo}</h4>
                            </div>
                            {rec.indicador_origen && (
                              <span className="rec-origin">
                                Indicador origen: <b>{rec.indicador_origen}</b>
                              </span>
                            )}
                          </div>
                          <div className="rec-action-box">
                            <span className="action-tag">Acción recomendada</span>
                            <p>{rec.accion}</p>
                          </div>
                          <div className="rec-why-box">
                            <span className="why-tag">Por qué conviene atenderlo:</span>
                            <p>{rec.justificacion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="cpy-ai-modal-footer">
              <span className="cpy-ai-footer-note">
                <Sparkles size={13} style={{ color: '#4f46e5' }} />
                Análisis generado bajo demanda a partir de las operaciones de ContaPyme.
              </span>
              <button
                type="button"
                className="cpy-ai-btn-secondary"
                onClick={() => setModalAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
