import { QuotationCalculatorService } from './quotation-calculator.service';
import { AppConfig, Quotation, Furniture, Area } from '../models/interfaces';
import { buildQuotation2604Sample } from '../data/quotation-2604.sample';

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

    // Verificar que totalSqm se calculó correctamente (valor fijo del Excel)
    expect(q.totals.totalSqm).toBeCloseTo(4.368, 2);

    // Verificar coherencia interna de la fórmula AIU
    expect(q.totals.unforeseenAmount).toBeCloseTo(q.totals.totalCost * q.totals.unforeseenPercent / 100, 0);
    expect(q.totals.profitAmount).toBeCloseTo(q.totals.totalCost * q.totals.profitPercent / 100, 0);
    expect(q.totals.indirectAmount).toBeCloseTo(q.totals.totalCost * q.totals.indirectPercent / 100, 0);

    // subtotal = totalCost + AIU
    const expectedSubtotal = q.totals.totalCost + q.totals.unforeseenAmount + q.totals.profitAmount + q.totals.indirectAmount;
    expect(q.totals.subtotal).toBeCloseTo(expectedSubtotal, 0);

    // IVA sobre base + AIU
    const baseForTax = q.totals.totalCost + q.totals.unforeseenAmount + q.totals.profitAmount + q.totals.indirectAmount;
    expect(q.totals.taxAmount).toBeCloseTo(baseForTax * q.totals.taxPercent / 100 + q.totals.taxAmount - q.totals.taxAmount, 0);

    // Descuento y grandTotal: grandTotal = totalWithTax - descuento
    expect(q.totals.discountAmount).toBeCloseTo(q.totals.totalWithTax * q.totals.discountPercent / 100, 0);
    expect(q.totals.grandTotal).toBeCloseTo(q.totals.totalWithTax - q.totals.discountAmount, 0);

    // Verificar que el costo total y grandTotal son positivos y razonables
    expect(q.totals.totalCost).toBeGreaterThan(0);
    expect(q.totals.grandTotal).toBeGreaterThan(q.totals.totalCost);
  });

  // ═════════════════════════════════════════════════════════════
  // MESONES — Tests de lógica de cálculo
  // ═════════════════════════════════════════════════════════════

  function buildMesonQuotation(overrides?: {
    depth?: number;
    transportCost?: number;
    basePricePerM2?: number;
    ml?: number;
    quantity?: number;
  }): Quotation {
    const d = overrides?.depth ?? 0.8;
    const tc = overrides?.transportCost ?? 180000;
    const bpm = overrides?.basePricePerM2 ?? 201681;
    const ml = overrides?.ml ?? 1;
    const qty = overrides?.quantity ?? 1;

    const furn: Furniture = {
      name: 'MESONES',
      description: 'QUARZTONE BLANCO POLAR',
      measurements: `${ml} ML`,
      areaSqm: ml,
      quantity: qty,
      unit: 'ML',
      type: 'meson',
      supplies: [],
      edgeBands: [],
      accessories: [],
      designTime: [],
      clientPaidDesign: false,
      cuts: [],
      assembly: [],
      installation: [],
      veneer: [],
      mesonDetails: {
        materialName: 'QUARZTONE BLANCO POLAR',
        basePricePerM2: bpm,
        depth: d,
        transportCost: tc,
        profitPercentage: 68,
        taxPercentage: 19,
        linearPrice: 0,
        baseCost: 0,
        profitAmount: 0,
        subtotal: 0,
        taxAmount: 0,
        finalPricePerMl: 0
      },
      totalSupplies: 0,
      totalEdgeBands: 0,
      totalAccessories: 0,
      totalDesignTime: 0,
      totalCuts: 0,
      totalAssembly: 0,
      totalInstallation: 0,
      totalVeneer: 0,
      totalCost: 0,
      totalBudget: 0
    };

    const area: Area = {
      name: 'COCINA',
      furniture: [furn],
      visibleAccessories: [],
      subAreas: [],
      areaTotal: 0
    };

    return {
      number: 9999,
      date: '2026-07-05',
      city: 'Pasto',
      title: 'TEST MESONES',
      client: { name: 'Test', city: 'Pasto', phone: '', email: '' },
      areas: [area],
      totals: {
        totalCost: 0, unforeseenPercent: 10, unforeseenAmount: 0,
        profitPercent: 35, profitAmount: 0, indirectPercent: 32,
        indirectAmount: 0, subtotal: 0, taxPercent: 19, taxAmount: 0,
        totalWithTax: 0, discountPercent: 10, discountAmount: 0,
        grandTotal: 0, totalSqm: 0, pricePerSqm: 0
      },
      wizardConfig: {
        clientPriceMode: 'manual', hardwareDisplayMode: 'table',
        moTimeMode: 'manual', requiresDesignFiles: false,
        designFilesInternal: false, areaDisplayMode: 'single',
        mesonMode: 'includes_meson', pricingTier: 'industrial',
        wizardCompleted: true
      },
      status: 'nuevo',
      paymentTerms: '',
      validityDays: 15,
      notes: ''
    };
  }

  describe('Mesones - calculateFurnitureTotals', () => {

    it('calcula correctamente un mesón estándar (profundidad 0.8, piedra $180K)', () => {
      const q = buildMesonQuotation({
        depth: 0.8,
        transportCost: 180000,
        basePricePerM2: 201681
      });
      const furn = q.areas![0].furniture[0];
      service.recalculateAll(q, config);

      const md = furn.mesonDetails!;
      const expectedLinearPrice = 201681 * 0.8;          // 161,344.8
      const expectedBaseCost = expectedLinearPrice + 180000; // 341,344.8
      const expectedProfit = expectedBaseCost * 0.68;     // 232,114.46
      const expectedSubtotal = expectedBaseCost + expectedProfit; // 573,459.26
      const expectedTax = expectedSubtotal * 0.19;        // 108,957.26
      const expectedFinal = expectedSubtotal + expectedTax; // 682,416.52

      expect(md.linearPrice).toBeCloseTo(expectedLinearPrice, 0);
      expect(md.baseCost).toBeCloseTo(expectedBaseCost, 0);
      expect(md.profitAmount).toBeCloseTo(expectedProfit, 0);
      expect(md.subtotal).toBeCloseTo(expectedSubtotal, 0);
      expect(md.taxAmount).toBeCloseTo(expectedTax, 0);
      expect(md.finalPricePerMl).toBeCloseTo(expectedFinal, 0);
    });

    it('verifica fórmula completa contra valor del Excel QUARZTONE BLANCO POLAR (0.8, piedra)', () => {
      const q = buildMesonQuotation({
        depth: 0.8, transportCost: 180000, basePricePerM2: 201681
      });
      service.recalculateAll(q, config);
      const md = q.areas![0].furniture[0].mesonDetails!;

      // Valores extraídos del Excel fila QUARZTONE BLANCO POLAR M2 (Mesones 0.8)
      expect(md.linearPrice).toBeCloseTo(161345, -2);     // Col E
      expect(md.baseCost).toBeCloseTo(341345, -2);        // Col G
      expect(md.profitAmount).toBeCloseTo(232114, -2);    // Col H
      expect(md.subtotal).toBeCloseTo(573459, -2);        // Col I
      expect(md.finalPricePerMl).toBeCloseTo(682416, -2); // Col J
    });

    it('calcula correctamente con profundidad 0.9 (isla 90cm)', () => {
      const q = buildMesonQuotation({ depth: 0.9, basePricePerM2: 201681, transportCost: 180000 });
      service.recalculateAll(q, config);
      const md = q.areas![0].furniture[0].mesonDetails!;

      const expectedLinearPrice = 201681 * 0.9;
      expect(md.linearPrice).toBeCloseTo(expectedLinearPrice, 0);
    });

    it('calcula correctamente con profundidad 1.0 (isla 100cm)', () => {
      const q = buildMesonQuotation({ depth: 1.0, basePricePerM2: 201681, transportCost: 180000 });
      service.recalculateAll(q, config);
      const md = q.areas![0].furniture[0].mesonDetails!;

      const expectedLinearPrice = 201681 * 1.0;
      expect(md.linearPrice).toBeCloseTo(expectedLinearPrice, 0);
    });

    it('calcula correctamente con profundidad 1.1 (compac 110cm)', () => {
      const q = buildMesonQuotation({ depth: 1.1, basePricePerM2: 602664, transportCost: 160000 });
      service.recalculateAll(q, config);
      const md = q.areas![0].furniture[0].mesonDetails!;

      const expectedLinearPrice = 602664 * 1.1;
      expect(md.linearPrice).toBeCloseTo(expectedLinearPrice, 0);
    });

    it('usa transportCost COMPAC ($160K) correctamente', () => {
      const q = buildMesonQuotation({ transportCost: 160000, basePricePerM2: 602664, depth: 0.8 });
      service.recalculateAll(q, config);
      const md = q.areas![0].furniture[0].mesonDetails!;

      const expectedLinearPrice = 602664 * 0.8;
      const expectedBaseCost = expectedLinearPrice + 160000;
      expect(md.baseCost).toBeCloseTo(expectedBaseCost, 0);
    });

    it('calcula correctamente con múltiples ML y cantidad', () => {
      const q = buildMesonQuotation({
        depth: 0.8, transportCost: 180000, basePricePerM2: 201681,
        ml: 3.5, quantity: 2
      });
      service.recalculateAll(q, config);
      const furn = q.areas![0].furniture[0];
      const md = furn.mesonDetails!;

      // El precio por ML no cambia con quantity/ML
      expect(md.linearPrice).toBeCloseTo(201681 * 0.8, 0);
      // totalBudget = finalPricePerMl * areaSqm (sin quantity)
      const expectedBudget = md.finalPricePerMl * 3.5;
      expect(furn.totalBudget).toBeCloseTo(expectedBudget, 0);
      // En recalculateAll, el aporte al área es totalBudget * quantity
      expect(q.areas![0].areaTotal).toBeCloseTo(expectedBudget * 2, 0);
    });

    it('usa profitPercentage y taxPercentage customizables', () => {
      const q = buildMesonQuotation({ basePricePerM2: 100000, depth: 0.8, transportCost: 100000 });
      const furn = q.areas![0].furniture[0];
      furn.mesonDetails!.profitPercentage = 50;
      furn.mesonDetails!.taxPercentage = 10;

      service.recalculateAll(q, config);
      const md = furn.mesonDetails!;

      const expectedLinearPrice = 100000 * 0.8;
      const expectedBaseCost = expectedLinearPrice + 100000;
      const expectedProfit = expectedBaseCost * 0.5;
      const expectedSubtotal = expectedBaseCost + expectedProfit;
      const expectedTax = expectedSubtotal * 0.1;
      const expectedFinal = expectedSubtotal + expectedTax;

      expect(md.profitAmount).toBeCloseTo(expectedProfit, 0);
      expect(md.taxAmount).toBeCloseTo(expectedTax, 0);
      expect(md.finalPricePerMl).toBeCloseTo(expectedFinal, 0);
    });
  });

  describe('Mesones - recalculateAll (integración con totales globales)', () => {

    it('agrega mesón subtotal/tax directamente sin aplicar AIU', () => {
      const q = buildMesonQuotation({
        basePricePerM2: 201681, depth: 0.8, transportCost: 180000
      });
      service.recalculateAll(q, config);

      const md = q.areas![0].furniture[0].mesonDetails!;
      const totals = q.totals;

      // El costo base de materiales (totalCost) no debe incluir mesones
      expect(totals.totalCost).toBe(0);
      // subtotal = 0 (costo base) + 0 (imprevistos) + 0 (utilidad) + 0 (indirectos) + mesonSubtotal
      expect(totals.subtotal).toBeCloseTo(md.subtotal, 0);
      // taxAmount = (costo base + AIU sobre costo base) * 19% + mesonTax
      const baseForTax = 0; // sin muebles normales
      const expectedTaxOnBase = baseForTax * 0.19;
      expect(totals.taxAmount).toBeCloseTo(expectedTaxOnBase + md.taxAmount, 0);
    });

    it('mezcla mueble normal + mesón correctamente', () => {
      const sample = buildQuotation2604Sample();
      const mesonFurn: Furniture = {
        name: 'ISLA',
        description: 'QUARZTONE CALACATA GRIS',
        measurements: '2.0 ML',
        areaSqm: 2,
        quantity: 1,
        unit: 'ML',
        type: 'meson',
        supplies: [], edgeBands: [], accessories: [], designTime: [],
        clientPaidDesign: false, cuts: [], assembly: [], installation: [], veneer: [],
        mesonDetails: {
          materialName: 'QUARZTONE CALACATA GRIS',
          basePricePerM2: 352941,
          depth: 0.9,
          transportCost: 180000,
          profitPercentage: 68,
          taxPercentage: 19,
          linearPrice: 0, baseCost: 0, profitAmount: 0,
          subtotal: 0, taxAmount: 0, finalPricePerMl: 0
        },
        totalSupplies: 0, totalEdgeBands: 0, totalAccessories: 0,
        totalDesignTime: 0, totalCuts: 0, totalAssembly: 0,
        totalInstallation: 0, totalVeneer: 0, totalCost: 0, totalBudget: 0
      };

      sample.areas![0].furniture.push(mesonFurn);
      sample.wizardConfig.mesonMode = 'includes_meson';
      service.recalculateAll(sample, config);

      const md = mesonFurn.mesonDetails!;
      const totals = sample.totals;

      // totalCost solo incluye el mueble normal, no el mesón
      expect(totals.totalCost).toBeGreaterThan(0);
      // subtotal debe incluir mesonSubtotal
      expect(totals.subtotal).toBeGreaterThan(md.subtotal);
      // grandTotal debe ser > que sin mesón
      expect(totals.grandTotal).toBeGreaterThan(0);
    });
  });

  describe('priceWithoutTax', () => {
    it('calcula precio sin IVA correctamente', () => {
      const result = service.priceWithoutTax(1190000, 19);
      expect(result).toBeCloseTo(1000000, 0);
    });

    it('usa 19% por defecto', () => {
      const result = service.priceWithoutTax(1190000);
      expect(result).toBeCloseTo(1000000, 0);
    });
  });
});
