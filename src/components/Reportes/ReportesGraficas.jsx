import React, { useEffect, useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import { formatoMoneda, formatoNumero } from './reportesAnalisis';

const formatoEje = (valor, esMoneda) => {
    const n = Number(valor || 0);
    const texto = Math.abs(n) >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n);
    return esMoneda ? `$${texto}` : texto;
};

function TooltipPill({ active, payload, esMoneda }) {
    if (!active || !payload || !payload.length) return null;
    const punto = payload[0].payload;

    return (
        <div className="rep-tip">
            {punto.etiquetaLarga} · {esMoneda ? formatoMoneda(punto.valor) : formatoNumero(punto.valor)}
        </div>
    );
}

function GraficaBarras({ titulo, subtitulo, serie, esMoneda }) {
    const [activo, setActivo] = useState(null);

    useEffect(() => {
        setActivo(null);
    }, [serie]);

    const indiceMax = useMemo(() => {
        let max = -1;
        let idx = -1;
        serie.forEach((p, i) => {
            if (p.valor > max) {
                max = p.valor;
                idx = i;
            }
        });
        return idx;
    }, [serie]);

    const indiceActivo = activo ?? indiceMax;
    const sinDatos = serie.length === 0 || serie.every((p) => !p.valor);

    return (
        <div className="rep-card rep-chart">
            <h3>{titulo}</h3>
            <p className="rep-card-sub">{subtitulo}</p>

            {sinDatos ? (
                <div className="rep-empty-chart">No hay datos para mostrar en este periodo.</div>
            ) : (
                <div className="rep-chart-box">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={serie} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8F5" />

                            <XAxis
                                dataKey="etiqueta"
                                tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                interval={serie.length > 16 ? 1 : 0}
                            />

                            <YAxis
                                tickFormatter={(v) => formatoEje(v, esMoneda)}
                                tick={{ fontSize: 11, fill: '#9AA1B8', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                width={48}
                            />

                            <Tooltip
                                cursor={false}
                                content={<TooltipPill esMoneda={esMoneda} />}
                                wrapperStyle={{ outline: 'none' }}
                            />

                            <Bar
                                dataKey="valor"
                                radius={[8, 8, 8, 8]}
                                maxBarSize={26}
                                isAnimationActive={false}
                                onMouseEnter={(_, i) => setActivo(i)}
                                onMouseLeave={() => setActivo(null)}
                            >
                                {serie.map((p, i) => (
                                    <Cell
                                        key={`${p.etiquetaLarga}-${i}`}
                                        fill={i === indiceActivo ? '#142A95' : '#D5DBF7'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function PanelRanking({ titulo, subtitulo, items }) {
    const max = Math.max(...items.map((i) => i.valor), 0);

    return (
        <div className="rep-card rep-rank">
            <h3>{titulo}</h3>
            <p className="rep-card-sub">{subtitulo}</p>

            {items.length === 0 || max === 0 ? (
                <div className="rep-empty-chart">Sin datos en este periodo.</div>
            ) : (
                <div className="rep-rank-list">
                    {items.map((item) => (
                        <div key={item.label} className="rep-rank-item">
                            <div className="rep-rank-head">
                                <span>{item.label}</span>
                                <b>{item.texto}</b>
                            </div>
                            <div className="rep-rank-track">
                                <div
                                    className="rep-rank-fill"
                                    style={{ width: `${Math.max((item.valor / max) * 100, 3)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ReportesGraficas({ grafica, ranking }) {
    return (
        <div className="rep-grid-charts">
            <GraficaBarras {...grafica} />
            <PanelRanking {...ranking} />
        </div>
    );
}