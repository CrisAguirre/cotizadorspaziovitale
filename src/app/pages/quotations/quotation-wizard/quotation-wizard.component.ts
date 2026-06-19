import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QuotationService } from '../../../services/quotation.service';
import { ConfigService } from '../../../services/config.service';
import { QuotationCalculatorService } from '../../../services/quotation-calculator.service';
import { PdfGeneratorService } from '../../../services/pdf-generator.service';
import { QuotationValidationService, QuotationValidationReport } from '../../../services/quotation-validation.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AppConfig, Quotation, Area, Furniture, Material, SupplyItem, EdgeBandItem, AccessoryItem, AssemblyItem, WizardConfig, LaborTime } from '../../../models/interfaces';
import { LaborTimeService } from '../../../services/labor-time.service';
import { TemporalService, TemporalData } from '../../../services/temporal.service';
import { MaterialService } from '../../../services/material.service';
import { ToastService } from '../../../services/toast.service';
import { buildQuotation2604Sample } from '../../../data/quotation-2604.sample';
import { QUOTATION_2604_REFERENCE } from '../../../data/quotation-2604.reference';

interface FurnitureType {
  name: string;
  unit: 'ML' | 'M2' | 'UNIDAD';
}

const FURNITURE_HIERARCHY: { [area: string]: FurnitureType[] } = {
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

@Component({
  selector: 'app-quotation-wizard',
  templateUrl: './quotation-wizard.component.html',
  styleUrls: ['./quotation-wizard.component.css']
})
export class QuotationWizardComponent implements OnInit {
  currentStep = 1;
  wizardStep = 1; // Sub-step within the configuration wizard (1-4)
  readonly TOTAL_STEPS = 5;
  readonly TOTAL_WIZARD_QUESTIONS = 4;
  quotationForm: FormGroup;
  isLoading = false;
  validationReport: QuotationValidationReport | null = null;
  readonly reference2604 = QUOTATION_2604_REFERENCE;
  showTip: { [key: number]: boolean } = { 1: false, 2: false, 3: false, 4: false, 5: false };
  showTipConfig: { [key: number]: boolean } = { 1: false, 2: false, 3: false, 4: false };

  temporalId?: string;

  availableLaborTimes: LaborTime[] = [];
  
  // Variables para la jerarquía de selects
  areaCategories = Object.keys(FURNITURE_HIERARCHY);
  furnitureHierarchy = FURNITURE_HIERARCHY;
  customAreaFlags: { [index: number]: boolean } = {};
  customFurnFlags: { [areaIndex: number]: { [furnIndex: number]: boolean } } = {};

  isStepValid(step: number): boolean {
    if (step === 1) return this.quotationForm.valid;
    if (step === 2) {
      const c = this.activeQuotation.wizardConfig;
      if (!c.clientPriceMode) return false;
      if (c.requiresDesignFiles === null) return false;
      if (!c.areaDisplayMode) return false;
      if (!c.mesonMode) return false;
      return true;
    }
    if (step === 3) {
      // Must have at least one area with a name, and each area must have at least one furniture with a name.
      if (!this.activeQuotation.areas || this.activeQuotation.areas.length === 0) return false;
      return this.activeQuotation.areas.every(a => 
        a.name && a.name.trim() !== '' && 
        a.furniture && a.furniture.length > 0 && 
        a.furniture.every(f => f.name && f.name.trim() !== '')
      );
    }
    if (step === 4) {
      // Budget: furniture is already created, but we can ensure quantities > 0
      if (!this.activeQuotation.areas) return false;
      return this.activeQuotation.areas.every(a => 
        a.furniture.every(f => f.quantity > 0)
      );
    }
    return true; // Step 5 is always valid if we reached it
  }

  // Default wizard config
  readonly defaultWizardConfig: WizardConfig = {
    clientPriceMode: '',
    hardwareDisplayMode: 'table',   // default, configurable en Paso 3
    moTimeMode: 'mixed',            // default, configurable en Paso 3
    requiresDesignFiles: null,
    designFilesInternal: null,
    areaDisplayMode: '',
    mesonMode: '',
    wizardCompleted: false
  };

  activeQuotation: Quotation = {
    number: 0,
    date: new Date().toISOString().substring(0, 10),
    city: 'San Juan de Pasto',
    title: 'VENTA, ELABORACIÓN E INSTALACIÓN DE MOBILIARIO',
    client: { name: '', email: '', phone: '', city: '' },
    areas: [],
    totals: {
      totalCost: 0, unforeseenPercent: 10, unforeseenAmount: 0, profitPercent: 35, profitAmount: 0,
      indirectPercent: 32, indirectAmount: 0, subtotal: 0, taxPercent: 19, taxAmount: 0, totalWithTax: 0,
      discountPercent: 10, discountAmount: 0, grandTotal: 0, totalSqm: 0, pricePerSqm: 0
    },
    wizardConfig: { ...this.defaultWizardConfig },
    status: 'nuevo' as const,
    paymentTerms: '',
    validityDays: 15,
    notes: ''
  };

  // Labels for the wizard questions
  // Preguntas del wizard — Reunión 17-jun: 6→4 preguntas
  // Q2 (Herrajes) y Q3 (Tiempos MO) migradas al Paso 3 Muebles
  readonly wizardQuestions = [
    { step: 1, title: 'Modo de precio', icon: '💰' },
    { step: 2, title: 'Diseño y medidas', icon: '📐' },
    { step: 3, title: 'Estructura de áreas', icon: '🏠' },
    { step: 4, title: 'Mesones', icon: '🍽️' }
  ];

  appConfig!: AppConfig;

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private configService: ConfigService,
    public calcService: QuotationCalculatorService,
    private pdfGenerator: PdfGeneratorService,
    private validationService: QuotationValidationService,
    private laborTimeService: LaborTimeService,
    private temporalService: TemporalService,
    private materialService: MaterialService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.quotationForm = this.fb.group({
      number: [0],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      city: ['San Juan de Pasto', Validators.required],
      title: ['VENTA, ELABORACIÓN E INSTALACIÓN DE MOBILIARIO', Validators.required],
      client: this.fb.group({
        name: ['', Validators.required],
        city: ['', Validators.required],
        phone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]]
      }),
      paymentTerms: [''],
      validityDays: [15]
    });
  }

  ngOnInit(): void {
    this.loadConfig();
    this.loadLaborTimes();
    
    // Verificar si estamos editando una cotización existente
    this.route.params.subscribe((params) => {
      if (params['id'] && params['id'] !== 'new') {
        this.loadQuotation(params['id']);
      }
    });

    this.route.queryParams.subscribe((params) => {
      if (params['demo'] === '2604') {
        this.loadSample2604();
      } else if (params['temporalId']) {
        this.loadTemporal(params['temporalId']);
      } else if (!this.activeQuotation.areas?.length && !this.activeQuotation._id) {
        // Solo inicializamos el área por defecto si no estamos cargando nada
        setTimeout(() => {
          if (!this.activeQuotation._id) {
            this.addArea();
          }
        }, 100);
      }
    });

    // Precargar todos los materiales en segundo plano para que el buscador sea inmediato
    this.materialService.preloadAllMaterials().subscribe();
  }

  loadQuotation(id: string) {
    this.isLoading = true;
    this.quotationService.getQuotationById(id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.activeQuotation = res.data;
          this.quotationForm.patchValue({
            number: this.activeQuotation.number,
            date: this.activeQuotation.date, // Podría requerir formateo si viene con hora
            city: this.activeQuotation.city,
            title: this.activeQuotation.title,
            client: this.activeQuotation.client,
            paymentTerms: this.activeQuotation.paymentTerms,
            validityDays: this.activeQuotation.validityDays
          });
          this.recalculate();
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading quotation', err);
        this.toastService.error('Error', 'No se pudo cargar la cotización');
        this.isLoading = false;
      }
    });
  }

  loadTemporal(id: string) {
    this.temporalService.getTemporal(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.temporalId = res.data._id;
          this.activeQuotation = res.data.data;
          this.currentStep = res.data.currentStepNumber || 1;
          
          this.quotationForm.patchValue({
            number: this.activeQuotation.number,
            date: this.activeQuotation.date,
            city: this.activeQuotation.city,
            title: this.activeQuotation.title,
            client: this.activeQuotation.client,
            paymentTerms: this.activeQuotation.paymentTerms,
            validityDays: this.activeQuotation.validityDays
          });
          this.recalculate();
        }
      },
      error: (err) => console.error('Error loading temporal', err)
    });
  }

  autoSave() {
    // Determine the current step name for UI display
    let stepName = 'Inicio';
    if (this.currentStep === 1) stepName = 'Cliente';
    if (this.currentStep === 2) stepName = 'Configuración';
    if (this.currentStep === 3) stepName = 'Muebles';
    if (this.currentStep === 4) stepName = 'Presupuesto';
    if (this.currentStep === 5) stepName = 'Resumen';

    const clientName = this.quotationForm.value.client?.name || 'Borrador sin cliente';
    
    // Only save if we have at least the client name or we moved past step 1
    if (this.currentStep > 1 || this.quotationForm.value.client?.name) {
      const temporalData: TemporalData = {
        _id: this.temporalId,
        clientName: clientName,
        currentStepName: stepName,
        currentStepNumber: this.currentStep,
        data: this.activeQuotation
      };
      this.temporalService.saveTemporal(temporalData).subscribe(res => {
        if (res.success && res.data._id) {
          this.temporalId = res.data._id;
        }
      });
    }
  }

  loadLaborTimes() {
    this.laborTimeService.getLaborTimes({ limit: 200, active: true }).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.availableLaborTimes = res.data;
        }
      },
      error: (err: any) => console.error('Error loading labor times:', err)
    });
  }

  loadConfig() {
    this.configService.getConfig().subscribe((res: any) => {
      if (res.success) {
        this.appConfig = res.data;
        this.activeQuotation.totals.unforeseenPercent = this.appConfig.unforeseenPercent;
        this.activeQuotation.totals.profitPercent = this.appConfig.profitPercent;
        this.activeQuotation.totals.indirectPercent = this.appConfig.indirectPercent;
        this.activeQuotation.totals.taxPercent = this.appConfig.taxPercent;
        this.activeQuotation.totals.discountPercent = this.appConfig.defaultDiscount ?? 10;
        if (!this.activeQuotation.paymentTerms && this.appConfig.paymentTerms) {
          this.activeQuotation.paymentTerms = this.appConfig.paymentTerms;
        }
        this.recalculate();
      }
    });
  }

  loadSample2604(): void {
    this.activeQuotation = buildQuotation2604Sample();
    this.quotationForm.patchValue({
      number: this.activeQuotation.number,
      date: this.activeQuotation.date,
      city: this.activeQuotation.city,
      title: this.activeQuotation.title,
      client: this.activeQuotation.client,
      paymentTerms: this.activeQuotation.paymentTerms,
      validityDays: this.activeQuotation.validityDays
    });
    this.recalculate();
    this.runValidation2604();
  }

  runValidation2604(): void {
    this.validationReport = this.validationService.validateAgainst2604(this.activeQuotation.totals);
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (this.quotationForm.invalid) {
        this.quotationForm.markAllAsTouched();
        return;
      }
      const val = this.quotationForm.value;
      this.activeQuotation.number = val.number || this.activeQuotation.number;
      this.activeQuotation.date = val.date;
      this.activeQuotation.city = val.city;
      this.activeQuotation.title = val.title;
      this.activeQuotation.client = val.client;
      this.activeQuotation.paymentTerms = val.paymentTerms;
      this.activeQuotation.validityDays = val.validityDays;
    }

    // Step 2 is the config wizard — mark as completed when leaving
    if (this.currentStep === 2) {
      this.activeQuotation.wizardConfig.wizardCompleted = true;
    }

    if (this.currentStep === 4) {
      this.recalculate();
    }

    if (this.currentStep < this.TOTAL_STEPS) {
      this.currentStep++;
    }

    if (this.currentStep === 5) {
      this.recalculate();
      if (this.activeQuotation.number === 2604) {
        this.runValidation2604();
      }
    }
    
    this.autoSave();
  }

  prevStep() {
    if (this.currentStep === 2) {
      this.wizardStep = 1; // Reset wizard sub-step when going back
    }
    if (this.currentStep > 1) {
      this.currentStep--;
      this.autoSave();
    }
  }

  // Config wizard sub-navigation
  nextWizardQuestion() {
    if (this.wizardStep < this.TOTAL_WIZARD_QUESTIONS) {
      this.wizardStep++;
    }
  }

  prevWizardQuestion() {
    if (this.wizardStep > 1) {
      this.wizardStep--;
    }
  }

  isWizardComplete(): boolean {
    return this.wizardStep === this.TOTAL_WIZARD_QUESTIONS;
  }

  setDesignFilesMode(mode: 'attach' | 'none') {
    this.activeQuotation.wizardConfig.requiresDesignFiles = mode === 'attach';
    this.activeQuotation.wizardConfig.designFilesInternal = false;
  }

  getDesignFilesMode(): string {
    if (this.activeQuotation.wizardConfig.requiresDesignFiles) return 'attach';
    return 'none';
  }

  addArea() {
    if (!this.activeQuotation.areas) this.activeQuotation.areas = [];
    this.activeQuotation.areas.push({
      name: '',
      furniture: [],
      visibleAccessories: [],
      subAreas: [],
      areaTotal: 0
    });
  }

  removeArea(index: number) {
    this.activeQuotation.areas?.splice(index, 1);
    delete this.customAreaFlags[index];
    delete this.customFurnFlags[index];
    this.recalculate();
  }

  onAreaSelectChange(area: Area, index: number) {
    if (area.name === 'Otra / Personalizada') {
      this.customAreaFlags[index] = true;
      area.name = ''; // Limpiar para que escriba
    } else {
      this.customAreaFlags[index] = false;
    }
  }

  isAreaCustom(area: Area, index: number): boolean {
    if (this.customAreaFlags[index]) return true;
    if (!area.name) return false; // si esta vacio, mostrar select
    return !this.areaCategories.includes(area.name);
  }

  getFurnitureOptionsForArea(areaName: string): FurnitureType[] {
    return this.furnitureHierarchy[areaName] || [];
  }

  onFurnitureSelectChange(furn: Furniture, area: Area, aIndex: number, fIndex: number) {
    if (!this.customFurnFlags[aIndex]) this.customFurnFlags[aIndex] = {};

    if (furn.name === 'Otro / Personalizado') {
      this.customFurnFlags[aIndex][fIndex] = true;
      furn.name = ''; 
    } else {
      this.customFurnFlags[aIndex][fIndex] = false;
      // Autocompletar unidad de medida
      const options = this.getFurnitureOptionsForArea(area.name);
      const selectedDef = options.find(o => o.name === furn.name);
      if (selectedDef) {
        // Guardamos la unidad en algún campo. Dado que 'AreaSqm' se usaba genéricamente para la métrica principal,
        // vamos a añadir un campo "unitOfMeasure" temporal o usarlo para la vista. 
        // El campo en Furniture.unit es 'SERVICIO' por defecto, pero podemos ponerle la métrica allí
        furn.unit = selectedDef.unit;
      }
      this.autoAssignHardwareAndLabor(furn, area);
    }
  }

isFurnCustom(area: Area, furn: Furniture, aIndex: number, fIndex: number): boolean {
    if (this.customFurnFlags[aIndex] && this.customFurnFlags[aIndex][fIndex]) return true;
    const options = this.getFurnitureOptionsForArea(area.name);
    if (options.length === 0) return true; // Si el área no tiene opciones, es custom por defecto
    if (!furn.name) return false;
    return !options.some(o => o.name === furn.name);
  }

  autoAssignHardwareAndLabor(furn: Furniture, area: Area) {
    const laborRate = this.appConfig?.laborRatePerHour || 0;
    const autoMO = this.activeQuotation.wizardConfig.moTimeMode !== 'manual';
    furn.accessories = [];
    furn.assembly = [];
    furn.installation = [];

    const acc = (desc: string, qty: number, unit = 'UNIDAD'): AccessoryItem => ({
      description: desc + ' ⧦Est.', quantity: qty, unit,
      unitPrice: 0, totalPrice: 0,
      code: 'EST', dimension: '', timeHours: 0, totalTime: 0, laborRate: 0
    });
    // M.O. helpers que buscan el código real en la BD; si no lo encuentran, usan fallback
    const moFromDB = (code: string, fallbackDesc: string, fallbackHours: number): AssemblyItem => {
      const lt = this.availableLaborTimes.find(l => l.code === code);
      return {
        description: lt ? `${lt.activityName} [${code}]` : `${fallbackDesc} ⧦Est.`,
        assemblyHours: (lt && lt.timeHours > 0) ? lt.timeHours : fallbackHours,
        persons: 1, totalQuantity: furn.quantity || 1, laborRate, totalPrice: 0,
        measurement: '', unitOfMeasure: furn.unit || 'UNIDAD'
      };
    };
    const instFromDB = (code: string, fallbackDesc: string, fallbackHours: number) => {
      const lt = this.availableLaborTimes.find(l => l.code === code);
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
      // MO-022: Armado 2h/ML | MO-023: Instalación 1.5h/ML
      furn.accessories = [acc('Bisagra cierre lento 35mm', 3), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-022', 'Armado mueble alto', 2)]; furn.installation = [instFromDB('MO-023', 'Instalación mueble alto', 1.5)]; }
    } else if (n === 'MUEBLE BAJO') {
      // MO-026: Armado | MO-028: Instalación cocina sencilla
      furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Corredera telescópica soft-closing 350mm', 1), acc('Jalador barra aluminio', 1), acc('Soporte patas regulables', 4), acc('Tornillo melamina 3.5x16mm', 24)];
      if (autoMO) { furn.assembly = [moFromDB('MO-026', 'Armado mueble bajo', 2.5)]; furn.installation = [instFromDB('MO-028', 'Instalación mueble bajo', 1.5)]; }
    } else if (n === 'TORRE DE HORNOS') {
      // MO-037: Torre armado (referencia) | MO-038: instalación
      furn.accessories = [acc('Bisagra cierre lento 35mm', 4), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 30)];
      if (autoMO) { furn.assembly = [moFromDB('MO-037', 'Armado torre hornos', 3)]; furn.installation = [instFromDB('MO-038', 'Instalación torre hornos', 2)]; }
    } else if (n === 'TORRE DE ENTREPAÑOS' || n === 'ALACENA DE ENTREPAÑOS') {
      // MO-039: TR SIN ENTREPAÑOS ARMADO | MO-040: INSTALACIÓN
      furn.accessories = [acc('Soporte para entrepaño', 8), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-039', 'Armado torre entrepaños', 1.5)]; furn.installation = [instFromDB('MO-040', 'Instalación torre entrepaños', 1)]; }
    } else if (n === 'ALACENA PARA HERRAJE') {
      furn.accessories = [acc('Bisagra cierre lento 35mm', 4), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-039', 'Armado alacena', 1.5)]; furn.installation = [instFromDB('MO-040', 'Instalación alacena', 1)]; }
    } else if (n === 'MUEBLE NEVERA') {
      // MO-020: Armado Nevera | MO-021: Instalación
      furn.accessories = [acc('Tornillo melamina 3.5x16mm', 16)];
      if (autoMO) { furn.assembly = [moFromDB('MO-020', 'Armado mueble nevera', 2.5)]; furn.installation = [instFromDB('MO-021', 'Instalación mueble nevera', 1)]; }
    } else if (n === 'MUEBLE BARRA' || n === 'MUEBLE ISLA') {
      // MO-029: Isla armado | MO-030: Isla instalación
      furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Soporte patas regulables', 4), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 24)];
      if (autoMO) { furn.assembly = [moFromDB('MO-029', 'Armado mueble barra/isla', 3)]; furn.installation = [instFromDB('MO-030', 'Instalación mueble barra/isla', 2)]; }
    } else if (n === 'APERGOLADO' || n === 'SOMBREROS DE ISLA ( ESTRUCTURAS ALTAS )' || n === 'FACHADAS O RECUBRIMIENTOS') {
      // MO-091: Pergolas instalación 2h/M2 | MO-108/109: Fachadas
      furn.accessories = [acc('Tornillo melamina 3.5x16mm', 12)];
      if (autoMO) { furn.installation = [instFromDB('MO-091', 'Instalación apergolado/fachada', 2)]; }
    // ═══ CLOSET ══════════════════════════════════════════════════
    } else if (n === 'PUERTAS ABATIBLES') {
      // MO-101: Closet armado 1h/M2 | MO-102: Instalación 1.5h/M2
      furn.accessories = [acc('Bisagra cierre lento 35mm Grass', 3), acc('Jalador barra aluminio', 1), acc('Tornillo melamina 3.5x16mm', 16)];
      if (autoMO) { furn.assembly = [moFromDB('MO-101', 'Armado closet abatible', 1)]; furn.installation = [instFromDB('MO-102', 'Instalación closet abatible', 1.5)]; }
    } else if (n === 'SISTEMAS CORREDISOS') {
      // MO-101: Closet base | MO-099: Instalación puerta corrediza
      furn.accessories = [acc('Kit riel superior corredizo 2m', 1), acc('Rodamiento inferior corredizo', 4), acc('Jalador embutido', 2), acc('Tornillo melamina 3.5x16mm', 16)];
      if (autoMO) { furn.assembly = [moFromDB('MO-101', 'Armado sistema corredizo', 1)]; furn.installation = [instFromDB('MO-099', 'Instalación puerta corrediza', 0.25)]; }
    // ═══ MUEBLES DE BAÑO ═════════════════════════════════════════
    } else if (area.name === 'MUEBLES DE BAÑO' && n === 'MUEBLE FLOTANTE') {
      // MO-103: Armado baño | MO-104: Instalación baño
      furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Jalador barra aluminio', 1), acc('Soporte flotante de pared', 2), acc('Tornillo melamina 3.5x16mm', 20)];
      if (autoMO) { furn.assembly = [moFromDB('MO-103', 'Armado mueble flotante baño', 2)]; furn.installation = [instFromDB('MO-104', 'Instalación mueble flotante baño', 1)]; }
    // ═══ PUERTAS ═════════════════════════════════════════════════
    } else if (area.name === 'PUERTAS') {
      // MO-105: Marco puerta armado 1.5h/ML | MO-106: Instalación 1.5h/ML
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
        // MO-031: TV armado | MO-032: TV instalación
        furn.accessories = [acc('Bisagra cierre lento 35mm', 2), acc('Jalador barra aluminio', 1), acc('Soporte flotante de pared', 2), acc('Tornillo melamina 3.5x16mm', 16)];
        if (autoMO) { furn.assembly = [moFromDB('MO-031', 'Armado mueble TV/entretenimiento', 1.5)]; furn.installation = [instFromDB('MO-032', 'Instalación mueble TV/entretenimiento', 1)]; }
      } else {
        furn.accessories = [acc('Soporte para entrepaño', 6), acc('Tornillo melamina 3.5x16mm', 12)];
        if (autoMO) { furn.installation = [instFromDB('MO-040', 'Instalación apergolado/entrepaños', 1)]; }
      }
    }

    this.recalculate();
  }

  addFurniture(area: Area) {
    if (!area.furniture) area.furniture = [];
    area.furniture.push({
      name: '',
      description: '',
      measurements: '',
      quantity: 1,
      type: 'custom',
      unit: 'SERVICIO',
      supplies: [],
      edgeBands: [],
      accessories: [],
      designTime: [],
      clientPaidDesign: false,
      cuts: [],
      assembly: [],
      installation: [],
      totalSupplies: 0,
      totalEdgeBands: 0,
      totalAccessories: 0,
      totalDesignTime: 0,
      totalCuts: 0,
      totalAssembly: 0,
      totalInstallation: 0,
      totalCost: 0,
      totalBudget: 0
    });
  }

  removeFurniture(area: Area, index: number) {
    area.furniture?.splice(index, 1);
    this.recalculate();
  }

  addItem(
    furniture: Furniture,
    type: 'supplies' | 'edgeBands' | 'accessories' | 'designTime' | 'cuts' | 'assembly' | 'installation'
  ) {
    if (!furniture[type]) furniture[type] = [];
    const item: Record<string, unknown> = {};
    if (type === 'supplies') {
      item['unitOfMeasure'] = 'LAMINA';
      item['quantity'] = 0;
      item['unitPrice'] = 0;
    }
    if (type === 'edgeBands') {
      item['unitOfMeasure'] = 'ML';
      item['quantity'] = 0;
      item['unitPrice'] = 0;
    }
    if (type === 'accessories') {
      item['unit'] = 'UNIDAD';
      item['quantity'] = 1;
      item['unitPrice'] = 0;
      item['timeHours'] = 0;
    }
    if (type === 'designTime') {
      item['description'] = '';
      item['quantity'] = 0;
    }
    if (type === 'cuts') {
      item['sqm'] = 0;
      item['timeHours'] = 0;
      item['quantity'] = 1;
    }
    if (type === 'assembly') {
      item['unitOfMeasure'] = 'm2';
      item['assemblyHours'] = 0;
      item['persons'] = 2;
      item['totalQuantity'] = 1;
    }
    if (type === 'installation') {
      item['unitOfMeasure'] = 'm2';
      item['installHours'] = 0;
      item['persons'] = 2;
      item['totalQuantity'] = 1;
    }

    (furniture[type] as unknown[]).push(item);
    this.recalculate();
  }

  removeItem(furniture: Furniture, type: string, index: number) {
    (furniture as unknown as Record<string, unknown[]>)[type].splice(index, 1);
    this.recalculate();
  }

  recalculate() {
    if (!this.appConfig) return;
    this.calcService.recalculateAll(this.activeQuotation, this.appConfig);
    if (this.activeQuotation.number === 2604 && this.currentStep === 4) {
      this.runValidation2604();
    }
  }

  applySupplyMaterial(item: SupplyItem, material: Material): void {
    item.description = material.description;
    item.unitPrice = material.unitPrice;
    item.providerColor = material.provider;
    item.unitOfMeasure = material.unit || 'LAMINA';
    this.recalculate();
  }

  applyEdgeMaterial(item: EdgeBandItem, material: Material): void {
    item.description = material.description;
    item.unitPrice = material.unitPrice;
    item.color = material.color || material.provider;
    item.unitOfMeasure = material.unit || 'ML';
    this.recalculate();
  }

  applyAccessoryMaterial(item: AccessoryItem, material: Material): void {
    item.description = material.description;
    item.code = material.code;
    item.unitPrice = material.unitPrice;
    item.unit = material.unit || 'UNIDAD';
    this.recalculate();
  }

  onLaborTimeSelect(item: any, laborTimeCode: string, type: string) {
    const laborTime = this.availableLaborTimes.find(lt => lt.code === laborTimeCode);
    if (!laborTime) return;
    
    if (type === 'cuts') {
      item.description = laborTime.activityName;
      item.timeHours = laborTime.timeHours;
    } else if (type === 'assembly') {
      item.description = laborTime.activityName;
      item.assemblyHours = laborTime.timeHours;
    } else if (type === 'installation') {
      item.description = laborTime.activityName;
      item.installHours = laborTime.timeHours;
    }
    this.recalculate();
  }

  saveQuotation() {
    this.isLoading = true;
    this.activeQuotation.status = 'nuevo'; // Forzar estado válido para Mongoose
    this.recalculate();

    if (this.activeQuotation._id) {
      // Actualizar cotización existente
      this.quotationService.updateQuotation(this.activeQuotation._id, this.activeQuotation).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res.success) {
            this.toastService.success('Cotización actualizada', `La cotización No. ${this.activeQuotation.number} se actualizó exitosamente.`);
            this.router.navigate(['/quotations']);
          } else {
            this.toastService.error('Error al actualizar', 'No se pudo actualizar la cotización. Intente de nuevo.');
          }
        },
        error: (err: unknown) => {
          this.isLoading = false;
          console.error(err);
          this.toastService.error('Error', 'Error del servidor al actualizar');
        }
      });
    } else {
      // Crear nueva cotización
      this.quotationService.createQuotation(this.activeQuotation).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res.success) {
            // Si todo salió bien y veníamos de un temporal, borrar el temporal
            if (this.temporalId) {
              this.temporalService.deleteTemporal(this.temporalId).subscribe();
            }
            this.toastService.success('Cotización guardada', `La cotización No. ${this.activeQuotation.number} se guardó exitosamente.`);
            this.router.navigate(['/quotations']);
          } else {
            this.toastService.error('Error al guardar', 'No se pudo guardar la cotización. Intente de nuevo.');
          }
        },
        error: (err: unknown) => {
          this.isLoading = false;
          console.error(err);
          this.toastService.error('Error', 'Error del servidor al crear');
        }
      });
    }
  }

  generatePdf() {
    this.pdfGenerator.generateQuotationPdf(this.activeQuotation, null);
  }
}
