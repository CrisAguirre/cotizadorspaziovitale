// ===== MATERIAL =====
export interface Material {
  _id?: string;
  category: 'melamina' | 'canto' | 'accesorio' | 'herraje' | 'vidrio' | 'meson' | 'otro';
  code: string;
  description: string;
  provider: string;
  color: string;
  dimension: string;
  unit: string;
  unitPrice: number;
  pricePerSheet: number;
  measure1: number;
  measure2: number;
  sqmPerSheet: number;
  pricePerSqm: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  quantity: number;
  total: number;
  unitPrice: number;
  totalPrice: number;
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
}

export interface DesignTimeItem {
  description: string;
  quantity: number;
  laborRate: number;
  totalPrice: number;
}

export interface CutItem {
  description: string;
  sqm: number;
  timeHours: number;
  quantity: number;
  laborRate: number;
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
  cuts: CutItem[];
  assembly: AssemblyItem[];
  installation: InstallationItem[];
  totalSupplies: number;
  totalEdgeBands: number;
  totalAccessories: number;
  totalDesignTime: number;
  totalCuts: number;
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
}

export interface QuotationClient {
  name: string;
  city: string;
  phone: string;
  email: string;
}

export interface Quotation {
  _id?: string;
  number: number;
  date: string;
  city: string;
  client: QuotationClient;
  title: string;
  areas: Area[];
  totals: QuotationTotals;
  status: 'borrador' | 'auditada' | 'enviada' | 'aprobada';
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
}
