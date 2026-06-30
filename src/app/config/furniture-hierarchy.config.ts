export interface FurnitureType {
  name: string;
  unit: 'ML' | 'M2' | 'UNIDAD';
}

export const FURNITURE_HIERARCHY: { [area: string]: FurnitureType[] } = {
  'COCINA': [
    { name: 'MUEBLE ALTO PRINCIPAL', unit: 'ML' },
    { name: 'MUEBLE ALTO SECUNDARIO', unit: 'ML' },
    { name: 'MUEBLE BAJO', unit: 'ML' },
    { name: 'TORRE DE HORNOS', unit: 'M2' },
    { name: 'TORRE DE ENTREPAÑOS', unit: 'M2' },
    { name: 'ALACENA PARA HERRAJE', unit: 'M2' },
    { name: 'ALACENA DE ENTREPAÑOS', unit: 'M2' },
    { name: 'MUEBLE NEVERA', unit: 'ML' },
    { name: 'MUEBLE BARRA', unit: 'ML' },
    { name: 'MUEBLE ISLA', unit: 'ML' },
    { name: 'APERGOLADO', unit: 'M2' },
    { name: 'SOMBREROS DE ISLA ( ESTRUCTURAS ALTAS )', unit: 'M2' },
    { name: 'FACHADAS O RECUBRIMIENTOS', unit: 'M2' }
  ],
  'CLOSET': [
    { name: 'PUERTAS ABATIBLES', unit: 'M2' },
    { name: 'SISTEMAS CORREDISOS', unit: 'M2' }
  ],
  'MUEBLES DE BAÑO': [
    { name: 'MUEBLE FLOTANTE', unit: 'ML' },
    { name: 'TORRE DE ENTREPAÑOS', unit: 'M2' }
  ],
  'PUERTAS': [
    { name: 'ENTAMBORADAS', unit: 'UNIDAD' },
    { name: 'MASISAS (36 MM)', unit: 'UNIDAD' }
  ],
  'BIBLIOTECA': [
    { name: 'BIBLIOTECA', unit: 'M2' },
    { name: 'TORRE DE ENTREPAÑOS', unit: 'M2' },
    { name: 'ESCRITORIO', unit: 'ML' },
    { name: 'APERGOLADO', unit: 'M2' },
    { name: 'MUEBLE ALTO', unit: 'ML' },
    { name: 'MUEBLE BAJO', unit: 'ML' }
  ],
  'ESCRITORIO': [
    { name: 'ESCRITORIO', unit: 'ML' },
    { name: 'MESONES', unit: 'ML' },
    { name: 'APERGOLADOS', unit: 'ML' }
  ],
  'CENTRO DE ENTRETENIMIENTO': [
    { name: 'MUEBLE FLOTANTE', unit: 'ML' },
    { name: 'MUEBLE BAJO', unit: 'ML' },
    { name: 'APERGOLADO', unit: 'M2' },
    { name: 'TORRE DE ENTREPAÑOS', unit: 'M2' }
  ]
};
