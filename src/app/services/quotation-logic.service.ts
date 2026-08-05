import { Injectable } from '@angular/core';
import { Area, Furniture, AccessoryItem, AssemblyItem, LaborTime, Quotation } from '../models/interfaces';
import { MaterialService } from './material.service';
import { FURNITURE_HIERARCHY, FurnitureType } from '../config/furniture-hierarchy.config';
import { HARDWARE_RULES, HardwareRule } from '../config/hardware-rules.config';

@Injectable({
  providedIn: 'root'
})
export class QuotationLogicService {

  constructor(private materialService: MaterialService) {}

  getFurnitureOptionsForArea(areaName: string): FurnitureType[] {
    return FURNITURE_HIERARCHY[areaName] || [];
  }

  isFurnCustom(area: Area, furn: Furniture, customFurnFlags: any, aIndex: number, fIndex: number): boolean {
    if (customFurnFlags && customFurnFlags[aIndex] && customFurnFlags[aIndex][fIndex]) return true;
    const options = this.getFurnitureOptionsForArea(area.name);
    if (options.length === 0) return true; // Si el área no tiene opciones, es custom por defecto
    if (!furn.name) return false;
    return !options.some(o => o.name === furn.name);
  }

  autoAssignHardwareAndLabor(
    furn: Furniture, 
    area: Area, 
    activeQuotation: Quotation, 
    laborRatePerHour: number, 
    availableLaborTimes: LaborTime[]
  ) {
    const laborRate = laborRatePerHour || 0;
    const autoMO = activeQuotation.wizardConfig.moTimeMode !== 'manual';
    furn.accessories = [];
    furn.assembly = [];
    furn.installation = [];

    const acc = (desc: string, qty: number, unit = 'UNIDAD'): AccessoryItem => {
      const found = this.materialService.findExactOrBestMatch(desc);
      if (found) {
        return {
          description: found.description, quantity: qty, unit: found.unit || unit,
          unitPrice: found.unitPrice || 0, totalPrice: 0,
          code: found.code || '', dimension: found.dimension || '', timeHours: 0, totalTime: 0, laborRate: 0
        };
      }
      return {
        description: desc + ' ⧦Est.', quantity: qty, unit,
        unitPrice: 0, totalPrice: 0,
        code: 'EST', dimension: '', timeHours: 0, totalTime: 0, laborRate: 0
      };
    };

    // M.O. helpers que buscan el código real en la BD; si no lo encuentran, usan fallback
    const moFromDB = (code: string, fallbackDesc: string, fallbackHours: number): AssemblyItem => {
      let lt = availableLaborTimes.find(l => l.code === code);
      if (!lt) {
        lt = availableLaborTimes.find(l =>
          l.category === 'armado' && l.activityName.toLowerCase().includes(fallbackDesc.toLowerCase())
        );
      }
      return {
        description: lt ? `${lt.activityName} [${code}]` : `${fallbackDesc} ⧦Est.`,
        assemblyHours: (lt && lt.timeHours > 0) ? lt.timeHours : fallbackHours,
        persons: lt ? (lt.persons || 1) : 1, totalQuantity: furn.quantity || 1, laborRate, totalPrice: 0,
        measurement: '', unitOfMeasure: furn.unit || 'UNIDAD',
        minutes: lt ? (lt.minutes || 0) : 0,
        valorMinuto: lt ? (lt.valorMinuto || 0) : 0
      };
    };

    const instFromDB = (code: string, fallbackDesc: string, fallbackHours: number) => {
      let lt = availableLaborTimes.find(l => l.code === code);
      if (!lt) {
        lt = availableLaborTimes.find(l =>
          l.category === 'instalacion' && l.activityName.toLowerCase().includes(fallbackDesc.toLowerCase())
        );
      }
      return {
        description: lt ? `${lt.activityName} [${code}]` : `${fallbackDesc} ⧦Est.`,
        installHours: (lt && lt.timeHours > 0) ? lt.timeHours : fallbackHours,
        persons: lt ? (lt.persons || 1) : 1, totalQuantity: furn.quantity || 1, laborRate, totalPrice: 0,
        measurement: '', unitOfMeasure: furn.unit || 'UNIDAD',
        minutes: lt ? (lt.minutes || 0) : 0,
        valorMinuto: lt ? (lt.valorMinuto || 0) : 0
      };
    };

    const n = furn.name;

    const rule = HARDWARE_RULES.find(r => 
      (!r.match.areaName || r.match.areaName === area.name) &&
      (!r.match.furnitureNames || r.match.furnitureNames.includes(n || ''))
    );

    if (rule) {
      // Accesorios
      rule.action.accessories.forEach(a => {
        furn.accessories?.push(acc(a.desc, a.qty, a.unit));
      });

      if (autoMO) {
        // Armado
        if (rule.action.assembly) {
          furn.assembly?.push(moFromDB(rule.action.assembly.code, rule.action.assembly.desc, rule.action.assembly.hours));
        }
        // Instalación
        if (rule.action.installation) {
          furn.installation?.push(instFromDB(rule.action.installation.code, rule.action.installation.desc, rule.action.installation.hours));
        }
      }
    } else {
      // Advertencia si es un mueble estándar que se escapó de las reglas
      const options = this.getFurnitureOptionsForArea(area.name);
      const isStandard = options.some(o => o.name === n);
      if (isStandard) {
        console.warn(`[QuotationLogic] No se encontró HardwareRule para el mueble estándar "${n}" en el área "${area.name}".`);
      }
    }
  }

}
