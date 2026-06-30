export interface HardwareRuleMatcher {
  areaName?: string;
  furnitureNames?: string[];
}

export interface HardwareAccessoryDef {
  desc: string;
  qty: number;
  unit?: string;
}

export interface HardwareLaborDef {
  code: string;
  desc: string;
  hours: number;
}

export interface HardwareRuleAction {
  accessories: HardwareAccessoryDef[];
  assembly?: HardwareLaborDef;
  installation?: HardwareLaborDef;
}

export interface HardwareRule {
  match: HardwareRuleMatcher;
  action: HardwareRuleAction;
}

export const HARDWARE_RULES: HardwareRule[] = [
  // ═══ COCINA ══════════════════════════════════════════════════
  {
    match: { furnitureNames: ['MUEBLE ALTO PRINCIPAL', 'MUEBLE ALTO SECUNDARIO'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm', qty: 3 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 20 }
      ],
      assembly: { code: 'MO-022', desc: 'Armado mueble alto', hours: 2 },
      installation: { code: 'MO-023', desc: 'Instalación mueble alto', hours: 1.5 }
    }
  },
  {
    match: { furnitureNames: ['MUEBLE BAJO'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm', qty: 2 },
        { desc: 'Corredera telescópica soft-closing 350mm', qty: 1 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Soporte patas regulables', qty: 4 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 24 }
      ],
      assembly: { code: 'MO-026', desc: 'Armado mueble bajo', hours: 2.5 },
      installation: { code: 'MO-028', desc: 'Instalación mueble bajo', hours: 1.5 }
    }
  },
  {
    match: { furnitureNames: ['TORRE DE HORNOS'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm', qty: 4 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 30 }
      ],
      assembly: { code: 'MO-037', desc: 'Armado torre hornos', hours: 3 },
      installation: { code: 'MO-038', desc: 'Instalación torre hornos', hours: 2 }
    }
  },
  {
    match: { furnitureNames: ['TORRE DE ENTREPAÑOS', 'ALACENA DE ENTREPAÑOS'] },
    action: {
      accessories: [
        { desc: 'Soporte para entrepaño', qty: 8 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 20 }
      ],
      assembly: { code: 'MO-039', desc: 'Armado torre entrepaños', hours: 1.5 },
      installation: { code: 'MO-040', desc: 'Instalación torre entrepaños', hours: 1 }
    }
  },
  {
    match: { furnitureNames: ['ALACENA PARA HERRAJE'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm', qty: 4 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 20 }
      ],
      assembly: { code: 'MO-039', desc: 'Armado alacena', hours: 1.5 },
      installation: { code: 'MO-040', desc: 'Instalación alacena', hours: 1 }
    }
  },
  {
    match: { furnitureNames: ['MUEBLE NEVERA'] },
    action: {
      accessories: [
        { desc: 'Tornillo melamina 3.5x16mm', qty: 16 }
      ],
      assembly: { code: 'MO-020', desc: 'Armado mueble nevera', hours: 2.5 },
      installation: { code: 'MO-021', desc: 'Instalación mueble nevera', hours: 1 }
    }
  },
  {
    match: { furnitureNames: ['MUEBLE BARRA', 'MUEBLE ISLA'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm', qty: 2 },
        { desc: 'Soporte patas regulables', qty: 4 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 24 }
      ],
      assembly: { code: 'MO-029', desc: 'Armado mueble barra/isla', hours: 3 },
      installation: { code: 'MO-030', desc: 'Instalación mueble barra/isla', hours: 2 }
    }
  },
  {
    match: { furnitureNames: ['APERGOLADO', 'SOMBREROS DE ISLA ( ESTRUCTURAS ALTAS )', 'FACHADAS O RECUBRIMIENTOS'] },
    action: {
      accessories: [
        { desc: 'Tornillo melamina 3.5x16mm', qty: 12 }
      ],
      installation: { code: 'MO-091', desc: 'Instalación apergolado/fachada', hours: 2 }
    }
  },

  // ═══ CLOSET ══════════════════════════════════════════════════
  {
    match: { furnitureNames: ['PUERTAS ABATIBLES'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm Grass', qty: 3 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 16 }
      ],
      assembly: { code: 'MO-101', desc: 'Armado closet abatible', hours: 1 },
      installation: { code: 'MO-102', desc: 'Instalación closet abatible', hours: 1.5 }
    }
  },
  {
    match: { furnitureNames: ['SISTEMAS CORREDISOS'] },
    action: {
      accessories: [
        { desc: 'Kit riel superior corredizo 2m', qty: 1 },
        { desc: 'Rodamiento inferior corredizo', qty: 4 },
        { desc: 'Jalador embutido', qty: 2 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 16 }
      ],
      assembly: { code: 'MO-101', desc: 'Armado sistema corredizo', hours: 1 },
      installation: { code: 'MO-099', desc: 'Instalación puerta corrediza', hours: 0.25 }
    }
  },

  // ═══ MUEBLES DE BAÑO ═════════════════════════════════════════
  {
    match: { areaName: 'MUEBLES DE BAÑO', furnitureNames: ['MUEBLE FLOTANTE'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm', qty: 2 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Soporte flotante de pared', qty: 2 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 20 }
      ],
      assembly: { code: 'MO-103', desc: 'Armado mueble flotante baño', hours: 2 },
      installation: { code: 'MO-104', desc: 'Instalación mueble flotante baño', hours: 1 }
    }
  },

  // ═══ PUERTAS ═════════════════════════════════════════════════
  {
    match: { areaName: 'PUERTAS' },
    action: {
      accessories: [
        { desc: 'Bisagra fija o cierre lento 35mm', qty: 3 },
        { desc: 'Chapa/cerradura cilíndrica', qty: 1 },
        { desc: 'Jalador de puerta', qty: 1 }
      ],
      assembly: { code: 'MO-105', desc: 'Armado marco puerta', hours: 1.5 },
      installation: { code: 'MO-106', desc: 'Instalación puerta', hours: 1.5 }
    }
  },

  // ═══ BIBLIOTECA ══════════════════════════════════════════════
  {
    match: { areaName: 'BIBLIOTECA', furnitureNames: ['ESCRITORIO'] },
    action: {
      accessories: [
        { desc: 'Jalador cajón', qty: 2 },
        { desc: 'Corredera telescópica 350mm', qty: 1 },
        { desc: 'Soporte patas regulables', qty: 4 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 20 }
      ],
      assembly: { code: 'MO-026', desc: 'Armado escritorio', hours: 2 },
      installation: { code: 'MO-028', desc: 'Instalación escritorio', hours: 1 }
    }
  },
  {
    match: { areaName: 'BIBLIOTECA', furnitureNames: ['MUEBLE ALTO', 'MUEBLE BAJO'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm', qty: 2 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 16 }
      ],
      assembly: { code: 'MO-022', desc: 'Armado mueble biblioteca', hours: 2 },
      installation: { code: 'MO-023', desc: 'Instalación mueble biblioteca', hours: 1.5 }
    }
  },
  {
    match: { areaName: 'BIBLIOTECA' },
    action: {
      accessories: [
        { desc: 'Soporte para entrepaño', qty: 8 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 16 }
      ],
      assembly: { code: 'MO-039', desc: 'Armado biblioteca', hours: 1.5 },
      installation: { code: 'MO-040', desc: 'Instalación biblioteca', hours: 1 }
    }
  },

  // ═══ ESCRITORIO ══════════════════════════════════════════════
  {
    match: { areaName: 'ESCRITORIO' },
    action: {
      accessories: [
        { desc: 'Soporte patas regulables', qty: 4 },
        { desc: 'Jalador cajón', qty: 1 },
        { desc: 'Corredera telescópica 350mm', qty: 1 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 20 }
      ],
      assembly: { code: 'MO-026', desc: 'Armado escritorio/mesón', hours: 2 },
      installation: { code: 'MO-028', desc: 'Instalación escritorio/mesón', hours: 1 }
    }
  },

  // ═══ CENTRO DE ENTRETENIMIENTO ═══════════════════════════════
  {
    match: { areaName: 'CENTRO DE ENTRETENIMIENTO', furnitureNames: ['MUEBLE FLOTANTE', 'MUEBLE BAJO'] },
    action: {
      accessories: [
        { desc: 'Bisagra cierre lento 35mm', qty: 2 },
        { desc: 'Jalador barra aluminio', qty: 1 },
        { desc: 'Soporte flotante de pared', qty: 2 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 16 }
      ],
      assembly: { code: 'MO-031', desc: 'Armado mueble TV/entretenimiento', hours: 1.5 },
      installation: { code: 'MO-032', desc: 'Instalación mueble TV/entretenimiento', hours: 1 }
    }
  },
  {
    match: { areaName: 'CENTRO DE ENTRETENIMIENTO' },
    action: {
      accessories: [
        { desc: 'Soporte para entrepaño', qty: 6 },
        { desc: 'Tornillo melamina 3.5x16mm', qty: 12 }
      ],
      installation: { code: 'MO-040', desc: 'Instalación apergolado/entrepaños', hours: 1 }
    }
  }
];
