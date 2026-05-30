import { Quotation } from '../models/interfaces';

/**
 * Cotización de ejemplo No. 2604 — área COCINA.
 * Rubros extraídos de filas I21–I81 (hoja EJEMPLO, presupuesto Excel).
 * Precios unitarios de cantos ajustados para coincidir con el factor de desperdicio automático.
 */
export function buildQuotation2604Sample(): Quotation {
  return {
    number: 2604,
    date: new Date().toISOString().substring(0, 10),
    city: 'San Juan de Pasto',
    title: 'VENTA, ELABORACIÓN E INSTALACIÓN DE MOBILIARIO',
    client: {
      name: 'Cliente ejemplo 2604',
      city: 'Pasto',
      phone: '',
      email: ''
    },
    areas: [
      {
        name: 'COCINA',
        furniture: [
          {
            name: 'COCINA INTEGRAL',
            description: 'Cotización referencia No. 2604',
            measurements: '2.08 x 2.1',
            areaSqm: 4.368,
            quantity: 1,
            unit: 'SERVICIO',
            type: 'standard',
            supplies: [],
            edgeBands: [
              { description: 'CANTO FLEX DE 19 MM X 0.45 TAROA', color: '', unitOfMeasure: 'ML', quantity: 1, wasteFactor: 0, waste: 0, total: 0, unitPrice: 718.67, totalPrice: 0 },
              { description: 'CANTO RIG DE 19 MM X 2 TAROA', color: '', unitOfMeasure: 'ML', quantity: 1, wasteFactor: 0, waste: 0, total: 0, unitPrice: 1678, totalPrice: 0 },
              { description: 'CANTO FLEX (2)', color: '', unitOfMeasure: 'ML', quantity: 1, wasteFactor: 0, waste: 0, total: 0, unitPrice: 718.67, totalPrice: 0 },
              { description: 'CANTO RIG (2)', color: '', unitOfMeasure: 'ML', quantity: 1, wasteFactor: 0, waste: 0, total: 0, unitPrice: 1678, totalPrice: 0 },
              { description: 'CANTO RIGIDO DE 33 MM X 0.2 TAROA', color: '', unitOfMeasure: 'ML', quantity: 1, wasteFactor: 0, waste: 0, total: 0, unitPrice: 3120.67, totalPrice: 0 }
            ],
            accessories: [
              { description: 'CORRED.TELES.SOFT CLOSING INVISIBLE 350 MM', code: '', dimension: '350', quantity: 1, unit: 'UNIDAD', timeHours: 3, totalTime: 0, laborRate: 0, unitPrice: 0, totalPrice: 0 },
              { description: 'M.O. accesorio', code: '', dimension: '', quantity: 1, unit: 'UNIDAD', timeHours: 4, totalTime: 0, laborRate: 0, unitPrice: 0, totalPrice: 0 },
              { description: 'M.O. accesorio (0.5 h)', code: '', dimension: '', quantity: 1, unit: 'UNIDAD', timeHours: 0.5, totalTime: 0, laborRate: 0, unitPrice: 0, totalPrice: 0 }
            ],
            designTime: [
              { description: 'DISEÑO Y ASESORÍA', quantity: 3, laborRate: 0, totalPrice: 0 },
              { description: 'DESPIECE', quantity: 2, laborRate: 0, totalPrice: 0 },
              { description: 'DETALLE', quantity: 1, laborRate: 0, totalPrice: 0 },
              { description: 'REVISIÓN', quantity: 2, laborRate: 0, totalPrice: 0 },
              { description: 'COORDINACIÓN', quantity: 3, laborRate: 0, totalPrice: 0 }
            ],
            clientPaidDesign: false,
            cuts: [
              { description: 'CORTE MELAMINAS', sqm: 0.60375, timeHours: 3, quantity: 2, laborRate: 0, totalPrice: 0 },
              { description: 'Mueble bajo 2.08x0.46', sqm: 2.08, timeHours: 2, quantity: 2, laborRate: 0, totalPrice: 0 },
              { description: 'Corte 1.75 m²', sqm: 1.75, timeHours: 1, quantity: 2, laborRate: 0, totalPrice: 0 },
              { description: 'Corte 1.5 m²', sqm: 1.5, timeHours: 1, quantity: 1, laborRate: 0, totalPrice: 0 },
              { description: 'Corte 5 m²', sqm: 5, timeHours: 0.25, quantity: 1, laborRate: 0, totalPrice: 0 },
              { description: 'Corte 1 m²', sqm: 1, timeHours: 1, quantity: 1, laborRate: 0, totalPrice: 0 }
            ],
            assembly: [],
            installation: [
              { description: 'Instalación base', measurement: '', unitOfMeasure: 'm2', installHours: 1, persons: 1, totalQuantity: 1, laborRate: 0, totalPrice: 0 },
              { description: 'Instalación 0.60 m²', measurement: '', unitOfMeasure: 'm2', installHours: 2, persons: 2, totalQuantity: 0.60375, laborRate: 0, totalPrice: 0 },
              { description: 'Mueble bajo 2.08x0.46', measurement: '2.08x0.46', unitOfMeasure: 'm2', installHours: 2, persons: 2, totalQuantity: 2.08, laborRate: 0, totalPrice: 0 },
              { description: 'Instalación 1.75 m²', measurement: '', unitOfMeasure: 'm2', installHours: 1, persons: 1, totalQuantity: 1.75, laborRate: 0, totalPrice: 0 },
              { description: 'Instalación 1.5 m²', measurement: '', unitOfMeasure: 'm2', installHours: 1, persons: 2, totalQuantity: 1.5, laborRate: 0, totalPrice: 0 },
              { description: 'Instalación 1.62 m²', measurement: '', unitOfMeasure: 'm2', installHours: 2, persons: 3, totalQuantity: 1.6236, laborRate: 0, totalPrice: 0 },
              { description: 'Alistamiento y limpieza', measurement: '', unitOfMeasure: 'SER', installHours: 1, persons: 1, totalQuantity: 1, laborRate: 0, totalPrice: 0 },
              { description: 'Instalación final', measurement: '', unitOfMeasure: 'SER', installHours: 1, persons: 1, totalQuantity: 1, laborRate: 0, totalPrice: 0 }
            ],
            totalSupplies: 0,
            totalEdgeBands: 0,
            totalAccessories: 0,
            totalDesignTime: 0,
            totalCuts: 0,
            totalAssembly: 0,
            totalInstallation: 0,
            totalCost: 0,
            totalBudget: 0
          }
        ],
        visibleAccessories: [],
        subAreas: [],
        areaTotal: 0
      }
    ],
    totals: {
      totalCost: 0,
      unforeseenPercent: 10,
      unforeseenAmount: 0,
      profitPercent: 35,
      profitAmount: 0,
      indirectPercent: 32,
      indirectAmount: 0,
      subtotal: 0,
      taxPercent: 19,
      taxAmount: 0,
      totalWithTax: 0,
      discountPercent: 10,
      discountAmount: 0,
      grandTotal: 0,
      totalSqm: 0,
      pricePerSqm: 0
    },
    status: 'borrador',
    paymentTerms: '',
    validityDays: 3,
    notes: 'Ejemplo de validación No. 2604 — COCINA'
  };
}
