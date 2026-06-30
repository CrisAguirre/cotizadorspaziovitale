import * as XLSX from 'xlsx';

/**
 * Lector de archivos .xlsx utilizando la librería estandar SheetJS (xlsx).
 * Reemplaza al parser manual anterior manteniendo las mismas firmas.
 */

export async function readXlsxSheet(buffer: ArrayBuffer, sheetIndex = 1): Promise<XLSX.WorkSheet> {
  // Leemos el libro desde el buffer
  const wb = XLSX.read(buffer, { type: 'array' });
  
  // sheetIndex es 1-based (según el parser original)
  const sheetName = wb.SheetNames[sheetIndex - 1];
  
  if (!sheetName || !wb.Sheets[sheetName]) {
    throw new Error(`No se encontró la hoja con índice ${sheetIndex} en el archivo.`);
  }

  return wb.Sheets[sheetName];
}

export function getCell(sheet: XLSX.WorkSheet, col: string, row: number): string {
  const cellAddress = `${col}${row}`;
  const cell = sheet[cellAddress];
  
  if (!cell) return '';

  // .w tiene el texto formateado como se ve en Excel, .v el valor crudo
  if (cell.w !== undefined) {
    return cell.w.trim();
  }
  
  if (cell.v !== undefined) {
    return String(cell.v).trim();
  }

  return '';
}

export function getCellNum(sheet: XLSX.WorkSheet, col: string, row: number): number {
  const cellAddress = `${col}${row}`;
  const cell = sheet[cellAddress];
  
  if (!cell) return 0;

  // Si SheetJS ya lo parseó como número, usamos eso de inmediato
  if (typeof cell.v === 'number') {
    return cell.v;
  }

  // Fallback seguro: intentamos extraer dígitos de la versión string
  const v = getCell(sheet, col, row);
  const n = parseFloat(v.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
