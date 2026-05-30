import { Injectable } from '@angular/core';
import { Material } from '../models/interfaces';
import { readXlsxSheet, getCell, getCellNum } from '../utils/excel-zip.util';

export type SupplierImportFormat =
  | 'hejercol'
  | 'ferramenta'
  | 'volpato'
  | 'iberway_cocina';

export interface ImportPreview {
  format: SupplierImportFormat;
  provider: string;
  fileName: string;
  materials: Material[];
  skipped: number;
}

@Injectable({ providedIn: 'root' })
export class SupplierImportService {

  async parseFile(file: File, format: SupplierImportFormat): Promise<ImportPreview> {
    const buffer = await file.arrayBuffer();
    switch (format) {
      case 'hejercol':
        return await this.parseHejercol(buffer, file.name);
      case 'ferramenta':
        return await this.parseFerramenta(buffer, file.name);
      case 'volpato':
        return await this.parseVolpato(buffer, file.name);
      case 'iberway_cocina':
        return await this.parseIberwayCocina(buffer, file.name);
      default:
        throw new Error('Formato no soportado');
    }
  }

  detectFormat(fileName: string): SupplierImportFormat | null {
    const n = fileName.toUpperCase();
    if (n.includes('HEJERCOL') || n.includes('PORTAFOLIO')) return 'hejercol';
    if (n.includes('FERRAMENTA')) return 'ferramenta';
    if (n.includes('VOLPATO')) return 'volpato';
    if (n.includes('IBERWAY') || n.includes('IBERWEY') || n.includes('COCINA Y ARMARIO')) return 'iberway_cocina';
    return null;
  }

  private async parseHejercol(buffer: ArrayBuffer, fileName: string): Promise<ImportPreview> {
    const cells = await readXlsxSheet(buffer, 1);
    const materials: Material[] = [];
    let skipped = 0;
    let section = '';

    for (let row = 4; row <= 2000; row++) {
      const a = getCell(cells, 'A', row);
      const b = getCell(cells, 'B', row);
      const c = getCell(cells, 'C', row);
      const d = getCell(cells, 'D', row);
      const price = getCellNum(cells, 'E', row);

      if (!a && !c) continue;

      if (a && !/^\d+$/.test(a) && !c) {
        section = a;
        continue;
      }

      if (!/^\d+$/.test(a) || !c || price <= 0) {
        skipped++;
        continue;
      }

      materials.push(this.baseMaterial({
        category: 'herraje',
        code: a,
        description: c,
        provider: 'HEJERCOL',
        unit: this.normalizeUnit(d),
        unitPrice: price,
        color: b
      }));
    }

    return { format: 'hejercol', provider: 'HEJERCOL', fileName, materials, skipped };
  }

  private async parseFerramenta(buffer: ArrayBuffer, fileName: string): Promise<ImportPreview> {
    const cells = await readXlsxSheet(buffer, 1);
    const materials: Material[] = [];
    let skipped = 0;
    let section = '';

    for (let row = 4; row <= 500; row++) {
      const product = getCell(cells, 'B', row);
      const ref = getCell(cells, 'C', row);
      const desc = getCell(cells, 'D', row);
      const price = getCellNum(cells, 'F', row) || getCellNum(cells, 'G', row);

      if (product && !desc && !ref) {
        section = product;
        continue;
      }

      if (!desc || price <= 0) {
        if (desc || ref) skipped++;
        continue;
      }

      materials.push(this.baseMaterial({
        category: 'herraje',
        code: ref || desc.substring(0, 40),
        description: section ? `${desc} — ${section}` : desc,
        provider: 'FERRAMENTA ITALIANA',
        unit: 'UNIDAD',
        unitPrice: price
      }));
    }

    return { format: 'ferramenta', provider: 'FERRAMENTA ITALIANA', fileName, materials, skipped };
  }

  private async parseVolpato(buffer: ArrayBuffer, fileName: string): Promise<ImportPreview> {
    const cells = await readXlsxSheet(buffer, 1);
    const materials: Material[] = [];
    let skipped = 0;
    let section = '';

    for (let row = 4; row <= 200; row++) {
      const product = getCell(cells, 'B', row);
      const ref = getCell(cells, 'C', row);
      const desc = getCell(cells, 'D', row);
      const price = getCellNum(cells, 'F', row);

      if (product && !desc) {
        section = product;
        continue;
      }

      if (!desc || price <= 0) {
        if (desc) skipped++;
        continue;
      }

      materials.push(this.baseMaterial({
        category: 'accesorio',
        code: ref || `VOL-${row}`,
        description: section ? `${desc} — ${section}` : desc,
        provider: 'VOLPATO',
        unit: 'UNIDAD',
        unitPrice: price
      }));
    }

    return { format: 'volpato', provider: 'VOLPATO', fileName, materials, skipped };
  }

  private async parseIberwayCocina(buffer: ArrayBuffer, fileName: string): Promise<ImportPreview> {
    const cells = await readXlsxSheet(buffer, 1);
    const materials: Material[] = [];
    let skipped = 0;
    let section = '';

    for (let row = 4; row <= 200; row++) {
      const group = getCell(cells, 'B', row);
      const code = getCell(cells, 'C', row);
      const desc = getCell(cells, 'D', row);
      const module = getCell(cells, 'E', row);
      const measures = getCell(cells, 'F', row);
      const price = getCellNum(cells, 'G', row);

      if (group && !code) {
        section = group;
        continue;
      }

      if (!code || price <= 0) {
        if (code) skipped++;
        continue;
      }

      const fullDesc = [desc || code, module ? `Módulo ${module}mm` : '', measures].filter(Boolean).join(' · ');

      materials.push(this.baseMaterial({
        category: 'herraje',
        code,
        description: section ? `${fullDesc} (${section})` : fullDesc,
        provider: 'IBERWAY',
        unit: 'UNIDAD',
        unitPrice: price,
        dimension: measures
      }));
    }

    return { format: 'iberway_cocina', provider: 'IBERWAY', fileName, materials, skipped };
  }

  private normalizeUnit(raw: string): string {
    const u = (raw || 'UNIDAD').toUpperCase();
    if (u.includes('ML')) return 'ML';
    if (u.includes('M2') || u.includes('M²')) return 'M2';
    if (u.includes('LAM')) return 'LAMINA';
    if (u.includes('JGO') || u.includes('JUEGO')) return 'JUEGO';
    if (u.includes('KIT')) return 'KIT';
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
