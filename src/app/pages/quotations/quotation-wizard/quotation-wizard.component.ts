import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QuotationService } from '../../../services/quotation.service';
import { ConfigService } from '../../../services/config.service';
import { QuotationCalculatorService } from '../../../services/quotation-calculator.service';
import { QuotationValidationService, QuotationValidationReport } from '../../../services/quotation-validation.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AppConfig, Quotation, Area, Furniture, Material, SupplyItem, EdgeBandItem, AccessoryItem } from '../../../models/interfaces';
import { buildQuotation2604Sample } from '../../../data/quotation-2604.sample';
import { QUOTATION_2604_REFERENCE } from '../../../data/quotation-2604.reference';

@Component({
  selector: 'app-quotation-wizard',
  templateUrl: './quotation-wizard.component.html',
  styleUrls: ['./quotation-wizard.component.css']
})
export class QuotationWizardComponent implements OnInit {
  currentStep = 1;
  quotationForm: FormGroup;
  isLoading = false;
  validationReport: QuotationValidationReport | null = null;
  readonly reference2604 = QUOTATION_2604_REFERENCE;

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
    status: 'borrador' as const,
    paymentTerms: '',
    validityDays: 15,
    notes: ''
  };

  appConfig!: AppConfig;

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private configService: ConfigService,
    public calcService: QuotationCalculatorService,
    private validationService: QuotationValidationService,
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
        city: [''],
        phone: [''],
        email: ['', Validators.email]
      }),
      paymentTerms: [''],
      validityDays: [15]
    });
  }

  ngOnInit(): void {
    this.loadConfig();
    this.route.queryParams.subscribe((params) => {
      if (params['demo'] === '2604') {
        this.loadSample2604();
      } else if (!this.activeQuotation.areas?.length) {
        this.addArea();
      }
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

    if (this.currentStep === 3) {
      this.recalculate();
    }

    if (this.currentStep < 4) {
      this.currentStep++;
    }

    if (this.currentStep === 4) {
      this.recalculate();
      if (this.activeQuotation.number === 2604) {
        this.runValidation2604();
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
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

  saveQuotation() {
    this.isLoading = true;
    this.recalculate();

    this.quotationService.createQuotation(this.activeQuotation).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success) {
          this.router.navigate(['/quotations']);
        }
      },
      error: (err: unknown) => {
        this.isLoading = false;
        console.error(err);
      }
    });
  }
}
