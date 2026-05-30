/**
 * Lector ZIP mínimo para archivos .xlsx (sin dependencias externas).
 */

interface ZipEntry {
  name: string;
  compression: number;
  compressed: Uint8Array;
}

function readUint16(dv: DataView, offset: number): number {
  return dv.getUint16(offset, true);
}

function readUint32(dv: DataView, offset: number): number {
  return dv.getUint32(offset, true);
}

function parseZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const bytes = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset + 30 < bytes.length) {
    const sig = readUint32(dv, offset);
    if (sig !== 0x04034b50) break;

    const compression = readUint16(dv, offset + 8);
    const compressedSize = readUint32(dv, offset + 18);
    const fileNameLength = readUint16(dv, offset + 26);
    const extraLength = readUint16(dv, offset + 28);
    const nameStart = offset + 30;
    const nameBytes = bytes.slice(nameStart, nameStart + fileNameLength);
    const name = new TextDecoder().decode(nameBytes);
    const dataStart = nameStart + fileNameLength + extraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);

    entries.push({ name, compression, compressed });
    offset = dataStart + compressedSize;
  }

  return entries;
}

async function inflateDeflate(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('El navegador no soporta descompresión ZIP. Use Chrome o Edge actualizado.');
  }
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([compressed]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

export async function extractXlsxXml(buffer: ArrayBuffer, entryPath: string): Promise<string | null> {
  const entries = parseZipEntries(buffer);
  const normalized = entryPath.replace(/\\/g, '/');
  const entry = entries.find((e) => e.name.replace(/\\/g, '/') === normalized);
  if (!entry) return null;

  let raw: Uint8Array;
  if (entry.compression === 0) {
    raw = entry.compressed;
  } else if (entry.compression === 8) {
    raw = await inflateDeflate(entry.compressed);
  } else {
    throw new Error(`Compresión ZIP no soportada (${entry.compression}) en ${entry.name}`);
  }

  return new TextDecoder('utf-8').decode(raw);
}

export async function readXlsxSheet(buffer: ArrayBuffer, sheetIndex = 1): Promise<Map<string, string>> {
  const sharedXml = await extractXlsxXml(buffer, 'xl/sharedStrings.xml');
  const sheetXml = await extractXlsxXml(buffer, `xl/worksheets/sheet${sheetIndex}.xml`);

  if (!sheetXml) {
    throw new Error(`No se encontró la hoja sheet${sheetIndex} en el archivo.`);
  }

  const shared: string[] = [];
  if (sharedXml) {
    const doc = new DOMParser().parseFromString(sharedXml, 'application/xml');
    doc.querySelectorAll('si').forEach((si) => {
      shared.push((si.textContent || '').trim());
    });
  }

  const doc = new DOMParser().parseFromString(sheetXml, 'application/xml');
  const cells = new Map<string, string>();
  const cellNodes = doc.getElementsByTagName('c');

  for (let i = 0; i < cellNodes.length; i++) {
    const cell = cellNodes[i];
    const ref = cell.getAttribute('r');
    if (!ref) continue;
    const t = cell.getAttribute('t');
    const vNodes = cell.getElementsByTagName('v');
    if (!vNodes.length || !vNodes[0].textContent) continue;
    let value = vNodes[0].textContent;
    if (t === 's') {
      value = shared[parseInt(value, 10)] ?? '';
    }
    cells.set(ref, value);
  }

  return cells;
}

export function getCell(cells: Map<string, string>, col: string, row: number): string {
  return (cells.get(`${col}${row}`) || '').trim();
}

export function getCellNum(cells: Map<string, string>, col: string, row: number): number {
  const v = getCell(cells, col, row);
  const n = parseFloat(v.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
