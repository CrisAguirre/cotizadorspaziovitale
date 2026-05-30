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
    let globalTotalSqm = 0;
    let globalTotalCost = 0;

    if (quotation.areas) {
      quotation.areas.forEach((area: Area) => {
        let areaTotal = 0;

        if (area.furniture) {
          area.furniture.forEach((furniture: Furniture) => {
            this.calculateFurnitureTotals(furniture, config);
            areaTotal += (furniture.totalCost || 0) * (furniture.quantity || 1);

            if (furniture.areaSqm && furniture.areaSqm > 0) {
              globalTotalSqm += furniture.areaSqm * (furniture.quantity || 1);
            } else if (furniture.cuts?.length) {
              const fSqm = furniture.cuts.reduce(
                (sum, cut) => sum + (cut.sqm || 0) * (cut.quantity || 1),
                0
              );
              globalTotalSqm += fSqm * (furniture.quantity || 1);
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
        globalTotalCost += areaTotal;
      });
    }

    quotation.totals = this.calculateGlobalTotals(
      globalTotalCost,
      globalTotalSqm,
      config,
      quotation.totals
    );

    return quotation;
  }

  private calculateFurnitureTotals(furniture: Furniture, config: AppConfig): void {
    const laborRate = config.laborRatePerHour || 0;
    const designRate = config.designRatePerHour || 0;

    // 1. Insumos — I = cantidad × precio unitario
    furniture.totalSupplies = 0;
    if (furniture.supplies) {
      furniture.supplies.forEach((s) => {
        const qty = s.total > 0 ? s.total : (s.quantity || 0);
        s.totalPrice = qty * (s.unitPrice || 0);
        furniture.totalSupplies! += s.totalPrice;
      });
    }

    // 2. Cantos — G = ML + desperdicio; I = G × precio
    furniture.totalEdgeBands = 0;
    if (furniture.edgeBands) {
      furniture.edgeBands.forEach((e) => {
        const factor = this.getWasteFactor(e.quantity || 0, config.wasteTable);
        e.wasteFactor = factor;
        e.waste = (e.quantity || 0) * factor;
        e.total = (e.quantity || 0) + e.waste;
        e.totalPrice = e.total * (e.unitPrice || 0);
        furniture.totalEdgeBands! += e.totalPrice;
      });
    }

    // 3. Accesorios — I = horas × valor hora (+ material opcional)
    furniture.totalAccessories = 0;
    if (furniture.accessories) {
      furniture.accessories.forEach((a) => {
        a.totalTime = (a.quantity || 0) * (a.timeHours || 0);
        const laborCost = a.totalTime * (a.laborRate || laborRate);
        const materialCost = (a.quantity || 0) * (a.unitPrice || 0);
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

    // 5. Cortes — G = M² × tiempo × cantidad; I = G × valor hora
    furniture.totalCuts = 0;
    if (furniture.cuts) {
      furniture.cuts.forEach((c) => {
        const workUnits =
          (c.sqm || 0) * (c.timeHours || 0) * (c.quantity || 1);
        const rate = c.laborRate || laborRate;
        c.totalPrice = workUnits * rate;
        furniture.totalCuts! += c.totalPrice;
      });
    }

    // 6. Armado — G = medida × #armado × personas; I = G × valor hora
    furniture.totalAssembly = 0;
    if (furniture.assembly) {
      furniture.assembly.forEach((a) => {
        const workUnits =
          (a.totalQuantity || 0) * (a.assemblyHours || 0) * (a.persons || 1);
        const rate = a.laborRate || laborRate;
        a.totalPrice = workUnits * rate;
        furniture.totalAssembly! += a.totalPrice;
      });
    }

    // 7. Instalación — misma lógica que armado
    furniture.totalInstallation = 0;
    if (furniture.installation) {
      furniture.installation.forEach((i) => {
        const workUnits =
          (i.totalQuantity || 0) * (i.installHours || 0) * (i.persons || 1);
        const rate = i.laborRate || laborRate;
        i.totalPrice = workUnits * rate;
        furniture.totalInstallation! += i.totalPrice;
      });
    }

    furniture.totalCost =
      (furniture.totalSupplies || 0) +
      (furniture.totalEdgeBands || 0) +
      (furniture.totalAccessories || 0) +
      (furniture.totalDesignTime || 0) +
      (furniture.totalCuts || 0) +
      (furniture.totalAssembly || 0) +
      (furniture.totalInstallation || 0);

    furniture.totalBudget = furniture.totalCost;
  }

  private calculateGlobalTotals(
    totalCost: number,
    totalSqm: number,
    config: AppConfig,
    existing?: QuotationTotals
  ): QuotationTotals {
    const unforeseenPercent = existing?.unforeseenPercent ?? config.unforeseenPercent;
    const profitPercent = existing?.profitPercent ?? config.profitPercent;
    const indirectPercent = existing?.indirectPercent ?? config.indirectPercent;
    const taxPercent = existing?.taxPercent ?? config.taxPercent;
    const discountPercent = existing?.discountPercent ?? config.defaultDiscount ?? 0;

    const unforeseenAmount = totalCost * (unforeseenPercent / 100);
    const profitAmount = totalCost * (profitPercent / 100);
    const indirectAmount = totalCost * (indirectPercent / 100);

    const subtotal = totalCost + unforeseenAmount + profitAmount + indirectAmount;
    const taxAmount = subtotal * (taxPercent / 100);
    const totalWithTax = subtotal + taxAmount;

    // Excel: I91 = I90 * H91; I92 = I90 + I91 (recargo, no descuento)
    const discountAmount = totalWithTax * (discountPercent / 100);
    const grandTotal = totalWithTax + discountAmount;
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
      pricePerSqm
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
}
