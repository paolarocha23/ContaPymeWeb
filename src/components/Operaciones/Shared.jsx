import React from 'react';
import { X, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export const Pill = ({ tone = 'gray', children }) => <span className={`op-pill ${tone}`}>{children}</span>;

export function StatCard({ icon, label, value, tone }) {
  const amber = tone === 'amber';
  return (
    <div className="stat-card">
      <div className="stat-icon-wrapper" style={amber ? { background: '#FDF3E1', color: '#B26A00' } : undefined}>{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={amber ? { color: '#B26A00' } : undefined}>{value}</div>
      </div>
    </div>
  );
}

/** Selector segmentado (Efectivo | Tarjeta, Contado | Crédito) */
export function Seg({ options, value, onChange, readOnly = false }) {
  return (
    <div className={`op-seg${readOnly ? ' ro' : ''}`}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          className={value === o.value ? 'on' : ''}
          tabIndex={readOnly ? -1 : 0}
          onClick={() => !readOnly && onChange?.(o.value)}
        >
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

/** − 1 + */
export function Stepper({ value, onChange, min = 1, max, error }) {
  const fijar = (v) => {
    let n = Number(v);
    if (!Number.isFinite(n)) n = min;
    n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    onChange(Math.round(n * 100) / 100);
  };
  return (
    <div className={`op-step${error ? ' err' : ''}`}>
      <button type="button" onClick={() => fijar(value - 1)} aria-label="Menos"><Minus size={14} /></button>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onBlur={() => fijar(value)}
      />
      <button type="button" onClick={() => fijar(value + 1)} aria-label="Más"><Plus size={14} /></button>
    </div>
  );
}

export function Modal({ onClose, size = 'md', children }) {
  return (
    <div className="op-backdrop" onClick={onClose}>
      <div className={`op-modal ${size}`} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function ModalHead({ title, subtitle, onClose }) {
  return (
    <div className="op-modal-head">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <button type="button" className="op-x" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
    </div>
  );
}

export function Pagination({ pagina, total, porPagina, onChange, etiqueta }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const inicio = (pagina - 1) * porPagina;
  return (
    <div className="table-pagination-footer" style={{ margin: 0, padding: '16px 22px' }}>
      <span>Mostrando {inicio + 1}–{Math.min(inicio + porPagina, total)} de {total} {etiqueta}</span>
      <div className="pagination-controls">
        <button type="button" className="pagination-btn" disabled={pagina === 1} onClick={() => onChange(pagina - 1)}>
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
          <button type="button" key={n} className={`pagination-btn${n === pagina ? ' active' : ''}`} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
        <button type="button" className="pagination-btn" disabled={pagina === paginas} onClick={() => onChange(pagina + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}