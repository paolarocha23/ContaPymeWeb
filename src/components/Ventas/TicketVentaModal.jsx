import React from 'react';
import { X, Printer } from 'lucide-react';
import { formatMoney, formatFechaHora, formatFechaISO } from '../../utils/ventasUtils';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ETIQ_PAGO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta' };
const ETIQ_COND = { contado: 'Contado', credito: 'Crédito' };

function imprimir(t) {
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) {
    alert('Permita las ventanas emergentes para imprimir el ticket.');
    return;
  }
  const filas = t.items
    .map(
      (it) => `<tr><td>${esc(it.producto)}<br><small>${esc(it.descripcion)}</small></td>
      <td style="text-align:center">${esc(it.cantidad)}</td>
      <td style="text-align:right">${formatMoney(it.subtotal)}</td></tr>`
    )
    .join('');

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${esc(t.ticket)}</title>
  <style>
    body{font-family:monospace;font-size:12px;width:300px;margin:8px auto;color:#000}
    h3,p{margin:2px 0;text-align:center} table{width:100%;border-collapse:collapse;margin:8px 0}
    td{padding:3px 0;vertical-align:top} hr{border:0;border-top:1px dashed #000}
    .r{display:flex;justify-content:space-between} small{color:#444}
  </style></head><body>
    <h3>TICKET DE VENTA</h3><p><strong>${esc(t.ticket)}</strong></p>
    <p>${esc(formatFechaHora(t.fecha))}</p><hr>
    <div>Vendedor: ${esc(t.vendedor)}</div><div>Cliente: ${esc(t.cliente)}</div><hr>
    <table>${filas}</table><hr>
    <div class="r"><span>Subtotal</span><span>${formatMoney(t.subtotal)}</span></div>
    <div class="r"><strong>Total</strong><strong>${formatMoney(t.total)}</strong></div>
    <div class="r"><span>Monto pagado</span><span>${formatMoney(t.monto_pagado)}</span></div>
    <div class="r"><span>Saldo pendiente</span><span>${formatMoney(t.saldo_pendiente)}</span></div><hr>
    <div>Condiciones: ${esc(ETIQ_COND[t.condiciones_pago] || t.condiciones_pago)}</div>
    ${t.fecha_vencimiento ? `<div>Vence: ${esc(formatFechaISO(t.fecha_vencimiento))}</div>` : ''}
    <div>Forma de pago: ${esc(ETIQ_PAGO[t.forma_pago] || t.forma_pago)}</div>
    <div>Estatus: ${esc(String(t.estatus).toUpperCase())}</div><hr><p>¡Gracias por su compra!</p>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export default function TicketVentaModal({ ticket, isOpen, onClose }) {
  if (!isOpen || !ticket) return null;

  return (
    <div className="ventas-modal-backdrop" onClick={onClose}>
      <div className="ventas-modal-card ventas-ticket-card" onClick={(e) => e.stopPropagation()}>
        <div className="ventas-modal-header">
          <h3>Ticket {ticket.ticket}</h3>
          <button type="button" className="ventas-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="ventas-modal-body">
          <div className="ventas-ticket-paper">
            <div className="ventas-ticket-row"><span>Fecha</span><strong>{formatFechaHora(ticket.fecha)}</strong></div>
            <div className="ventas-ticket-row"><span>Vendedor</span><strong>{ticket.vendedor}</strong></div>
            <div className="ventas-ticket-row"><span>Cliente</span><strong>{ticket.cliente}</strong></div>

            <table className="ventas-items-table">
              <thead>
                <tr>
                  <th>Producto / Servicio</th>
                  <th style={{ textAlign: 'center' }}>Cant.</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {ticket.items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      {it.producto}
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.descripcion} · {formatMoney(it.precio_unitario)} c/u</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ventas-ticket-row"><span>Subtotal</span><span>{formatMoney(ticket.subtotal)}</span></div>
            <div className="ventas-ticket-row total"><span>Total</span><span>{formatMoney(ticket.total)}</span></div>
            <div className="ventas-ticket-row"><span>Monto pagado</span><span>{formatMoney(ticket.monto_pagado)}</span></div>
            <div className="ventas-ticket-row"><span>Saldo pendiente</span><span>{formatMoney(ticket.saldo_pendiente)}</span></div>
            <div className="ventas-ticket-row"><span>Condiciones</span><span>{ETIQ_COND[ticket.condiciones_pago] || ticket.condiciones_pago}</span></div>
            {ticket.fecha_vencimiento && (
              <div className="ventas-ticket-row"><span>Vencimiento</span><span>{formatFechaISO(ticket.fecha_vencimiento)}</span></div>
            )}
            <div className="ventas-ticket-row"><span>Forma de pago</span><span>{ETIQ_PAGO[ticket.forma_pago] || ticket.forma_pago}</span></div>
            <div className="ventas-ticket-row"><span>Estatus</span><strong style={{ textTransform: 'capitalize' }}>{ticket.estatus}</strong></div>
          </div>
        </div>

        <div className="ventas-modal-footer">
          <button type="button" className="ventas-btn-cancel" onClick={onClose}>Cerrar</button>
          <button type="button" className="ventas-btn-primary" onClick={() => imprimir(ticket)}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}