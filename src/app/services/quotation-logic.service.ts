import { Injectable } from '@angular/core';
import { Area, Furniture, AccessoryItem, AssemblyItem, LaborTime, Quotation } from '../models/interfaces';
import { MaterialService } from './material.service';
import { FURNITURE_HIERARCHY, FurnitureType } from '../config/furniture-hierarchy.config';

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
      const lt = availableLaborTimes.find(l => l.code === code);
      return {
        description: lt ? `${lt.activityName} [${code}]` : `${fallbackDesc} ⧦Est.`,
        assemblyHours: (lt && lt.timeHours > 0) ? lt.timeHours : fallbackHours,
        persons: 1, totalQuantity: furn.quantity || 1, laborRate, totalPrice: 0,
        measurement: '', unitOfMeasure: furn.unit || 'UNIDAD'
      };
    };

    const instFromDB = (code: string, fallbackDesc: string, fallbackHours: number) => {
      const lt = availableLaborTimes.find(l => l.code === code);
      return {
        description: lt ? `${lt.activityName} [${code}]` : `${fallbackDesc} ⧦Est.`,
        installHours: (lt && lt.timeHours > 0) ? lt.timeHours : fallbackHours,
        persons: 1, totalQuantity: furn.quantity || 1, laborRate, totalPrice: 0,
        measurement: '', unitOfMeasure: furn.unit || 'UNIDAD'
      };
    };

    const n = furn.name;

    // ═══ COCINA ══════════════════════════════════════════════════
    if (n === 'MUEBLE ALTO PRINCIPAL' || n === 'MUEBLE ALTO SECUNDARIO') {
      furn.accessories = [acc('Bisagra cierre lento 35mm', 3), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-022', 'Armado mueble alto', 2)]; furn.installation = [instFromDB('MO-023', 'Instalación mueble alto', 1.5)]; }
    } else if (n === 'MUEBLE BAJO') {
      furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Corredera telescópica soft-closing 350mm', 1), acc('Jalador barra aluminio', 1), acc('Soporte patas regulables', 4), acc('Tornillo melamina 3.5x16mm', 24)];
      if (autoMO) { furn.assembly = [moFromDB('MO-026', 'Armado mueble bajo', 2.5)]; furn.installation = [instFromDB('MO-028', 'Instalación mueble bajo', 1.5)]; }
    } else if (n === 'TORRE DE HORNOS') {
      furn.accessories = [acc('Bisagra cierre lento 35mm', 4), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 30)];
      if (autoMO) { furn.assembly = [moFromDB('MO-037', 'Armado torre hornos', 3)]; furn.installation = [instFromDB('MO-038', 'Instalación torre hornos', 2)]; }
    } else if (n === 'TORRE DE ENTREPAÑOS' || n === 'ALACENA DE ENTREPAÑOS') {
      furn.accessories = [acc('Soporte para entrepaño', 8), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-039', 'Armado torre entrepaños', 1.5)]; furn.installation = [instFromDB('MO-040', 'Instalación torre entrepaños', 1)]; }
    } else if (n === 'ALACENA PARA HERRAJE') {
      furn.accessories = [acc('Bisagra cierre lento 35mm', 4), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-039', 'Armado alacena', 1.5)]; furn.installation = [instFromDB('MO-040', 'Instalación alacena', 1)]; }
    } else if (n === 'MUEBLE NEVERA') {
      furn.accessories = [acc('Tornillo melamina 3.5x16mm', 16)];
      if (autoMO) { furn.assembly = [moFromDB('MO-020', 'Armado mueble nevera', 2.5)]; furn.installation = [instFromDB('MO-021', 'Instalación mueble nevera', 1)]; }
    } else if (n === 'MUEBLE BARRA' || n === 'MUEBLE ISLA') {
      furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Soporte patas regulables', 4), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 24)];
      if (autoMO) { furn.assembly = [moFromDB('MO-029', 'Armado mueble barra/isla', 3)]; furn.installation = [instFromDB('MO-030', 'Instalación mueble barra/isla', 2)]; }
    } else if (n === 'APERGOLADO' || n === 'SOMBREROS DE ISLA ( ESTRUCTURAS ALTAS )' || n === 'FACHADAS O RECUBRIMIENTOS') {
      furn.accessories = [acc('Tornillo melamina 3.5x16mm', 12)];
      if (autoMO) { furn.installation = [instFromDB('MO-091', 'Instalación apergolado/fachada', 2)]; }
    // ═══ CLOSET ══════════════════════════════════════════════════
    } else if (n === 'PUERTAS ABATIBLES') {
      furn.accessories = [acc('Bisagra cierre lento 35mm Grass', 3), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 16)];
      if (autoMO) { furn.assembly = [moFromDB('MO-101', 'Armado closet abatible', 1)]; furn.installation = [instFromDB('MO-102', 'Instalación closet abatible', 1.5)]; }
    } else if (n === 'SISTEMAS CORREDISOS') {
      furn.accessories = [acc('Kit riel superior corredizo 2m', 1), acc('Rodamiento inferior corredizo', 4), acc('Jalador embutido', 2), acc('Tornillo melamina 3.5x16mm', 16)];
      if (autoMO) { furn.assembly = [moFromDB('MO-101', 'Armado sistema corredizo', 1)]; furn.installation = [instFromDB('MO-099', 'Instalación puerta corrediza', 0.25)]; }
    // ═══ MUEBLES DE BAÑO ═════════════════════════════════════════
    } else if (area.name === 'MUEBLES DE BAÑO' && n === 'MUEBLE FLOTANTE') {
      furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Jalador barra aluminio', 1), acc('Soporte flotante de pared', 2), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-103', 'Armado mueble flotante baño', 2)]; furn.installation = [instFromDB('MO-104', 'Instalación mueble flotante baño', 1)]; }
    // ═══ PUERTAS ═════════════════════════════════════════════════
    } else if (area.name === 'PUERTAS') {
      furn.accessories = [acc('Bisagra fija o cierre lento 35mm', 3), acc('Chapa/cerradura cilíndrica', 1), acc('Jalador de puerta', 1)];
      if (autoMO) { furn.assembly = [moFromDB('MO-105', 'Armado marco puerta', 1.5)]; furn.installation = [instFromDB('MO-106', 'Instalación puerta', 1.5)]; }
    // ═══ BIBLIOTECA ══════════════════════════════════════════════
    } else if (area.name === 'BIBLIOTECA' && n === 'ESCRITORIO') {
      furn.accessories = [acc('Jalador cajón', 2), acc('Corredera telescópica 350mm', 1), acc('Soporte patas regulables', 4), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-026', 'Armado escritorio', 2)]; furn.installation = [instFromDB('MO-028', 'Instalación escritorio', 1)]; }
    } else if (area.name === 'BIBLIOTECA' && (n === 'MUEBLE ALTO' || n === 'MUEBLE BAJO')) {
      furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 16)];
      if (autoMO) { furn.assembly = [moFromDB('MO-022', 'Armado mueble biblioteca', 2)]; furn.installation = [instFromDB('MO-023', 'Instalación mueble biblioteca', 1.5)]; }
    } else if (area.name === 'BIBLIOTECA') {
      furn.accessories = [acc('Soporte para entrepaño', 8), acc('Tornillo melamina 3.5x16mm', 16)];
      if (autoMO) { furn.assembly = [moFromDB('MO-039', 'Armado biblioteca', 1.5)]; furn.installation = [instFromDB('MO-040', 'Instalación biblioteca', 1)]; }
    // ═══ ESCRITORIO ══════════════════════════════════════════════
    } else if (area.name === 'ESCRITORIO') {
      furn.accessories = [acc('Soporte patas regulables', 4), acc('Jalador cajón', 1), acc('Corredera telescópica 350mm', 1), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-026', 'Armado escritorio/mesón', 2)]; furn.installation = [instFromDB('MO-028', 'Instalación escritorio/mesón', 1)]; }
    // ═══ CENTRO DE ENTRETENIMIENTO ═══════════════════════════════
    } else if (area.name === 'CENTRO DE ENTRETENIMIENTO') {
      if (n === 'MUEBLE FLOTANTE' || n === 'MUEBLE BAJO') {
        furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Jalador barra aluminio', 1), acc('Soporte flotante de pared', 2), acc('Tornillo melamina 3.5x16mm', 16)];
        if (autoMO) { furn.assembly = [moFromDB('MO-031', 'Armado mueble TV/entretenimiento', 1.5)]; furn.installation = [instFromDB('MO-032', 'Instalación mueble TV/entretenimiento', 1)]; }
      } else {
        furn.accessories = [acc('Soporte para entrepaño', 6), acc('Tornillo melamina 3.5x16mm', 12)];
        if (autoMO) { furn.installation = [instFromDB('MO-040', 'Instalación apergolado/entrepaños', 1)]; }
      }
    }
  }

}
