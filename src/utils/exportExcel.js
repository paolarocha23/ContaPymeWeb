import * as XLSX from 'xlsx';

/**
 * Utilidad profesional para exportar datos y reportes a formato Excel (.xlsx)
 * Cumple con el requerimiento RDF1606 (Exportar Reportes en formato Excel).
 */

export function exportarTablaAExcel({
  nombreArchivo = 'Reporte_ContaPyme',
  nombreHoja = 'Reporte',
  columnas = [],
  datos = [],
  resumen = null
}) {
  try {
    const wb = XLSX.utils.book_new();

    // 1. Preparar encabezados legibles y mapeo de datos
    const filasExportar = datos.map((item) => {
      const fila = {};
      columnas.forEach((col) => {
        let val = item[col.key];

        if (col.formato === 'moneda') {
          val = Number(val || 0);
        } else if (col.formato === 'fecha' && val) {
          val = String(val).slice(0, 10);
        } else if (col.formato === 'numero') {
          val = Number(val || 0);
        } else if (val == null) {
          val = '';
        }

        fila[col.header] = val;
      });
      return fila;
    });

    // 2. Si hay fila de totales/resumen, agregarla al final
    if (resumen && typeof resumen === 'object') {
      const filaResumen = {};
      columnas.forEach((col, idx) => {
        if (idx === 0) {
          filaResumen[col.header] = 'TOTAL GENERAL';
        } else if (resumen[col.key] !== undefined) {
          filaResumen[col.header] = resumen[col.key];
        } else {
          filaResumen[col.header] = '';
        }
      });
      filasExportar.push(filaResumen);
    }

    const ws = XLSX.utils.json_to_sheet(filasExportar);

    // Ajustar ancho automático de columnas
    const colWidths = columnas.map((col) => {
      const maxLenData = datos.reduce((max, item) => {
        const str = String(item[col.key] ?? '');
        return Math.max(max, str.length);
      }, col.header.length);
      return { wch: Math.min(Math.max(maxLenData + 3, col.width || 12), 40) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, nombreHoja.slice(0, 31));

    const timestamp = new Date().toISOString().slice(0, 10);
    const nombreFinal = `${nombreArchivo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}.xlsx`;

    XLSX.writeFile(wb, nombreFinal);
    return true;
  } catch (error) {
    console.error('Error al exportar reporte a Excel:', error);
    alert('No se pudo generar el archivo de Excel: ' + (error.message || 'Error desconocido'));
    return false;
  }
}

export function exportarResumenGeneralExcel({
  reportes,
  nombreArchivo = 'Reporte_General_ContaPyme'
}) {
  if (!reportes) return;

  try {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Indicadores Financieros
    const indicadoresData = [
      { Indicador: 'Ventas Totales Registradas', Valor: Number(reportes.ventas?.monto_total || 0), Conteo: Number(reportes.ventas?.total_ventas || 0) },
      { Indicador: 'Compras Totales Registradas', Valor: Number(reportes.compras?.monto_total || 0), Conteo: Number(reportes.compras?.total_compras || 0) },
      { Indicador: 'Ingresos Percibidos', Valor: Number(reportes.ingresos?.monto_total || 0), Conteo: Number(reportes.ingresos?.total_ingresos || 0) },
      { Indicador: 'Gastos Operativos', Valor: Number(reportes.gastos?.monto_total || 0), Conteo: Number(reportes.gastos?.total_gastos || 0) },
      { Indicador: 'Balance Neto (Ingresos - Gastos)', Valor: Number(reportes.indicadores?.balance_ingresos_gastos || 0), Conteo: '' },
      { Indicador: 'Cuentas por Cobrar (Saldo Pendiente)', Valor: Number(reportes.cuentas_por_cobrar?.saldo_pendiente || 0), Conteo: Number(reportes.cuentas_por_cobrar?.cuentas_pendientes || 0) },
      { Indicador: 'Cuentas por Pagar (Saldo Pendiente)', Valor: Number(reportes.cuentas_por_pagar?.saldo_pendiente || 0), Conteo: Number(reportes.cuentas_por_pagar?.cuentas_pendientes || 0) },
      { Indicador: 'Valor Total del Inventario', Valor: Number(reportes.inventario?.valor_inventario || 0), Conteo: Number(reportes.inventario?.total_productos || 0) },
      { Indicador: 'Productos con Stock Bajo', Valor: '', Conteo: Number(reportes.inventario?.productos_stock_bajo || 0) }
    ];

    const wsIndicadores = XLSX.utils.json_to_sheet(indicadoresData);
    wsIndicadores['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsIndicadores, 'Resumen General');

    const timestamp = new Date().toISOString().slice(0, 10);
    const nombreFinal = `${nombreArchivo}_${timestamp}.xlsx`;

    XLSX.writeFile(wb, nombreFinal);
    return true;
  } catch (error) {
    console.error('Error al exportar resumen a Excel:', error);
    alert('No se pudo generar el archivo de Excel: ' + (error.message || 'Error'));
    return false;
  }
}
