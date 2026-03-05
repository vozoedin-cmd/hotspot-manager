/**
 * Utilidades de exportación: Excel (XLSX) y PDF (impresión del navegador)
 */
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── EXCEL ────────────────────────────────────────────────────────────────────

/**
 * Exporta un array de objetos planos a un archivo .xlsx
 * @param {Object[]} rows - Filas de datos
 * @param {string[]} headers - Nombres de columnas (en orden)
 * @param {string} filename - Nombre del archivo sin extensión
 * @param {string} sheetName - Nombre de la hoja
 */
export function exportToExcel(rows, headers, filename = 'reporte', sheetName = 'Datos') {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Estilo de encabezado (ancho de columnas automático)
  const colWidths = headers.map((h) => ({
    wch: Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length), 10),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const dateStr = format(new Date(), 'yyyy-MM-dd', { locale: es });
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}

// ─── PDF (impresión del navegador) ────────────────────────────────────────────

/**
 * Abre una ventana de impresión con una tabla bien formateada.
 * @param {Object} options
 * @param {string} options.title - Título del reporte
 * @param {string[]} options.columns - Encabezados de columnas
 * @param {(string|number)[][]} options.data - Array de filas (cada fila es array de valores)
 * @param {string} [options.subtitle] - Subtítulo opcional
 * @param {Object[]} [options.summary] - Resumen: [{label, value}]
 */
export function exportToPDF({ title, columns, data, subtitle = '', summary = [] }) {
  const dateStr = format(new Date(), "d 'de' MMMM yyyy", { locale: es });

  const summaryHTML = summary.length > 0
    ? `<div class="summary">
        ${summary.map((s) => `<div class="summary-item"><span>${s.label}</span><strong>${s.value}</strong></div>`).join('')}
      </div>`
    : '';

  const tableRows = data
    .map((row) => `<tr>${row.map((cell) => `<td>${cell ?? '—'}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
    h1 { font-size: 18px; color: #1e40af; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 11px; margin-bottom: 12px; }
    .summary { display: flex; gap: 16px; flex-wrap: wrap; background: #f0f4ff; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
    .summary-item { display: flex; flex-direction: column; }
    .summary-item span { font-size: 10px; color: #6b7280; }
    .summary-item strong { font-size: 14px; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { background: #1e40af; color: white; text-align: left; padding: 6px 8px; font-size: 10px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { margin-top: 16px; color: #9ca3af; font-size: 9px; text-align: right; }
    @media print {
      body { padding: 0; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="subtitle">${subtitle ? subtitle + ' · ' : ''}Generado el ${dateStr}</p>
  ${summaryHTML}
  <table>
    <thead>
      <tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p class="footer">HotspotManager · ${dateStr} · Total: ${data.length} registros</p>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
