import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotationService } from '../../../services/quotation.service';
import { PdfGeneratorService } from '../../../services/pdf-generator.service';
import { Quotation } from '../../../models/interfaces';

@Component({
  selector: 'app-quotation-view',
  templateUrl: './quotation-view.component.html',
  styleUrls: ['./quotation-view.component.css']
})
export class QuotationViewComponent implements OnInit {
  quotation: Quotation | null = null;
  isLoading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quotationService: QuotationService,
    private pdfGenerator: PdfGeneratorService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadQuotation(id);
    } else {
      this.error = 'No se proporcionó ID de cotización.';
      this.isLoading = false;
    }
  }

  loadQuotation(id: string) {
    this.quotationService.getQuotationById(id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.quotation = res.data;
        } else {
          this.error = 'Cotización no encontrada.';
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Error al cargar la cotización.';
        this.isLoading = false;
      }
    });
  }

  downloadPdf() {
    if (this.quotation) {
      this.pdfGenerator.generateQuotationPdf(this.quotation, null);
    }
  }

  goBack() {
    this.router.navigate(['/quotations']);
  }

  getMarkupFactor(): number {
    if (!this.quotation) return 1;
    const totals = this.quotation.totals;
    if (!totals || !totals.totalCost || totals.totalCost === 0) return 1;
    return totals.grandTotal / totals.totalCost;
  }

  getFurnitureClientPrice(furn: any): number {
    if (!this.quotation) return 0;
    
    if (furn.type === 'meson' && furn.mesonDetails) {
      return furn.totalBudget || 0;
    }

    const wConfig = this.quotation.wizardConfig || { clientPriceMode: 'proportional', hardwareDisplayMode: 'table' };
    const totals = this.quotation.totals || { pricePerSqm: 0 };
    
    let furnBaseCost = furn.totalCost || 0;
    if (wConfig.hardwareDisplayMode === 'table') {
      furnBaseCost -= (furn.totalAccessories || 0);
    }

    if (wConfig.clientPriceMode === 'unit_sqm') {
      return (furn.areaSqm || 0) * (totals.pricePerSqm || 0);
    } else if (wConfig.clientPriceMode === 'manual' || wConfig.clientPriceMode === 'outsource') {
      return furnBaseCost * this.getMarkupFactor();
    }
    return furnBaseCost * this.getMarkupFactor();
  }

  getAreaSubtotal(area: any): number {
    if (!area.furniture) return 0;
    return area.furniture.reduce((sum: number, f: any) => sum + this.getFurnitureClientPrice(f), 0);
  }

  isMesonExpanded: { [furnIndex: string]: boolean } = {};

  toggleMesonExpand(areaIndex: number, furnIndex: number) {
    const key = `${areaIndex}-${furnIndex}`;
    this.isMesonExpanded[key] = !this.isMesonExpanded[key];
  }
}
