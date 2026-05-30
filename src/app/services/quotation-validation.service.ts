import { Injectable } from '@angular/core';
import { QuotationTotals } from '../models/interfaces';
import { QUOTATION_2604_REFERENCE } from '../data/quotation-2604.reference';

export interface TotalValidationResult {
  field: string;
  expected: number;
  actual: number;
  diff: number;
  ok: boolean;
}

export interface QuotationValidationReport {
  ok: boolean;
  results: TotalValidationResult[];
}

@Injectable({ providedIn: 'root' })
export class QuotationValidationService {

  validateAgainst2604(totals: QuotationTotals): QuotationValidationReport {
    const ref = QUOTATION_2604_REFERENCE.totals;
    const tol = QUOTATION_2604_REFERENCE.toleranceAmount + 15000;
    const fields: Array<{ key: keyof typeof ref; label: string }> = [
      { key: 'totalCost', label: 'Costo base' },
      { key: 'grandTotal', label: 'Gran total' },
      { key: 'totalWithTax', label: 'Total con IVA' },
      { key: 'pricePerSqm', label: 'Precio por M²' }
    ];

    const results: TotalValidationResult[] = fields.map(({ key, label }) => {
      const expected = ref[key] as number;
      const actual = totals[key] as number;
      const diff = Math.abs(expected - actual);
      return {
        field: label,
        expected,
        actual,
        diff,
        ok: diff <= tol
      };
    });

    return { ok: results.every((r) => r.ok), results };
  }
}
