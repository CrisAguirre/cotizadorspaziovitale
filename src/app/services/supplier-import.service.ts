import { Injectable } from '@angular/core';
import { Material } from '../models/interfaces';
import { readXlsxSheet, getCell, getCellNum } from '../utils/excel-zip.util';

export type SupplierImportFormat =
  | 'hejercol'
  | 'ferramenta'
  | 'volpato'
  | 'iberway_cocina'
  | 'roca_marmol'
  | 'lamitech_compac'
  | 'tecnifacil';

export interface ImportPreview {
  format: SupplierImportFormat;
  provider: string;
  fileName: string;
  materials: Material[];
  skipped: number;
}

// ── Config types ────────────────────────────────────────────────

interface RawFields {
  code: string;
  description: string;
  price: number;
  unit: string;
  color: string;
  section: string;
  extras: Record<string, string>;
}

interface SupplierColumnMap {
  code: string;
  description: string;
  price: string;
  priceFallback?: string;
  unit?: string;
  color?: string;
  section: string;
  extras?: Record<string, string>;
}

interface SupplierImportConfig {
  format: SupplierImportFormat;
  provider: string;
  category: Material['category'];
  sheetIndex: number;
  startRow: number;
  maxRow: number;
  defaultUnit: string;
  normalizeUnit?: boolean;
  columns: SupplierColumnMap;

  isEmptyRow: (f: RawFields) => boolean;
  isSectionRow: (f: RawFields) => boolean;
  isValidRow: (f: RawFields) => boolean;
  shouldCountSkip: (f: RawFields) => boolean;
  buildCode?: (f: RawFields, row: number) => string;
  buildDescription?: (f: RawFields, section: string) => string;
  postProcessMaterial?: (material: Material, fields: RawFields) => Material;
}

// ── Supplier configs ────────────────────────────────────────────

const SUPPLIER_CONFIGS: Record<SupplierImportFormat, SupplierImportConfig> = {

  hejercol: {
    format: 'hejercol',
    provider: 'HEJERCOL',
    category: 'herraje',
    sheetIndex: 1, startRow: 4, maxRow: 2000,
    defaultUnit: 'UNIDAD',
    normalizeUnit: true,
    columns: {
      code: 'A', description: 'C', price: 'E',
      color: 'B', unit: 'D', section: 'A'
    },
    isEmptyRow: (f) => !f.code && !f.description,
    isSectionRow: (f) => !!f.section && !/^\d+$/.test(f.section) && !f.description,
    isValidRow: (f) => /^\d+$/.test(f.code) && !!f.description && f.price > 0,
    shouldCountSkip: () => true,
  },

  ferramenta: {
    format: 'ferramenta',
    provider: 'FERRAMENTA ITALIANA',
    category: 'herraje',
    sheetIndex: 1, startRow: 4, maxRow: 500,
    defaultUnit: 'UNIDAD',
    columns: {
      code: 'C', description: 'D', price: 'F', priceFallback: 'G',
      section: 'B'
    },
    isEmptyRow: () => false,
    isSectionRow: (f) => !!f.section && !f.description && !f.code,
    isValidRow: (f) => !!f.description && f.price > 0,
    shouldCountSkip: (f) => !!f.description || !!f.code,
    buildCode: (f) => f.code || f.description.substring(0, 40),
    buildDescription: (f, section) => section ? `${f.description} — ${section}` : f.description,
  },

  volpato: {
    format: 'volpato',
    provider: 'VOLPATO',
    category: 'accesorio',
    sheetIndex: 1, startRow: 4, maxRow: 200,
    defaultUnit: 'UNIDAD',
    columns: {
      code: 'C', description: 'D', price: 'F',
      section: 'B'
    },
    isEmptyRow: () => false,
    isSectionRow: (f) => !!f.section && !f.description,
    isValidRow: (f) => !!f.description && f.price > 0,
    shouldCountSkip: (f) => !!f.description,
    buildCode: (f, row) => f.code || `VOL-${row}`,
    buildDescription: (f, section) => section ? `${f.description} — ${section}` : f.description,
  },

  iberway_cocina: {
    format: 'iberway_cocina',
    provider: 'IBERWAY',
    category: 'herraje',
    sheetIndex: 1, startRow: 4, maxRow: 200,
    defaultUnit: 'UNIDAD',
    columns: {
      code: 'C', description: 'D', price: 'G',
      section: 'B',
      extras: { module: 'E', dimension: 'F' }
    },
    isEmptyRow: () => false,
    isSectionRow: (f) => !!f.section && !f.code,
    isValidRow: (f) => !!f.code && f.price > 0,
    shouldCountSkip: (f) => !!f.code,
    buildDescription: (f, section) => {
      const parts = [
        f.description || f.code,
        f.extras['module'] ? `Módulo ${f.extras['module']}mm` : '',
        f.extras['dimension'] || ''
      ].filter(Boolean).join(' · ');
      return section ? `${parts} (${section})` : parts;
    },
  },

  roca_marmol: {
    format: 'roca_marmol',
    provider: 'ROCA MARMOL',
    category: 'meson',
    sheetIndex: 1, startRow: 6, maxRow: 50,
    defaultUnit: 'M2',
    columns: {
      code: 'A', description: 'A', price: 'B', section: 'A'
    },
    isEmptyRow: (f) => !f.description,
    isSectionRow: (f) => {
      const d = (f.description || '').toUpperCase();
      return !f.price && (d.includes('VALORES PARA') || d.includes('NOMBRE GRANITO') || d.includes('X 0,') || d.includes('VR CON'));
    },
    isValidRow: (f) => !!f.description && f.price > 0,
    shouldCountSkip: () => true,
    buildCode: (f, row) => {
      const cleanDesc = (f.description || '').replace(/\s*M2$/i, '').trim();
      return `RM-${cleanDesc.substring(0, 30).replace(/\s+/g, '_')}`;
    },
    buildDescription: (f) => {
      return (f.description || '').replace(/\s*M2$/i, '').trim() + ' (M²)';
    },
  },

  lamitech_compac: {
    format: 'lamitech_compac',
    provider: 'LAMITECH',
    category: 'meson',
    sheetIndex: 1, startRow: 6, maxRow: 16,
    defaultUnit: 'M2',
    columns: {
      code: 'D', description: 'D', price: 'J',
      section: 'A',
      extras: { platePrice: 'H', area: 'C' }
    },
    isEmptyRow: () => false,
    isSectionRow: (f) => {
      const d = (f.description || '').toUpperCase();
      return !f.price && (!f.code || d.includes('PRODUCTO') || d.includes('REF. COLOR'));
    },
    isValidRow: (f) => !!f.code && f.price > 0,
    shouldCountSkip: (f) => !!f.code,
    buildCode: (f) => {
      return (f.code || '').split(' ')[0];
    },
    buildDescription: (f) => {
      const parts = [(f.code || ''), f.extras['dimension'] || ''].filter(Boolean);
      return parts.join(' · ') + ' (M²)';
    },
    postProcessMaterial: (material, fields) => {
      const rawArea = fields.extras['area'] || '';
      const area = parseFloat(rawArea.replace(',', '.'));
      const rawPlatePrice = fields.extras['platePrice'] || '';
      const platePrice = parseFloat(rawPlatePrice.replace(/[^0-9,.]/g, '').replace(',', ''));
      if (area > 0) {
        material.sqmPerSheet = area;
      }
      if (platePrice > 0) {
        material.pricePerSheet = platePrice;
      }
      return material;
    },
  },

  tecnifacil: {
    format: 'tecnifacil',
    provider: 'TECNIFACIL',
    category: 'herraje',
    sheetIndex: 1, startRow: 4, maxRow: 200,
    defaultUnit: 'UNIDAD',
    columns: {
      code: 'A', description: 'B', price: 'C',
      section: 'A'
    },
    isEmptyRow: (f) => !f.code && !f.description,
    isSectionRow: (f) => {
      const d = (f.description || '').toUpperCase();
      return !f.price && (d.includes('SKU') || d.includes('PRODUCTO') || d.includes('PRECIO') || d.includes('REF'));
    },
    isValidRow: (f) => !!f.code && f.price > 0,
    shouldCountSkip: (f) => !!f.code || !!f.description,
    buildCode: (f) => {
      const raw = (f.code || '').replace(/\s+/g, '');
      if (!raw.startsWith('TFC')) return `TFC-${raw.substring(0, 20)}`;
      return raw;
    },
    buildDescription: (f) => {
      return (f.description || '').replace(/\s+/g, ' ').trim();
    },
  }
};

// ── Service ─────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SupplierImportService {

  async parseFile(file: File, format: SupplierImportFormat): Promise<ImportPreview> {
    const config = SUPPLIER_CONFIGS[format];
    if (!config) throw new Error('Formato no soportado');
    const buffer = await file.arrayBuffer();
    return this.parseSupplierFile(buffer, file.name, config);
  }

  detectFormat(fileName: string): SupplierImportFormat | null {
    const n = fileName.toUpperCase();
    if (n.includes('HEJERCOL') || n.includes('PORTAFOLIO')) return 'hejercol';
    if (n.includes('FERRAMENTA')) return 'ferramenta';
    if (n.includes('VOLPATO')) return 'volpato';
    if (n.includes('IBERWAY') || n.includes('IBERWEY') || n.includes('COCINA Y ARMARIO')) return 'iberway_cocina';
    if (n.includes('MESONES') || n.includes('ROCA MARMOL')) return 'roca_marmol';
    if (n.includes('COMPAC') || n.includes('LAMITECH')) return 'lamitech_compac';
    if (n.includes('TFC') || n.includes('TECNIFACIL')) return 'tecnifacil';
    return null;
  }

  // ── Generic parser ──────────────────────────────────────────

  private async parseSupplierFile(
    buffer: ArrayBuffer,
    fileName: string,
    config: SupplierImportConfig
  ): Promise<ImportPreview> {
    const cells = await readXlsxSheet(buffer, config.sheetIndex);
    const materials: Material[] = [];
    let skipped = 0;
    let section = '';

    for (let row = config.startRow; row <= config.maxRow; row++) {
      const cols = config.columns;

      // Read all configured columns into a flat object
      const fields: RawFields = {
        code: getCell(cells, cols.code, row),
        description: getCell(cells, cols.description, row),
        price: getCellNum(cells, cols.price, row) ||
          (cols.priceFallback ? getCellNum(cells, cols.priceFallback, row) : 0),
        unit: cols.unit ? getCell(cells, cols.unit, row) : '',
        color: cols.color ? getCell(cells, cols.color, row) : '',
        section: getCell(cells, cols.section, row),
        extras: {}
      };

      // Read extra columns (module, dimension, etc.)
      if (cols.extras) {
        for (const [key, col] of Object.entries(cols.extras)) {
          fields.extras[key] = getCell(cells, col, row);
        }
      }

      // 1. Empty row → skip silently
      if (config.isEmptyRow(fields)) continue;

      // 2. Section header → update tracker, continue
      if (config.isSectionRow(fields)) {
        section = fields.section;
        continue;
      }

      // 3. Invalid row → maybe count as skipped
      if (!config.isValidRow(fields)) {
        if (config.shouldCountSkip(fields)) skipped++;
        continue;
      }

      // 4. Build material
      const code = config.buildCode ? config.buildCode(fields, row) : fields.code;
      const description = config.buildDescription ? config.buildDescription(fields, section) : fields.description;
      const unit = config.normalizeUnit ? this.normalizeUnit(fields.unit) : (fields.unit || config.defaultUnit);

      let material = this.baseMaterial({
        category: config.category,
        code,
        description,
        provider: config.provider,
        unit: unit || config.defaultUnit,
        unitPrice: fields.price,
        color: fields.color || '',
        dimension: fields.extras['dimension'] || ''
      });

      if (config.postProcessMaterial) {
        material = config.postProcessMaterial(material, fields);
      }

      materials.push(material);
    }

    return { format: config.format, provider: config.provider, fileName, materials, skipped };
  }

  // ── Helpers ─────────────────────────────────────────────────

  private normalizeUnit(raw: string): string {
    const u = (raw || 'UNIDAD').toUpperCase();
    if (u.includes('ML')) return 'ML';
    if (u.includes('M2') || u.includes('M²')) return 'M2';
    if (u.includes('LAM')) return 'LAMINA';
    if (u.includes('JGO') || u.includes('JUEGO')) return 'JUEGO';
    if (u.includes('KIT')) return 'KIT';
    if (u.includes('TIRO')) return 'TIRO';
    return 'UNIDAD';
  }

  private baseMaterial(partial: Partial<Material>): Material {
    return {
      category: partial.category || 'otro',
      code: partial.code || '',
      description: partial.description || '',
      provider: partial.provider || '',
      color: partial.color || '',
      dimension: partial.dimension || '',
      unit: partial.unit || 'UNIDAD',
      unitPrice: partial.unitPrice || 0,
      pricePerSheet: 0,
      measure1: 0,
      measure2: 0,
      sqmPerSheet: 0,
      pricePerSqm: 0,
      active: true,
      ...partial
    };
  }
}
