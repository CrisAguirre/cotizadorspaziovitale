import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QuotationService } from '../../../services/quotation.service';
import { ConfigService } from '../../../services/config.service';
import { QuotationCalculatorService } from '../../../services/quotation-calculator.service';
import { PdfGeneratorService } from '../../../services/pdf-generator.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AppConfig, Quotation, Area, Furniture, Material, SupplyItem, EdgeBandItem, AccessoryItem, AssemblyItem, WizardConfig, LaborTime } from '../../../models/interfaces';
import { LaborTimeService } from '../../../services/labor-time.service';
import { TemporalService, TemporalData } from '../../../services/temporal.service';
import { MaterialService } from '../../../services/material.service';
import { ToastService } from '../../../services/toast.service';

import { FURNITURE_HIERARCHY, FurnitureType } from '../../../config/furniture-hierarchy.config';
import { QuotationLogicService } from '../../../services/quotation-logic.service';

@Component({
  selector: 'app-quotation-wizard',
  templateUrl: './quotation-wizard.component.html',
  styleUrls: ['./quotation-wizard.component.css']
})
export class QuotationWizardComponent implements OnInit {
  currentStep = 1;
  wizardStep = 1; // Sub-step within the configuration wizard (1-4)
  readonly TOTAL_STEPS = 5;
  readonly TOTAL_WIZARD_QUESTIONS = 5;
  quotationForm: FormGroup;
  isLoading = false;
  showTip: { [key: number]: boolean } = { 1: false, 2: false, 3: false, 4: false, 5: false };
  showTipConfig: { [key: number]: boolean } = { 1: false, 2: false, 3: false, 4: false, 5: false };

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
      // En modo "Venta de productos y servicios" no aplican las preguntas 2-5 de configuración
      if (this.isProductsMode()) return true;
      if (c.requiresDesignFiles === null) return false;
      if (!c.areaDisplayMode) return false;
      if (!c.mesonMode) return false;
      // En modo "Ingreso manual" la lista de precios (pregunta 5) no aplica
      if (!this.isManualMode() && !c.pricingTier) return false;
      return true;
    }
    if (this.isProductsMode()) {
      if (step === 3) {
        return !!(this.activeQuotation.products && this.activeQuotation.products.length > 0);
      }
      return true; // Paso 4 Resumen siempre válido
    }
    if (step === 3) {
      // Must have at least one area with a name, and each area must have at least one furniture with a name.
      if (!this.activeQuotation.areas || this.activeQuotation.areas.length === 0) return false;
      return this.activeQuotation.areas.every(a => 
        a.name && a.name.trim() !== '' && 
        a.furniture && a.furniture.length > 0 && 
        a.furniture.every(f => f.name && f.name.trim() !== '' && f.quantity > 0)
      );
    }
    if (step === 4) {
      if (!this.activeQuotation.areas) return false;
      return this.activeQuotation.areas.every(a => 
        a.furniture.every(f => {
          if (f.type === 'meson') {
            if (!f.mesonDetails || !f.mesonDetails.basePricePerM2 || f.mesonDetails.basePricePerM2 <= 0) return false;
            return true;
          }
          
          // Verificar que no existan ítems sin costear o estimados
          const hasEstimated = (items: any[]) => items && items.some(i => i.description && i.description.includes('⧦Est.'));
          const hasZeroPrice = (items: any[]) => items && items.some(i => i.unitPrice == null || i.unitPrice <= 0);
          
          if (hasEstimated(f.accessories) || hasEstimated(f.assembly) || hasEstimated(f.installation)) return false;
          if (hasZeroPrice(f.supplies) || hasZeroPrice(f.edgeBands) || hasZeroPrice(f.accessories)) return false;
          
          return true;
        })
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
    pricingTier: '',
    wizardCompleted: false
  };

  activeQuotation: Quotation = {
    number: 0,
    date: new Date().toISOString().substring(0, 10),
    city: 'San Juan de Pasto',
    installationAddress: '',
    sameAddress: true,
    title: 'VENTA, ELABORACIÓN E INSTALACIÓN DE MOBILIARIO',
    client: { name: '', email: '', phone: '', city: '', address: '', viaticos: 0 },
    areas: [],
    products: [],
    totals: {
      totalCost: 0, unforeseenPercent: 10, unforeseenAmount: 0, profitPercent: 35, profitAmount: 0,
      indirectPercent: 32, indirectAmount: 0, subtotal: 0, taxPercent: 19, taxAmount: 0, totalWithTax: 0,
      discountPercent: 10, discountAmount: 0, grandTotal: 0, totalSqm: 0, pricePerSqm: 0, viaticos: 0
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
    { step: 4, title: 'Mesones', icon: '🍽️' },
    { step: 5, title: 'Lista de Precios', icon: '🏷️' }
  ];

  // ===== Modo "Venta de productos y servicios" =====
  // Catálogo de ejemplo — será reemplazado por el catálogo real cuando se cargue el Excel
  readonly sampleProducts: { code: string; description: string; unit: string; unitPriceWithTax: number }[] = [
    { code: 'SV-001', description: 'Silla ergonómica ejecutiva', unit: 'UNIDAD', unitPriceWithTax: 450000 },
    { code: 'SV-002', description: 'Tapizado de silla', unit: 'SERVICIO', unitPriceWithTax: 120000 },
    { code: 'SV-003', description: 'Pintura electrostática por M²', unit: 'M²', unitPriceWithTax: 85000 },
    { code: 'SV-004', description: 'Lámpara LED sobre gabinete', unit: 'UNIDAD', unitPriceWithTax: 65000 },
    { code: 'SV-005', description: 'Instalación y montaje de accesorios', unit: 'SERVICIO', unitPriceWithTax: 95000 }
  ];
  productSelection: { [code: string]: number } = {};
  productSearch = '';

  isProductsMode(): boolean {
    return this.activeQuotation.wizardConfig?.clientPriceMode === 'products';
  }

  isManualMode(): boolean {
    return this.activeQuotation.wizardConfig?.clientPriceMode === 'manual';
  }

  get maxWizardStep(): number {
    // En modo productos solo existe la pregunta 1; en manual se omite la lista de precios (5)
    if (this.isProductsMode()) return 1;
    if (this.isManualMode()) return this.TOTAL_WIZARD_QUESTIONS - 1;
    return this.TOTAL_WIZARD_QUESTIONS;
  }

  get maxSteps(): number {
    return this.isProductsMode() ? 4 : this.TOTAL_STEPS;
  }

  getFilteredSampleProducts() {
    const q = (this.productSearch || '').trim().toLowerCase();
    return this.sampleProducts.filter(
      (p) => !q || p.description.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q)
    );
  }

  private inputNumber(event: Event): number {
    return Math.max(0, Number((event.target as HTMLInputElement).value) || 0);
  }

  setProductQty(item: { code: string }, event: Event): void {
    this.productSelection[item.code] = this.inputNumber(event);
  }

  toggleProductSelection(item: { code: string }, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.productSelection[item.code] = checked ? (this.productSelection[item.code] || 1) : 0;
  }

  addSelectedProducts(): void {
    if (!this.activeQuotation.products) this.activeQuotation.products = [];
    for (const item of this.sampleProducts) {
      const qty = this.productSelection[item.code] || 0;
      if (qty <= 0) continue;
      const existing = this.activeQuotation.products.find((p) => p.code === item.code);
      if (existing) {
        existing.quantity = qty;
      } else {
        this.activeQuotation.products.push({
          code: item.code,
          description: item.description,
          unit: item.unit,
          quantity: qty,
          unitPriceWithTax: item.unitPriceWithTax,
          totalWithTax: 0
        });
      }
    }
    this.recalculate();
  }

  updateProductQty(index: number, event: Event): void {
    const p = this.activeQuotation.products?.[index];
    if (!p) return;
    p.quantity = this.inputNumber(event);
    this.recalculate();
  }

  removeProduct(index: number): void {
    this.activeQuotation.products?.splice(index, 1);
    this.recalculate();
  }

  appConfig!: AppConfig;

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private configService: ConfigService,
    public calcService: QuotationCalculatorService,
    private pdfGenerator: PdfGeneratorService,
    private laborTimeService: LaborTimeService,
    private temporalService: TemporalService,
    private materialService: MaterialService,
    private logicService: QuotationLogicService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.quotationForm = this.fb.group({
      number: [0],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      city: ['San Juan de Pasto', Validators.required],
      installationAddress: [''],
      sameAddress: [true],
      title: ['VENTA, ELABORACIÓN E INSTALACIÓN DE MOBILIARIO', Validators.required],
      client: this.fb.group({
        name: ['', Validators.required],
        city: ['', Validators.required],
        phone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        address: [''],
        viaticos: [0]
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
      if (params['temporalId']) {
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
    this.materialService.preloadAllMaterials().subscribe(() => {
      this.buildInsumoLaminas();
      this.buildCantoOptions();
    });
  }

  loadQuotation(id: string) {
    this.isLoading = true;
    this.quotationService.getQuotationById(id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.activeQuotation = res.data;
          this.quotationForm.patchValue({
            number: this.activeQuotation.number,
            date: this.activeQuotation.date,
            city: this.activeQuotation.city,
            installationAddress: this.activeQuotation.installationAddress || '',
            sameAddress: this.activeQuotation.sameAddress ?? true,
            title: this.activeQuotation.title,
            client: this.activeQuotation.client,
            paymentTerms: this.activeQuotation.paymentTerms,
            validityDays: this.activeQuotation.validityDays
          });
          this.initMesonUIStates();
          if (this.availableLaborTimes && this.availableLaborTimes.length > 0) {
            this.buildMOActivities();
          }
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

  private initMesonUIStates() {
    this.mesonUIState.clear();
    if (this.activeQuotation.areas) {
      for (const area of this.activeQuotation.areas) {
        if (area.furniture) {
          for (const furn of area.furniture) {
            if (furn.type === 'meson') {
              this.initMesonUIState(furn);
              const state = this.mesonUIState.get(furn);
              if (state && furn.mesonDetails) {
                state.transportType = furn.mesonDetails.transportCost <= 160000 ? 'compac' : 'piedra';
              }
            }
          }
        }
      }
    }
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
            installationAddress: this.activeQuotation.installationAddress || '',
            sameAddress: this.activeQuotation.sameAddress ?? true,
            title: this.activeQuotation.title,
            client: this.activeQuotation.client,
            paymentTerms: this.activeQuotation.paymentTerms,
            validityDays: this.activeQuotation.validityDays
          });
          this.initMesonUIStates();
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
    if (this.currentStep === 3) stepName = this.isProductsMode() ? 'Productos y servicios' : 'Muebles';
    if (this.currentStep === 4) stepName = this.isProductsMode() ? 'Resumen' : 'Presupuesto';
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
          this.buildMOActivities();
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
  nextStep() {
    if (this.currentStep === 1) {
      if (this.quotationForm.invalid) {
        this.quotationForm.markAllAsTouched();
        return;
      }
      const val = this.quotationForm.value;
      this.activeQuotation.number = val.number || this.activeQuotation.number;
      this.activeQuotation.date = val.date;
      this.activeQuotation.city = val.sameAddress ? val.client.city : val.city;
      this.activeQuotation.installationAddress = val.sameAddress ? val.client.address : val.installationAddress;
      this.activeQuotation.sameAddress = val.sameAddress;
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

    if (this.currentStep < this.maxSteps) {
      this.currentStep++;
    }

    if (this.currentStep === this.maxSteps) {
      this.recalculate();
    }
    
    this.autoSave();
  }

  onSameAddressChange() {
    const same = this.quotationForm.get('sameAddress')?.value;
    if (same) {
      const clientCity = this.quotationForm.get('client.city')?.value;
      const clientAddress = this.quotationForm.get('client.address')?.value;
      this.quotationForm.get('city')?.setValue(clientCity || '');
      this.quotationForm.get('installationAddress')?.setValue(clientAddress || '');
    }
  }

  syncViaticos() {
    const v = this.quotationForm.get('client.viaticos')?.value;
    this.activeQuotation.client.viaticos = Number(v) || 0;
    this.recalculate();
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
    // En modo venta no hay más preguntas internas: ir directo a Productos y servicios
    if (this.isProductsMode()) {
      this.nextStep();
      return;
    }
    if (this.wizardStep < this.maxWizardStep) {
      this.wizardStep++;
    }
  }

  prevWizardQuestion() {
    if (this.wizardStep > 1) {
      this.wizardStep--;
    }
  }

  goToWizardStep(step: number) {
    if (step > this.maxWizardStep) return;
    this.wizardStep = step;
  }

  onClientPriceModeChange() {
    this.wizardStep = 1;
  }

  isWizardComplete(): boolean {
    return this.wizardStep === this.TOTAL_WIZARD_QUESTIONS;
  }

  setDesignFilesMode(mode: 'attach' | 'none') {
    this.activeQuotation.wizardConfig.requiresDesignFiles = mode === 'attach';
    this.activeQuotation.wizardConfig.designFilesInternal = false;
    if (mode === 'none') {
      // Omitir "3. Asesoría y Diseño": limpiar los tiempos de diseño existentes
      this.activeQuotation.areas?.forEach((a) =>
        a.furniture?.forEach((f) => { f.designTime = []; })
      );
    }
    this.recalculate();
  }

  getDesignFilesMode(): string {
    if (this.activeQuotation.wizardConfig.requiresDesignFiles === true) return 'attach';
    if (this.activeQuotation.wizardConfig.requiresDesignFiles === false) return 'none';
    return '';
  }

  /** Oculta la sección "3. Asesoría y Diseño" del presupuesto cuando se declinó subir archivos de diseño */
  get hideDesignSection(): boolean {
    return this.activeQuotation.wizardConfig.requiresDesignFiles === false;
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
    return this.logicService.getFurnitureOptionsForArea(areaName);
  }

  onFurnitureSelectChange(furn: Furniture, area: Area, aIndex: number, fIndex: number) {
    if (furn.name === 'OTRO (ESPECIFICAR)') {
      furn.name = '';
      if (!this.customFurnFlags[aIndex]) this.customFurnFlags[aIndex] = {};
      this.customFurnFlags[aIndex][fIndex] = true;
    } else {
      if (this.customFurnFlags[aIndex]) this.customFurnFlags[aIndex][fIndex] = false;
      const opts = this.getFurnitureOptionsForArea(area.name);
      const opt = opts.find(o => o.name === furn.name);
      if (opt) {
        furn.unit = opt.unit;
      }
      this.autoAssignHardwareAndLabor(furn, area);
    }
  }

  isFurnCustom(area: Area, furn: Furniture, aIndex: number, fIndex: number): boolean {
    return this.logicService.isFurnCustom(area, furn, this.customFurnFlags, aIndex, fIndex);
  }

  autoAssignHardwareAndLabor(furn: Furniture, area: Area) {
    const laborRate = this.appConfig?.laborRatePerHour || 0;
    this.logicService.autoAssignHardwareAndLabor(
      furn, 
      area, 
      this.activeQuotation, 
      laborRate, 
      this.availableLaborTimes
    );
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
      assembly: [],
      installation: [],
      totalSupplies: 0,
      totalEdgeBands: 0,
      totalAccessories: 0,
      totalDesignTime: 0,
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

  mesonUIState = new Map<Furniture, {
    transportType: 'piedra' | 'compac';
    calcMode: 'standard' | 'compac';
    platePrice: number;
    plateArea: number;
  }>();

  private initMesonUIState(furn: Furniture) {
    if (!this.mesonUIState.has(furn)) {
      this.mesonUIState.set(furn, {
        transportType: 'piedra',
        calcMode: 'standard',
        platePrice: 0,
        plateArea: 0
      });
    }
  }

  toggleMeson(furn: Furniture, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      furn.type = 'meson';
      if (!furn.mesonDetails) {
        furn.mesonDetails = {
          basePricePerM2: 0,
          depth: 0.8,
          transportCost: 180000,
          profitPercentage: 68,
          taxPercentage: 19,
          linearPrice: 0,
          baseCost: 0,
          profitAmount: 0,
          subtotal: 0,
          taxAmount: 0,
          finalPricePerMl: 0
        };
      }
      this.initMesonUIState(furn);
    } else {
      furn.type = 'custom';
    }
    this.recalculate();
  }

  setDepth(furn: Furniture, depth: number) {
    if (!furn.mesonDetails) return;
    furn.mesonDetails.depth = depth;
    this.recalculate();
  }

  setTransportType(furn: Furniture, type: 'piedra' | 'compac') {
    if (!furn.mesonDetails) return;
    const state = this.mesonUIState.get(furn);
    if (state) state.transportType = type;
    furn.mesonDetails.transportCost = type === 'compac' ? 160000 : 180000;
    this.recalculate();
  }

  toggleCalcMode(furn: Furniture, event: Event) {
    const isCompac = (event.target as HTMLInputElement).checked;
    const state = this.mesonUIState.get(furn);
    if (!state || !furn.mesonDetails) return;
    state.calcMode = isCompac ? 'compac' : 'standard';
    if (isCompac) {
      this.setTransportType(furn, 'compac');
    }
  }

  applyCompacPrice(furn: Furniture) {
    const state = this.mesonUIState.get(furn);
    if (!state || !furn.mesonDetails || !state.plateArea || state.plateArea <= 0) return;
    const m2Price = state.platePrice / state.plateArea;
    if (m2Price > 0) {
      furn.mesonDetails.basePricePerM2 = m2Price;
    }
    this.recalculate();
  }

  addItem(
    furniture: Furniture,
    type: 'supplies' | 'edgeBands' | 'accessories' | 'designTime' | 'assembly' | 'installation'
  ) {
    if (!furniture[type]) furniture[type] = [];
    const item: Record<string, unknown> = { description: '' };
    if (type === 'supplies') {
      item['unitOfMeasure'] = 'LAMINA';
      item['quantity'] = 0;
      item['unitPrice'] = 0;
    }
    if (type === 'edgeBands') {
      item['unitOfMeasure'] = 'ML';
      item['quantity'] = 0;
      item['unitPrice'] = 0;
      item['moMinutesPerMl'] = 3;
    }
    if (type === 'accessories') {
      item['unit'] = 'UNIDAD';
      item['quantity'] = 1;
      item['unitPrice'] = 0;
      item['timeHours'] = 0;
      item['apply5Percent'] = false;
    }
    if (type === 'designTime') {
      item['quantity'] = 0;
    }
    if (type === 'assembly') {
      item['measurement'] = '';
      item['unitOfMeasure'] = 'm2';
      item['assemblyHours'] = 0;
      item['persons'] = 1;
      item['totalQuantity'] = 1;
      item['laborRate'] = 0;
      item['minutes'] = 0;
      item['valorMinuto'] = 0;
    }
    if (type === 'installation') {
      item['measurement'] = '';
      item['unitOfMeasure'] = 'm2';
      item['installHours'] = 0;
      item['persons'] = 2;
      item['totalQuantity'] = 1;
      item['laborRate'] = 0;
      item['minutes'] = 0;
      item['valorMinuto'] = 0;
    }

    (furniture[type] as unknown[]).push(item);
    this.recalculate();
  }

  removeItem(furniture: Furniture, type: string, index: number) {
    (furniture as unknown as Record<string, unknown[]>)[type].splice(index, 1);
    this.recalculate();
  }

  getMinutes(hours: number): number {
    return Math.round((hours || 0) * 60);
  }

  getTotalTimeMinutes(item: { quantity?: number; timeHours?: number }): number {
    return Math.round((item.quantity || 0) * (item.timeHours || 0) * 60);
  }

  recalculate() {
    if (!this.appConfig) return;
    this.calcService.recalculateAll(this.activeQuotation, this.appConfig);
  }

  applySupplyMaterial(furn: Furniture, item: SupplyItem, material: Material): void {
    item.description = material.description;
    item.providerColor = material.provider;
    item.unitOfMeasure = material.unit || 'LAMINA';

    // Datos del material para la mano de obra por m² (regla de 3)
    item._sqmPerSheet = material.sqmPerSheet || 0;
    item._laborMinutes = material.laborMinutes || 0;

    // Para tableros (uropack, alto brillo, mdf, melaminas): usar precio por m²
    if (material.unit === 'LAMINA' && material.pricePerSqm > 0) {
      item.quantityMode = 'sqm';
      item.unitPrice = material.pricePerSqm;
    } else {
      item.quantityMode = 'unit';
      item.unitPrice = material.unitPrice;
    }

    this.recalculate();
  }

  // ===== Dropdown de láminas para la sección "1. Insumos" =====
  readonly insumoCategories = ['melamina', 'laminado', 'duraopak', 'tablero'];
  insumoLaminas: { description: string; colorGroups: string[]; brands: string[]; materials: Material[] }[] = [];

  buildInsumoLaminas(): void {
    const mats = this.materialService.preloadedMaterials
      .filter((m) => this.insumoCategories.includes(m.category) && m.active);
    const map = new Map<string, { colorGroups: Set<string>; brands: Set<string>; materials: Material[] }>();
    mats.forEach((m) => {
      if (!map.has(m.description)) map.set(m.description, { colorGroups: new Set(), brands: new Set(), materials: [] });
      const e = map.get(m.description)!;
      e.materials.push(m);
      if (m.color) e.colorGroups.add(m.color);
      if (m.brand) e.brands.add(m.brand);
    });
    this.insumoLaminas = [...map.entries()]
      .map(([description, e]) => ({
        description,
        colorGroups: [...e.colorGroups].sort(),
        brands: [...e.brands].sort(),
        materials: e.materials.sort((a, b) => a.pricePerSqm - b.pricePerSqm)
      }))
      .sort((a, b) => a.description.localeCompare(b.description));

    // Re-sincronizar filas ya cargadas con el dropdown
    this.activeQuotation.areas?.forEach((a) =>
      a.furniture?.forEach((f) =>
        f.supplies?.forEach((s) => {
          if (s.description && !s._lamina) {
            s._lamina = s.description;
            s._laminaSearch = s.description;
            const e = this.insumoLaminas.find((x) => x.description === s.description);
            if (e && e.materials.length) s._colorGroup = e.colorGroups.length ? e.colorGroups[0] : '';
          }
        })
      )
    );
  }

  filteredInsumoLaminas(sup: SupplyItem): { description: string; colorGroups: string[]; brands: string[]; materials: Material[] }[] {
    const q = (sup?._laminaSearch || '').trim().toLowerCase();
    if (!q) return this.insumoLaminas;
    return this.insumoLaminas.filter((l) => l.description.toLowerCase().includes(q));
  }

  colorGroupsFor(sup: SupplyItem): string[] {
    if (!sup || !sup._lamina) return [];
    const e = this.insumoLaminas.find((x) => x.description === sup._lamina);
    return e ? e.colorGroups : [];
  }

  hasColorGroups(sup: SupplyItem): boolean {
    return this.colorGroupsFor(sup).length > 0;
  }

  brandsFor(sup: SupplyItem): string[] {
    return sup && sup._lamina ? this.insumoLaminas.find((x) => x.description === sup._lamina)?.brands || [] : [];
  }

  hasBrands(sup: SupplyItem): boolean {
    return this.brandsFor(sup).length > 1;
  }

  onLaminaSelect(furn: Furniture, sup: SupplyItem): void {
    sup._colorGroup = '';
    sup._brand = '';
    sup._materialLabel = '';
    const e = this.insumoLaminas.find((x) => x.description === sup._lamina);
    if (!e || e.materials.length === 0) return;
    // Con un solo grupo (o ninguno) se aplica de inmediato; con varios se espera al grupo de color
    if (e.colorGroups.length === 1) {
      sup._colorGroup = e.colorGroups[0];
    }
    const ready = e.colorGroups.length <= 1 && this.brandsFor(sup).length <= 1;
    if (ready) {
      this.applyResolvedSupply(furn, sup);
    }
  }

  onColorGroupSelect(furn: Furniture, sup: SupplyItem): void {
    // Si hay varias marcas para la lámina, se espera a que el operador elija la marca
    if (this.brandsFor(sup).length > 1) return;
    this.applyResolvedSupply(furn, sup);
  }

  onBrandSelect(furn: Furniture, sup: SupplyItem): void {
    this.applyResolvedSupply(furn, sup);
  }

  // ===== Combobox de láminas (escribir para buscar y desplegar) =====
  openLaminaPicker(sup: SupplyItem): void {
    sup._laminaOpen = true;
  }

  onLaminaTyping(furn: Furniture, sup: SupplyItem): void {
    sup._laminaOpen = true;
    // Si se editó el texto, invalidar la selección previa hasta volver a elegir
    if (sup._lamina) {
      this.onLaminaSelect(furn, sup);
    }
  }

  closeLaminaPicker(sup: SupplyItem): void {
    setTimeout(() => (sup._laminaOpen = false), 150);
  }

  selectLamina(furn: Furniture, sup: SupplyItem, description: string): void {
    sup._lamina = description;
    sup._laminaSearch = description;
    sup._laminaOpen = false;
    this.onLaminaSelect(furn, sup);
  }

  /** Resuelve la variante concreta (proveedor/marca/precio) a partir de lámina + grupo de color + marca */
  resolveSupplyMaterial(sup: SupplyItem): Material | undefined {
    if (!sup || !sup._lamina) return undefined;
    const e = this.insumoLaminas.find((x) => x.description === sup._lamina);
    if (!e || e.materials.length === 0) return undefined;
    const candidates = sup._colorGroup
      ? e.materials.filter((m) => m.color === sup._colorGroup)
      : e.materials;
    const filtered = sup._brand ? candidates.filter((m) => m.brand === sup._brand) : candidates;
    return filtered.length ? filtered[0] : (candidates.length ? candidates[0] : undefined);
  }

  applyResolvedSupply(furn: Furniture, sup: SupplyItem): void {
    const material = this.resolveSupplyMaterial(sup);
    if (!material) return;
    sup._materialLabel = `${material.provider} · ${material.brand || ''} · $${material.pricePerSqm.toLocaleString('es-CO')}/m²`;
    this.applySupplyMaterial(furn, sup, material);
  }

  applyEdgeMaterial(furn: Furniture, item: EdgeBandItem, material: Material): void {
    item.description = material.description;
    item.unitPrice = material.unitPrice;
    item.color = material.color || material.provider;
    item.unitOfMeasure = material.unit || 'ML';
    item.calibre = material.calibre || '';
    item.tipo = material.tipo || '';
    item.rigidez = material.rigidez || '';
    item.moMinutesPerMl = material.moMinutesPerMl || 3;
    item._calibre = item.calibre;
    item._tipo = item.tipo;
    item._rigidez = item.rigidez;
    item._esBrillante = material.tipo === 'brillantesbicolor';
    item._cantoSearch = item.description;
    item._cantoOpen = false;
    this.recalculate();
  }

  // ===== Combobox de Cantos (tapacantos) — calibre + tipo + rigidez + brillantes =====
  cantoCalibres: string[] = [];
  cantoBrillantes: Material[] = [];

  buildCantoOptions(): void {
    const cantos = this.materialService.preloadedMaterials
      .filter((m) => m.category === 'canto' && m.active)
      .sort((a, b) => a.description.localeCompare(b.description));

    const calibresSet = new Set<string>();
    const brillantes: Material[] = [];
    cantos.forEach((m) => {
      if (m.tipo === 'brillantesbicolor') {
        brillantes.push(m);
      } else if (m.calibre) {
        calibresSet.add(m.calibre);
      }
    });
    this.cantoCalibres = [...calibresSet].sort();
    this.cantoBrillantes = brillantes;

    // Re-sincronizar filas ya cargadas con el combobox
    this.activeQuotation.areas?.forEach((a) =>
      a.furniture?.forEach((f) =>
        f.edgeBands?.forEach((e) => {
          if ((e.tipo || e.calibre) && !e._calibre) {
            e._calibre = e.calibre || '';
            e._tipo = e.tipo || '';
            e._rigidez = e.rigidez || '';
            e._cantoSearch = e.description;
          }
        })
      )
    );
  }

  filteredCantoCalibres(edge: EdgeBandItem): { type: 'calibre'; label: string }[] {
    const q = (edge?._cantoSearch || '').trim().toLowerCase();
    return this.cantoCalibres
      .filter((c) => !q || c.toLowerCase().includes(q))
      .map((c) => ({ type: 'calibre', label: c }));
  }

  filteredCantoBrillantes(edge: EdgeBandItem): Material[] {
    const q = (edge?._cantoSearch || '').trim().toLowerCase();
    const list = this.cantoBrillantes;
    if (!q) return list;
    return list.filter((m) => `${m.description} ${m.color}`.toLowerCase().includes(q));
  }

  openCantoPicker(edge: EdgeBandItem): void {
    edge._cantoOpen = true;
    if (edge._cantoSearch && edge._calibre) {
      // Mantener la búsqueda para re-desplegar
    }
  }

  onCantoTyping(edge: EdgeBandItem): void {
    edge._cantoOpen = true;
  }

  closeCantoPicker(edge: EdgeBandItem): void {
    setTimeout(() => (edge._cantoOpen = false), 150);
  }

  selectCantoCalibre(furn: Furniture, edge: EdgeBandItem, calibre: string): void {
    edge._calibre = calibre;
    edge._tipo = '';
    edge._rigidez = '';
    edge._cantoSearch = calibre;
    edge._cantoOpen = false;
    this.tryResolveCanto(furn, edge);
  }

  selectCantoBrillante(furn: Furniture, edge: EdgeBandItem, material: Material): void {
    this.applyEdgeMaterial(furn, edge, material);
  }

  tiposForCalibre(edge: EdgeBandItem): string[] {
    if (!edge?._calibre) return [];
    return ['amaderado', 'unicolores'].filter((t) =>
      this.materialService.preloadedMaterials.some(
        (m) => m.category === 'canto' && m.active && m.calibre === edge._calibre && m.tipo === t
      )
    );
  }

  rigidecesForCalibre(edge: EdgeBandItem): string[] {
    if (!edge?._calibre || !edge._tipo) return [];
    return ['flexible', 'rigido'].filter((r) =>
      this.materialService.preloadedMaterials.some(
        (m) => m.category === 'canto' && m.active && m.calibre === edge._calibre && m.tipo === edge._tipo && m.rigidez === r
      )
    );
  }

  onCantoTipoChange(furn: Furniture, edge: EdgeBandItem): void {
    edge._rigidez = '';
    this.tryResolveCanto(furn, edge);
  }

  onCantoRigidezChange(furn: Furniture, edge: EdgeBandItem): void {
    this.tryResolveCanto(furn, edge);
  }

  private resolveCantoMaterial(edge: EdgeBandItem): Material | undefined {
    if (!edge._calibre || !edge._tipo || !edge._rigidez) return undefined;
    return this.materialService.preloadedMaterials.find(
      (m) =>
        m.category === 'canto' && m.active &&
        m.calibre === edge._calibre && m.tipo === edge._tipo && m.rigidez === edge._rigidez
    );
  }

  private tryResolveCanto(furn: Furniture, edge: EdgeBandItem): void {
    const material = this.resolveCantoMaterial(edge);
    if (material) {
      this.applyEdgeMaterial(furn, edge, material);
    }
  }

  applyAccessoryMaterial(item: AccessoryItem, material: Material): void {
    item.description = material.description;
    item.code = material.code;
    item.unitPrice = material.unitPrice;
    item.unit = material.unit || 'UNIDAD';
    if (material.laborMinutes && material.laborMinutes > 0) {
      item.timeHours = material.laborMinutes / 60;
    }
    this.recalculate();
  }

  toggleApply5Percent(acc: AccessoryItem) {
    acc.apply5Percent = !acc.apply5Percent;
    this.recalculate();
  }

  getEffectiveUnitPrice(acc: AccessoryItem): number {
    const base = acc.unitPrice || 0;
    return acc.apply5Percent ? Math.round(base * 1.05 * 100) / 100 : base;
  }



  applyMesonMaterial(furn: Furniture, material: Material): void {
    if (!furn.mesonDetails) return;
    furn.mesonDetails.materialId = material._id;
    furn.mesonDetails.materialName = material.description;
    furn.mesonDetails.basePricePerM2 = material.unitPrice || material.pricePerSqm || 0;
    const prov = (material.provider || '').toUpperCase();
    if (prov.includes('LAMITECH') || prov.includes('COMPAC')) {
      this.setTransportType(furn, 'compac');
    } else {
      this.setTransportType(furn, 'piedra');
    }
    this.recalculate();
  }

  onLaborTimeSelect(item: any, laborTimeCode: string, type: string) {
    const laborTime = this.availableLaborTimes.find(lt => lt.code === laborTimeCode);
    if (!laborTime) return;

    if (type === 'assembly') {
      this.applyLaborActivity(item, laborTime, 'armado');
    } else if (type === 'installation') {
      this.applyLaborActivity(item, laborTime, 'instalacion');
    } else if (type === 'designTime') {
      item.description = laborTime.activityName;
      item.quantity = laborTime.timeHours;
    }
    this.recalculate();
  }

  // ===== Actividades de M.O. (Armado / Instalación) — estilo Insumos =====
  armadoActivities: LaborTime[] = [];
  instalacionActivities: LaborTime[] = [];

  private buildMOActivities(): void {
    this.armadoActivities = this.availableLaborTimes
      .filter((l) => l.category === 'armado')
      .sort((a, b) => a.activityName.localeCompare(b.activityName));
    this.instalacionActivities = this.availableLaborTimes
      .filter((l) => l.category === 'instalacion')
      .sort((a, b) => a.activityName.localeCompare(b.activityName));

    // Re-sincronizar filas ya cargadas con el listado
    this.activeQuotation.areas?.forEach((a) =>
      a.furniture?.forEach((f) => {
        f.assembly?.forEach((it) => {
          if (it.description && !it._activity) {
            it._activity = it.description;
            it._activitySearch = it.description;
            const lt = this.armadoActivities.find((x) => x.activityName === it.description);
            if (lt) { it.minutes = lt.minutes; it.valorMinuto = lt.valorMinuto; it.persons = lt.persons; it.baseQuantity = lt.quantity || 1; }
          }
        });
        f.installation?.forEach((it) => {
          if (it.description && !it._activity) {
            it._activity = it.description;
            it._activitySearch = it.description;
            const lt = this.instalacionActivities.find((x) => x.activityName === it.description);
            if (lt) { it.minutes = lt.minutes; it.valorMinuto = lt.valorMinuto; it.persons = lt.persons; it.baseQuantity = lt.quantity || 1; }
          }
        });
      })
    );
  }

  filteredMOActivities(category: 'armado' | 'instalacion', item: any): LaborTime[] {
    const list = category === 'armado' ? this.armadoActivities : this.instalacionActivities;
    const q = (item?._activitySearch || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) => {
      const hay = `${l.activityName} ${l.unit} ${l.persons}`.toLowerCase();
      return q.split(/\s+/).every((part: string) => hay.includes(part));
    });
  }

  openMOPicker(item: any): void {
    item._activityOpen = true;
    if (item._activitySearch) {
      item._activitySearch = '';
    }
  }

  onMOTyping(item: any): void {
    item._activityOpen = true;
    item.description = item._activitySearch;
    if (item._activity) {
      item._activity = '';
    }
  }

  closeMOPicker(item: any): void {
    setTimeout(() => {
      item._activityOpen = false;
      if (!item._activitySearch && item.description) {
        item._activitySearch = item.description;
      }
    }, 150);
  }

  selectMOActivity(item: any, category: 'armado' | 'instalacion', laborTime: LaborTime): void {
    item._activity = laborTime.activityName;
    item._activitySearch = laborTime.activityName;
    item._activityOpen = false;
    this.applyLaborActivity(item, laborTime, category);
  }

  applyLaborActivity(item: any, laborTime: LaborTime, category: 'armado' | 'instalacion'): void {
    item.description = laborTime.activityName;
    item.unitOfMeasure = laborTime.unit || 'UNIDAD';
    item.minutes = laborTime.minutes || 0;
    item.valorMinuto = laborTime.valorMinuto || 0;
    item.baseQuantity = laborTime.quantity || 1;
    item.persons = category === 'instalacion' ? (laborTime.persons || 1) : 1;
    if (item.totalQuantity == null || item.totalQuantity === 0) {
      item.totalQuantity = 1;
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
            if (this.temporalId) {
              this.temporalService.deleteTemporal(this.temporalId).subscribe();
            }
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

  generatePdfWithoutBranding() {
    this.pdfGenerator.generateQuotationPdfWithoutBranding(this.activeQuotation, null);
  }
}
