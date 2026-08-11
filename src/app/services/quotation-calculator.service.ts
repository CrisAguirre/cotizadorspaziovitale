import { Injectable } from '@angular/core';
import { AppConfig, Quotation, Area, Furniture, WasteRange, QuotationTotals } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class QuotationCalculatorService {

  /**
   * Recalcula toda la cotización (mueble → área → totales globales).
   * Fórmulas alineadas con `src/assets/data/excel-formulas.md`.
   */
  public recalculateAll(quotation: Quotation, config: AppConfig): Quotation {
    // Modo "Venta de productos y servicios": totales directos sobre quotation.products
    if (quotation.wizardConfig?.clientPriceMode === 'products') {
      quotation.totals = this.calculateProductsTotals(quotation, config);
      return quotation;
    }

    let globalTotalSqm = 0;
    let globalTotalCost = 0; // Costo bruto para cálculo global
    let globalMesonesSubtotal = 0; // Subtotal ya liquidado
    let globalMesonesTax = 0; // IVA de mesones

    if (quotation.areas) {
      quotation.areas.forEach((area: Area) => {
        let areaTotal = 0;

        if (area.furniture) {
          area.furniture.forEach((furniture: Furniture) => {
            this.calculateFurnitureTotals(furniture, config);
            
            if (furniture.type === 'meson' && furniture.mesonDetails) {
              const fQty = furniture.quantity || 1;
              const fLen = furniture.areaSqm || 1;
              globalMesonesSubtotal += furniture.mesonDetails.subtotal * fLen * fQty;
              globalMesonesTax += furniture.mesonDetails.taxAmount * fLen * fQty;
              areaTotal += furniture.totalBudget * fQty;
            } else {
              areaTotal += (furniture.totalCost || 0) * (furniture.quantity || 1);
            }

            if (furniture.areaSqm && furniture.areaSqm > 0) {
              globalTotalSqm += furniture.areaSqm * (furniture.quantity || 1);
            }
          });
        }

        if (area.subAreas) {
          area.subAreas.forEach((sub) => {
            let subT = 0;
            if (sub.items) {
              sub.items.forEach((item) => {
                subT += (item.quantity || 0) * (item.price || 0);
              });
            }
            sub.total = subT;
            areaTotal += subT;
          });
        }

        if (area.visibleAccessories) {
          area.visibleAccessories.forEach((acc) => {
            acc.totalPrice = (acc.quantity || 0) * (acc.unitPrice || 0);
            areaTotal += acc.totalPrice;
          });
        }

        area.areaTotal = areaTotal;
      });
    }
    
    // El globalTotalCost solo debe llevar el costo de los muebles normales y subAreas
    let rawTotalCostForPercentages = 0;
    if (quotation.areas) {
      quotation.areas.forEach((area: Area) => {
        if (area.furniture) {
          area.furniture.forEach((furniture: Furniture) => {
            if (furniture.type !== 'meson') {
              rawTotalCostForPercentages += (furniture.totalCost || 0) * (furniture.quantity || 1);
            }
          });
        }
        if (area.subAreas) {
          area.subAreas.forEach((sub) => { rawTotalCostForPercentages += (sub.total || 0); });
        }
        if (area.visibleAccessories) {
          area.visibleAccessories.forEach((acc) => { rawTotalCostForPercentages += (acc.totalPrice || 0); });
        }
      });
    }

    quotation.totals = this.calculateGlobalTotals(
      rawTotalCostForPercentages,
      globalTotalSqm,
      config,
      quotation.totals,
      globalMesonesSubtotal,
      globalMesonesTax,
      Number(quotation.client?.viaticos || 0)
    );
    return quotation;
  }

  private parseMeasurement(measurement: string | undefined): number {
    if (!measurement) return 1;
    const str = measurement.replace(/,/g, '.').toLowerCase();
    if (str.includes('x') || str.includes('*')) {
      const parts = str.split(/x|\*/);
      const p1 = parseFloat(parts[0]);
      const p2 = parseFloat(parts[1]);
      if (!isNaN(p1) && !isNaN(p2)) return p1 * p2;
      return parseFloat(parts[0]) || 1;
    }
    const val = parseFloat(str);
    return isNaN(val) ? 1 : val;
  }

  private calculateFurnitureTotals(furniture: Furniture, config: AppConfig): void {
    if (furniture.type === 'meson' && furniture.mesonDetails) {
      const md = furniture.mesonDetails;
      md.linearPrice = (md.basePricePerM2 || 0) * (md.depth || 0.8);
      md.baseCost = md.linearPrice + (md.transportCost || 0);
      md.profitAmount = md.baseCost * ((md.profitPercentage || 68) / 100);
      md.subtotal = md.baseCost + md.profitAmount;
      md.taxAmount = md.subtotal * ((md.taxPercentage || 19) / 100);
      md.finalPricePerMl = md.subtotal + md.taxAmount;
      
      furniture.totalCost = md.baseCost; // Optional, for reference
      furniture.totalBudget = md.finalPricePerMl * (furniture.areaSqm || 1);
      return;
    }

    const laborRate = config.laborRatePerHour || 0;
    const designRate = config.designRatePerHour || 0;

    // 1. Insumos — I = cantidad × precio unitario
    // Para láminas (quantityMode === 'sqm') se suma la mano de obra por m²:
    //   minutos = (m² digitado × M.O POR M2) ÷ M2 de la lámina   (regla de 3)
    //   costoMO = minutos × valor del minuto (laborRatePerHour / 60)
    //   precioUnitarioEfectivo = unitPrice + (costoMO ÷ m² digitado)
    furniture.totalSupplies = 0;
    const valorMinuto = (config.laborRatePerHour || 0) / 60;
    if (furniture.supplies) {
      furniture.supplies.forEach((s) => {
        const qty = s.total > 0 ? s.total : (s.quantity || 0);
        let effectiveUnitPrice = s.unitPrice || 0;
        s._laborPerSqm = 0;

        // Regla de 3: minutos = (m² × M.O) ÷ M2-lámina
        if (s.quantityMode === 'sqm' && (s._sqmPerSheet || 0) > 0 && (s._laborMinutes || 0) > 0) {
          const minutes = (qty * (s._laborMinutes || 0)) / (s._sqmPerSheet || 1);
          const laborCost = minutes * valorMinuto;
          s._laborPerSqm = qty > 0 ? laborCost / qty : 0;
          effectiveUnitPrice = effectiveUnitPrice + s._laborPerSqm;
        }

        s.totalPrice = qty * effectiveUnitPrice;
        furniture.totalSupplies! += s.totalPrice;
      });
    }

    // 2. Cantos — G = ML + desperdicio; costo material = G × precio; MO = G × 3 min/ML × valorMinuto
    furniture.totalEdgeBands = 0;
    if (furniture.edgeBands) {
      furniture.edgeBands.forEach((e) => {
        const factor = this.getWasteFactor(e.quantity || 0, config.wasteTable);
        e.wasteFactor = factor;
        e.waste = (e.quantity || 0) * factor;
        e.total = (e.quantity || 0) + e.waste;
        const materialCost = e.total * (e.unitPrice || 0);
        const moCosto = e.total * (e.moMinutesPerMl || 3) * valorMinuto;
        e.moTotal = moCosto;
        e.totalPrice = materialCost + moCosto;
        furniture.totalEdgeBands! += e.totalPrice;
      });
    }

    // 3. Accesorios — I = horas × valor hora (+ material opcional)
    furniture.totalAccessories = 0;
    if (furniture.accessories) {
      furniture.accessories.forEach((a) => {
        a.totalTime = (a.quantity || 0) * (a.timeHours || 0);
        const effectiveUnitPrice = (a.unitPrice || 0) * (a.apply5Percent ? 1.05 : 1);
        const laborCost = a.totalTime * (a.laborRate || laborRate);
        const materialCost = (a.quantity || 0) * effectiveUnitPrice;
        a.totalPrice = laborCost + materialCost;
        furniture.totalAccessories! += a.totalPrice;
      });
    }

    // 4. Diseño — I = horas × tarifa diseñador (0 si el cliente ya pagó)
    furniture.totalDesignTime = 0;
    if (furniture.designTime && !furniture.clientPaidDesign) {
      furniture.designTime.forEach((d) => {
        const rate = d.laborRate || designRate;
        d.totalPrice = (d.quantity || 0) * rate;
        furniture.totalDesignTime! += d.totalPrice;
      });
    } else if (furniture.designTime) {
      furniture.designTime.forEach((d) => {
        d.totalPrice = 0;
      });
    }

    // 5. M.O. Armado — total = minutos calculados × valor del minuto (× personas si aplica)
    furniture.totalAssembly = 0;
    if (furniture.assembly) {
      furniture.assembly.forEach((a) => {
        const parsedMedida = this.parseMeasurement(a.measurement);
        const baseQty = a.baseQuantity || 1;
        const baseMin = a.minutes || 0;

        if (baseMin > 0 && a.valorMinuto) {
          const calcMin = (parsedMedida * baseMin) / baseQty;
          a.calculatedMinutes = calcMin;
          const mult = (a.persons || 1);
          a.totalPrice = calcMin * (a.valorMinuto || 0) * mult;
        } else {
          // Fallback fórmula legado
          const workUnits = parsedMedida * (a.assemblyHours || 0) * (a.persons || 1);
          const rate = a.laborRate || laborRate;
          a.totalPrice = workUnits * rate;
        }
        furniture.totalAssembly! += a.totalPrice;
      });
    }

    // 6. M.O. Instalación — misma lógica
    furniture.totalInstallation = 0;
    if (furniture.installation) {
      furniture.installation.forEach((i) => {
        const parsedMedida = this.parseMeasurement(i.measurement);
        const baseQty = i.baseQuantity || 1;
        const baseMin = i.minutes || 0;

        if (baseMin > 0 && i.valorMinuto !== undefined) {
          const calcMin = (parsedMedida * baseMin) / baseQty;
          i.calculatedMinutes = calcMin;
          const mult = (i.persons || 1);
          i.totalPrice = calcMin * (i.valorMinuto || 0) * mult;
        } else {
          const workUnits = parsedMedida * (i.installHours || 0) * (i.persons || 1);
          const rate = i.laborRate || laborRate;
          i.totalPrice = workUnits * rate;
        }
        furniture.totalInstallation! += i.totalPrice;
      });
    }

    furniture.totalCost =
      (furniture.totalSupplies || 0) +
      (furniture.totalEdgeBands || 0) +
      (furniture.totalAccessories || 0) +
      (furniture.totalDesignTime || 0) +
      (furniture.totalAssembly || 0) +
      (furniture.totalInstallation || 0);

    furniture.totalBudget = furniture.totalCost;
  }

  private calculateGlobalTotals(
    totalCost: number,
    totalSqm: number,
    config: AppConfig,
    existing?: QuotationTotals,
    totalMesonesSubtotal: number = 0,
    totalMesonesTax: number = 0,
    viaticos: number = 0
  ): QuotationTotals {
    const unforeseenPercent = existing?.unforeseenPercent ?? config.unforeseenPercent;
    const profitPercent = existing?.profitPercent ?? config.profitPercent;
    const indirectPercent = existing?.indirectPercent ?? config.indirectPercent;
    const taxPercent = existing?.taxPercent ?? config.taxPercent;
    const discountPercent = existing?.discountPercent ?? config.defaultDiscount ?? 0;

    const unforeseenAmount = totalCost * (unforeseenPercent / 100);
    const profitAmount = totalCost * (profitPercent / 100);
    const indirectAmount = totalCost * (indirectPercent / 100);

    const subtotal = totalCost + unforeseenAmount + profitAmount + indirectAmount + totalMesonesSubtotal;
    const taxAmount = (totalCost + unforeseenAmount + profitAmount + indirectAmount) * (taxPercent / 100) + totalMesonesTax;
    const totalWithTax = subtotal + taxAmount;

    // Excel: I91 = I90 * H91; I92 = I90 - I91 (descuento)
    const discountAmount = totalWithTax * (discountPercent / 100);
    // Los viáticos se suman al final sin aplicarle ningún porcentaje
    const grandTotal = totalWithTax - discountAmount + viaticos;
    const pricePerSqm = totalSqm > 0 ? grandTotal / totalSqm : 0;

    return {
      totalCost,
      unforeseenPercent,
      unforeseenAmount,
      profitPercent,
      profitAmount,
      indirectPercent,
      indirectAmount,
      subtotal,
      taxPercent,
      taxAmount,
      totalWithTax,
      discountPercent,
      discountAmount,
      grandTotal,
      totalSqm,
      pricePerSqm,
      viaticos
    };
  }

  private getWasteFactor(quantity: number, wasteTable: WasteRange[]): number {
    if (!wasteTable || wasteTable.length === 0) {
      return 0;
    }

    for (const item of wasteTable) {
      if (quantity >= item.minMl && quantity <= item.maxMl) {
        return item.factor;
      }
    }

    const maxItem = wasteTable.reduce((prev, current) =>
      prev.maxMl > current.maxMl ? prev : current
    );
    if (quantity > maxItem.maxMl) {
      return maxItem.factor;
    }

    return 0;
  }

  /** Precio de lista con IVA → precio sin IVA (columna C del Excel). */
  public priceWithoutTax(priceWithTax: number, taxPercent = 19): number {
    return priceWithTax / (1 + taxPercent / 100);
  }

  private calculateProductsTotals(quotation: Quotation, config: AppConfig): QuotationTotals {
    const existing = quotation.totals;
    const taxPercent = existing?.taxPercent ?? config.taxPercent ?? 19;
    const viaticos = Number(quotation.client?.viaticos || 0);

    let subtotal = 0; // suma sin IVA
    let taxAmount = 0; // IVA total
    const products = quotation.products || [];
    for (const p of products) {
      p.totalWithTax = Math.round((p.quantity || 0) * (p.unitPriceWithTax || 0));
      const net = p.totalWithTax / (1 + taxPercent / 100);
      subtotal += net;
      taxAmount += p.totalWithTax - net;
    }
    subtotal = Math.round(subtotal);
    taxAmount = Math.round(taxAmount);
    const grandTotal = subtotal + taxAmount + viaticos;
    const totalSqm = 0;

    return {
      totalCost: 0,
      unforeseenPercent: existing?.unforeseenPercent ?? config.unforeseenPercent,
      unforeseenAmount: 0,
      profitPercent: existing?.profitPercent ?? config.profitPercent,
      profitAmount: 0,
      indirectPercent: existing?.indirectPercent ?? config.indirectPercent,
      indirectAmount: 0,
      subtotal,
      taxPercent,
      taxAmount,
      totalWithTax: subtotal + taxAmount,
      discountPercent: 0,
      discountAmount: 0,
      grandTotal,
      totalSqm,
      pricePerSqm: 0,
      viaticos
    };
  }
}
