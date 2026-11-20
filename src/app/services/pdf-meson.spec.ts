import { PdfGeneratorService } from './pdf-generator.service';

describe('PdfGeneratorService - liquidación de mesones', () => {
  const svc = new PdfGeneratorService({ error: jasmine.createSpy('error') } as any, {} as any);
  const getFinal = (svc as any).mesonFinalPricePerMl.bind(svc);
  const getTotal = (svc as any).mesonClientPrice.bind(svc);

  it('usa el valor final con IVA por ML', () => {
    const furn = {
      type: 'meson',
      areaSqm: 3,
      quantity: 2,
      mesonDetails: {
        basePricePerM2: 100000,
        depth: 0.8,
        transportCost: 20000,
        profitPercentage: 50,
        taxPercentage: 19,
        subtotal: 150000,
        taxAmount: 28500,
        finalPricePerMl: 178500
      }
    };
    // 178.500 (final c/IVA por ML) × 3 ML × 2 und
    expect(getFinal(furn)).toBe(178500);
    expect(getTotal(furn)).toBe(1071000);
  });

  it('recalcula el valor final si el documento es legacy', () => {
    const furn = {
      type: 'meson',
      areaSqm: 1,
      quantity: 1,
      mesonDetails: {
        basePricePerM2: 100000,
        depth: 0.8,
        transportCost: 20000,
        profitPercentage: 50,
        taxPercentage: 19
      }
    };
    // baseCost 100.000 → subtotal 150.000 → IVA 28.500 → 178.500
    expect(getFinal(furn)).toBe(178500);
    expect(getTotal(furn)).toBe(178500);
  });
});
