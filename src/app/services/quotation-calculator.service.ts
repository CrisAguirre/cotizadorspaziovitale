import { Injectable } from '@angular/core';
import { AppConfig, Quotation, Area, Furniture, WasteRange, QuotationTotals } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class QuotationCalculatorService {

  constructor() { }

  /**
   * Recalcula toda la cotización de abajo hacia arriba:
   * 1. Cada mueble
   * 2. Cada área
   * 3. Totales globales
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
            
            // Suponemos que los metros cuadrados vienen de sumatoria de cortes o se ingresan manual,
            // por ahora usamos una sumatoria de sqm de cortes
            if (furniture.cuts) {
              const fSqm = furniture.cuts.reduce((sum: number, cut: any) => sum + (cut.sqm || 0) * (cut.quantity || 1), 0);
              globalTotalSqm += fSqm * (furniture.quantity || 1);
            }
          });
        }
        
        // Sumar subAreas
        if (area.subAreas) {
           area.subAreas.forEach((sub: any) => {
             let subT = 0;
             if (sub.items) {
               sub.items.forEach((item: any) => {
                 subT += (item.quantity || 0) * (item.price || 0);
               });
             }
             sub.total = subT;
             areaTotal += subT;
           });
        }

        // Accesorios visibles
        if (area.visibleAccessories) {
           area.visibleAccessories.forEach((acc: any) => {
             acc.totalPrice = (acc.quantity || 0) * (acc.unitPrice || 0);
             areaTotal += acc.totalPrice;
           });
        }

        area.areaTotal = areaTotal;
        globalTotalCost += areaTotal;
      });
    }

    // Calcular AIU y Totales Finales
    quotation.totals = this.calculateGlobalTotals(globalTotalCost, globalTotalSqm, config);

    return quotation;
  }

  private calculateFurnitureTotals(furniture: Furniture, config: AppConfig) {
    // 1. Insumos
    furniture.totalSupplies = 0;
    if (furniture.supplies) {
      furniture.supplies.forEach((s: any) => {
        s.totalPrice = (s.quantity || 0) * (s.unitPrice || 0);
        furniture.totalSupplies! += s.totalPrice;
      });
    }

    // 2. Cantos (Con desperdicio)
    furniture.totalEdgeBands = 0;
    if (furniture.edgeBands) {
      furniture.edgeBands.forEach((e: any) => {
        const factor = this.getWasteFactor(e.quantity || 0, config.wasteTable);
        e.wasteFactor = factor;
        e.waste = (e.quantity || 0) * factor;
        e.total = (e.quantity || 0) + e.waste;
        e.totalPrice = e.total * (e.unitPrice || 0);
        furniture.totalEdgeBands! += e.totalPrice;
      });
    }

    // 3. Herrajes
    furniture.totalAccessories = 0;
    if (furniture.accessories) {
      furniture.accessories.forEach((a: any) => {
        a.totalTime = (a.quantity || 0) * (a.timeHours || 0);
        const laborCost = a.totalTime * (config.laborRatePerHour || 0);
        const materialCost = (a.quantity || 0) * (a.unitPrice || 0);
        a.totalPrice = materialCost + laborCost;
        furniture.totalAccessories! += a.totalPrice;
      });
    }

    // 4. Diseño
    furniture.totalDesignTime = 0;
    if (furniture.designTime && !furniture.clientPaidDesign) {
      furniture.designTime.forEach((d: any) => {
        d.totalPrice = (d.quantity || 0) * (config.designRatePerHour || 0);
        furniture.totalDesignTime! += d.totalPrice;
      });
    }

    // 5. Cortes
    furniture.totalCuts = 0;
    if (furniture.cuts) {
      furniture.cuts.forEach((c: any) => {
        c.totalPrice = (c.quantity || 0) * (c.timeHours || 0) * (config.laborRatePerHour || 0);
        furniture.totalCuts! += c.totalPrice;
      });
    }

    // 6. Ensamble
    furniture.totalAssembly = 0;
    if (furniture.assembly) {
      furniture.assembly.forEach((a: any) => {
        a.totalPrice = (a.totalQuantity || 0) * (a.assemblyHours || 0) * (a.persons || 1) * (config.laborRatePerHour || 0);
        furniture.totalAssembly! += a.totalPrice;
      });
    }

    // 7. Instalación
    furniture.totalInstallation = 0;
    if (furniture.installation) {
      furniture.installation.forEach((i: any) => {
        i.totalPrice = (i.totalQuantity || 0) * (i.installHours || 0) * (i.persons || 1) * (config.laborRatePerHour || 0);
        furniture.totalInstallation! += i.totalPrice;
      });
    }

    // Sumatoria total del mueble
    furniture.totalCost = 
      (furniture.totalSupplies || 0) + 
      (furniture.totalEdgeBands || 0) + 
      (furniture.totalAccessories || 0) + 
      (furniture.totalDesignTime || 0) + 
      (furniture.totalCuts || 0) + 
      (furniture.totalAssembly || 0) + 
      (furniture.totalInstallation || 0);
  }

  private calculateGlobalTotals(totalCost: number, totalSqm: number, config: AppConfig): QuotationTotals {
    const unforeseenAmount = totalCost * (config.unforeseenPercent / 100);
    const profitAmount = totalCost * (config.profitPercent / 100);
    const indirectAmount = totalCost * (config.indirectPercent / 100);

    const subtotal = totalCost + unforeseenAmount + profitAmount + indirectAmount;
    const taxAmount = subtotal * (config.taxPercent / 100);
    const totalWithTax = subtotal + taxAmount;
    
    // Por simplicidad, tomamos un descuento de la UI o de la config. Asumiremos 0% a menos que se defina.
    const discountPercent = config.defaultDiscount || 0;
    const discountAmount = totalWithTax * (discountPercent / 100);
    
    const grandTotal = totalWithTax - discountAmount;
    const pricePerSqm = totalSqm > 0 ? grandTotal / totalSqm : 0;

    return {
      totalCost,
      unforeseenPercent: config.unforeseenPercent,
      unforeseenAmount,
      profitPercent: config.profitPercent,
      profitAmount,
      indirectPercent: config.indirectPercent,
      indirectAmount,
      subtotal,
      taxPercent: config.taxPercent,
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
    if (!wasteTable || wasteTable.length === 0) return 0;
    
    for (const item of wasteTable) {
      if (quantity >= item.minMl && quantity <= item.maxMl) {
        return item.factor;
      }
    }
    
    // Si supera el máximo, usar el factor del último (o el menor desperdicio)
    const maxItem = wasteTable.reduce((prev, current) => (prev.maxMl > current.maxMl) ? prev : current);
    if (quantity > maxItem.maxMl) {
      return maxItem.factor;
    }

    return 0;
  }
}
