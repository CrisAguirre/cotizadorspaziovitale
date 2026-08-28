// ===== MATERIAL =====
export interface Material {
  _id?: string;
  category: 'melamina' | 'canto' | 'accesorio' | 'herraje' | 'vidrio' | 'meson' | 'laminado' | 'compactslab' | 'duraopak' | 'tablero' | 'otro';
  code: string;
  description: string;
  provider: string;
  brand?: string;
  color: string;
  dimension: string;
  unit: string;
  unitPrice: number;
  pricePublic?: number;
  pricePublicVol?: number;
  priceIndustrial?: number;
  priceIndustrialVol?: number;
  volThreshold?: number;
  pricePerSheet: number;
  measure1: number;
  measure2: number;
  sqmPerSheet: number;
  pricePerSqm: number;
  active: boolean;
  laborMinutes?: number;
  // Campos específicos de CANTOS (tapacantos)
  calibre?: string;
  tipo?: string;
  rigidez?: string;
  moMinutesPerMl?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ===== LABOR TIME =====
export interface LaborTime {
  _id?: string;
  code: string;
  activityName: string;
  timeHours: number;
  category: 'armado' | 'instalacion' | '';
  minutes: number;
  valorMinuto: number;
  persons: number;
  quantity: number;
  unit: string;
  isService: boolean;
  notes: string;
  active: boolean;
}


// ===== CONFIG =====
export interface WasteRange {
  minMl: number;
  maxMl: number;
  factor: number;
}

export interface AppConfig {
  _id?: string;
  laborRatePerHour: number;
  designRatePerHour: number;
  unforeseenPercent: number;
  profitPercent: number;
  indirectPercent: number;
  taxPercent: number;
  defaultDiscount: number;
  nextQuotationNumber: number;
  wasteTable: WasteRange[];
  paymentTerms: string;
  validityDays: number;
  companyName: string;
  city: string;
}

// ===== QUOTATION SUB-SCHEMAS =====
export interface SupplyItem {
  description: string;
  providerColor: string;
  dimension: string;
  unitOfMeasure: string;
  quantityMode?: 'unit' | 'sqm'; // 'sqm' para tableros (uropack, alto brillo, mdf, melaminas)
  quantity: number;
  total: number;
  unitPrice: number;
  totalPrice: number;
  // Transitorios del dropdown de láminas (no se persisten en BD)
  _lamina?: string;
  _colorGroup?: string;
  _brand?: string;
  _laminaSearch?: string;
  _laminaOpen?: boolean;
  _materialLabel?: string;
  // Transitorios para cálculo de mano de obra por m² (regla de 3)
  _sqmPerSheet?: number;
  _laborMinutes?: number;
  _laborPerSqm?: number;
  _isManual?: boolean;
}

export interface EdgeBandItem {
  description: string;
  color: string;
  unitOfMeasure: string;
  quantity: number;
  wasteFactor: number;
  waste: number;
  total: number;
  unitPrice: number;
  totalPrice: number;
  // Atributos del tapacanto (persistidos)
  calibre?: string;
  tipo?: string;
  rigidez?: string;
  moMinutesPerMl?: number;
  moTotal?: number;
  // Transitorios del combobox de cantos (no se persisten en BD)
  _cantoSearch?: string;
  _cantoOpen?: boolean;
  _calibre?: string;
  _tipo?: string;
  _rigidez?: string;
  _esBrillante?: boolean;
  _isManual?: boolean;
}

export interface AccessoryItem {
  description: string;
  code: string;
  dimension: string;
  quantity: number;
  unit: string;
  timeHours: number;
  totalTime: number;
  laborRate: number;
  unitPrice: number;
  totalPrice: number;
  /** Si está activo agrega 5% adicional al precio unitario */
  apply5Percent?: boolean;
  _isManual?: boolean;
}

export interface DesignTimeItem {
  description: string;
  quantity: number;
  laborRate: number;
  unitPrice?: number;
  totalPrice: number;
}

export interface AssemblyItem {
  description: string;
  measurement: string;
  unitOfMeasure: string;
  assemblyHours: number;
  persons: number;
  totalQuantity: number;
  laborRate: number;
  totalPrice: number;
  _activitySearch?: string;
  _activity?: string;
  _activityOpen?: boolean;
  minutes?: number;
  valorMinuto?: number;
  baseQuantity?: number;
  calculatedMinutes?: number;
  _isManual?: boolean;
}

export interface InstallationItem {
  description: string;
  measurement: string;
  unitOfMeasure: string;
  installHours: number;
  persons: number;
  totalQuantity: number;
  laborRate: number;
  totalPrice: number;
  _activitySearch?: string;
  _activity?: string;
  _activityOpen?: boolean;
  minutes?: number;
  valorMinuto?: number;
  baseQuantity?: number;
  calculatedMinutes?: number;
  _isManual?: boolean;
}

export interface MesonDetails {
  materialId?: string;
  materialName?: string;
  basePricePerM2: number;
  depth: number;
  transportCost: number;
  profitPercentage: number;
  taxPercentage: number;
  linearPrice: number;
  baseCost: number;
  profitAmount: number;
  subtotal: number;
  taxAmount: number;
  finalPricePerMl: number;
}

export interface Furniture {
  _id?: string;
  name: string;
  description: string;
  measurements: string;
  /** M² del mueble para precio/M² (Excel: ej. 2.08 × 2.1 = 4.368) */
  areaSqm?: number;
  quantity: number;
  unit: string;
  type: 'standard' | 'custom' | 'meson';
  supplies: SupplyItem[];
  edgeBands: EdgeBandItem[];
  accessories: AccessoryItem[];
  designTime: DesignTimeItem[];
  clientPaidDesign: boolean;
  assembly: AssemblyItem[];
  installation: InstallationItem[];
  mesonDetails?: MesonDetails;
  totalSupplies: number;
  totalEdgeBands: number;
  totalAccessories: number;
  totalDesignTime: number;
  totalAssembly: number;
  totalInstallation: number;
  totalCost: number;
  totalBudget: number;
}

export interface SubAreaItem {
  description: string;
  measurements: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface SubArea {
  _id?: string;
  name: string;
  items: SubAreaItem[];
  total: number;
}

export interface VisibleAccessory {
  description: string;
  code: string;
  measurements: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Area {
  _id?: string;
  name: string;
  furniture: Furniture[];
  visibleAccessories: VisibleAccessory[];
  subAreas: SubArea[];
  areaTotal: number;
}

export interface QuotationTotals {
  totalCost: number;
  unforeseenPercent: number;
  unforeseenAmount: number;
  profitPercent: number;
  profitAmount: number;
  indirectPercent: number;
  indirectAmount: number;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  totalWithTax: number;
  discountPercent: number;
  discountAmount: number;
  grandTotal: number;
  totalSqm: number;
  pricePerSqm: number;
  viaticos: number;
}

export interface QuotationClient {
  name: string;
  city: string;
  phone: string;
  email: string;
  address: string;
  viaticos?: number;
}

// Ítems de venta de productos y servicios (clientPriceMode === 'products')
export interface ProductItem {
  code?: string;
  description: string;
  unit: string;
  quantity: number;
  /** Precio unitario CON IVA incluido (precio de venta) */
  unitPriceWithTax: number;
  totalWithTax: number;
}

// ===== WIZARD CONFIG (FASE 0.5) =====
export interface WizardConfig {
  /** Modo de precio: unit_sqm = Precio unitario x M²/Lineal (básica), manual = Ingreso manual (Premium), outsource = Tercerización */
  clientPriceMode: 'unit_sqm' | 'manual' | 'outsource' | 'products' | '';
  /** Modo herrajes — migrado al Paso 3 (Muebles) desde reunión 17-jun */
  hardwareDisplayMode: 'table' | 'included' | 'selective' | '';
  /** Modo tiempos MO — migrado al Paso 3 (Muebles) desde reunión 17-jun */
  moTimeMode: 'manual' | 'table' | 'mixed' | '';
  /** Adjuntar archivos de diseño y medidas */
  requiresDesignFiles: boolean | null;
  designFilesInternal: boolean | null;
  areaDisplayMode: 'subtotals' | 'global_only' | 'single' | '';
  /** Mesones: includes_meson = Sí (granito, quarztone, piedra sinterizada, compactos), no_meson = No */
  mesonMode: 'includes_meson' | 'no_meson' | '';
  /** Nivel de precios para materiales con esquemas escalonados (ej. Duropak) */
  pricingTier: 'industrial' | 'public' | '';
  wizardCompleted: boolean;
}

export interface Quotation {
  _id?: string;
  number: number;
  date: string;
  city: string;
  installationAddress: string;
  sameAddress: boolean;
  client: QuotationClient;
  title: string;
  areas: Area[];
  products?: ProductItem[];
  totals: QuotationTotals;
  wizardConfig: WizardConfig;
  status: 'nuevo' | 'en_revision' | 'aceptada' | 'rechazada' | 'archivada_aceptada' | 'archivada_rechazada' | 'borrador' | 'auditada' | 'enviada' | 'aprobada';
  paymentTerms: string;
  validityDays: number;
  notes: string;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

// ===== API RESPONSES =====
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface DashboardStats {
  totalQuotations: number;
  monthQuotations: number;
  statusCounts: { [key: string]: number };
  monthTotal: number;
  allTimeTotal: number;
}
