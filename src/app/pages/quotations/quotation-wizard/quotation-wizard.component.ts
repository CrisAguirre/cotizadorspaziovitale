import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QuotationService } from '../../../services/quotation.service';
import { ConfigService } from '../../../services/config.service';
import { QuotationCalculatorService } from '../../../services/quotation-calculator.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AppConfig, Quotation, Area, Furniture } from '../../../models/interfaces';

@Component({
  selector: 'app-quotation-wizard',
  templateUrl: './quotation-wizard.component.html',
  styleUrls: ['./quotation-wizard.component.css']
})
export class QuotationWizardComponent implements OnInit {
  currentStep = 1;
  quotationForm: FormGroup;
  isLoading = false;
  
  // Objeto de memoria para las matemáticas directas (Evitando lentitud de Reactive Forms en niveles profundos)
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
      discountPercent: 0, discountAmount: 0, grandTotal: 0, totalSqm: 0, pricePerSqm: 0
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
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.quotationForm = this.fb.group({
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
    this.addArea();
  }

  loadConfig() {
    this.configService.getConfig().subscribe((res: any) => {
      if (res.success) {
        this.appConfig = res.data;
        this.activeQuotation.totals.unforeseenPercent = this.appConfig.unforeseenPercent;
        this.activeQuotation.totals.profitPercent = this.appConfig.profitPercent;
        this.activeQuotation.totals.indirectPercent = this.appConfig.indirectPercent;
        this.activeQuotation.totals.taxPercent = this.appConfig.taxPercent;
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
      this.activeQuotation.date = val.date;
      this.activeQuotation.city = val.city;
      this.activeQuotation.title = val.title;
      this.activeQuotation.client = val.client;
      this.activeQuotation.paymentTerms = val.paymentTerms;
      this.activeQuotation.validityDays = val.validityDays;
    }
    
    if (this.currentStep < 4) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  // ==== MANEJO DE ARRAY EN MEMORIA ====
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

  addItem(furniture: Furniture, type: 'supplies' | 'edgeBands' | 'accessories' | 'cuts' | 'assembly' | 'installation') {
    if (!furniture[type]) furniture[type] = [];
    const item: any = {};
    if (type === 'supplies') { item.unitOfMeasure = 'LAMINA'; item.quantity = 0; item.unitPrice = 0; }
    if (type === 'edgeBands') { item.unitOfMeasure = 'ML'; item.quantity = 0; item.unitPrice = 0; }
    if (type === 'accessories') { item.unit = 'UNIDAD'; item.quantity = 0; item.unitPrice = 0; item.timeHours = 0; }
    if (type === 'cuts') { item.sqm = 0; item.timeHours = 0; item.quantity = 1; }
    if (type === 'assembly') { item.unitOfMeasure = 'm2'; item.assemblyHours = 0; item.persons = 2; item.totalQuantity = 1; }
    if (type === 'installation') { item.unitOfMeasure = 'm2'; item.installHours = 0; item.persons = 2; item.totalQuantity = 1; }
    
    (furniture[type] as any[]).push(item);
  }

  removeItem(furniture: Furniture, type: string, index: number) {
    (furniture as any)[type].splice(index, 1);
    this.recalculate();
  }

  recalculate() {
    if (!this.appConfig) return;
    this.calcService.recalculateAll(this.activeQuotation, this.appConfig);
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
      error: (err: any) => {
        this.isLoading = false;
        console.error(err);
      }
    });
  }
}
