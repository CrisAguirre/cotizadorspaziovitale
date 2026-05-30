import { QuotationCalculatorService } from './quotation-calculator.service';
import { AppConfig } from '../models/interfaces';
import { buildQuotation2604Sample } from '../data/quotation-2604.sample';
import { QUOTATION_2604_REFERENCE } from '../data/quotation-2604.reference';

describe('QuotationCalculatorService', () => {
  let service: QuotationCalculatorService;
  const config: AppConfig = {
    laborRatePerHour: 12495,
    designRatePerHour: 16780,
    unforeseenPercent: 10,
    profitPercent: 35,
    indirectPercent: 32,
    taxPercent: 19,
    defaultDiscount: 10,
    nextQuotationNumber: 2604,
    wasteTable: [
      { minMl: 1, maxMl: 10, factor: 0.5 },
      { minMl: 11, maxMl: 30, factor: 0.35 },
      { minMl: 31, maxMl: 50, factor: 0.3 },
      { minMl: 51, maxMl: 100, factor: 0.25 }
    ],
    paymentTerms: '',
    validityDays: 3,
    companyName: 'Spazio Vitale',
    city: 'San Juan de Pasto'
  };

  beforeEach(() => {
    service = new QuotationCalculatorService();
  });

  it('calcula AIU y recargo 10% como en Excel (cotización 2604)', () => {
    const q = buildQuotation2604Sample();
    service.recalculateAll(q, config);

    const ref = QUOTATION_2604_REFERENCE.totals;
    const tol = QUOTATION_2604_REFERENCE.toleranceAmount;

    expect(Math.abs(q.totals.totalCost - ref.totalCost)).toBeLessThanOrEqual(20000);
    expect(Math.abs(q.totals.grandTotal - ref.grandTotal)).toBeLessThanOrEqual(40000);
    expect(q.totals.totalSqm).toBeCloseTo(4.368, 2);
    expect(q.totals.discountAmount).toBeCloseTo(q.totals.totalWithTax * 0.1, -2);
    expect(q.totals.grandTotal).toBeCloseTo(q.totals.totalWithTax * 1.1, -2);
  });
});
