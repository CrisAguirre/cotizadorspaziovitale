import { Component, OnInit } from '@angular/core';
import { QuotationService } from '../../../services/quotation.service';
import { Quotation } from '../../../models/interfaces';
import { Router } from '@angular/router';
import { PdfGeneratorService } from '../../../services/pdf-generator.service';

@Component({
  selector: 'app-quotation-list',
  templateUrl: './quotation-list.component.html',
  styleUrls: ['./quotation-list.component.css']
})
export class QuotationListComponent implements OnInit {
  quotations: Quotation[] = [];
  archivedQuotations: Quotation[] = [];
  isLoading = true;
  activeTab: 'activas' | 'archivo' = 'activas';

  statusLabels: Record<string, string> = {
    'nuevo': 'NUEVO',
    'en_revision': 'EN REVISIÓN',
    'aceptada': 'ACEPTADA',
    'rechazada': 'RECHAZADA',
    'archivada_aceptada': 'ARCHIVADA ✅',
    'archivada_rechazada': 'ARCHIVADA ❌',
    // Legacy mappings
    'borrador': 'NUEVO',
    'auditada': 'EN REVISIÓN',
    'enviada': 'EN REVISIÓN',
    'aprobada': 'ACEPTADA'
  };

  constructor(
    private quotationService: QuotationService,
    private router: Router,
    private pdfGenerator: PdfGeneratorService
  ) {}

  ngOnInit() {
    this.loadQuotations();
  }

  loadQuotations() {
    this.isLoading = true;
    this.quotationService.getQuotations({ limit: 200 }).subscribe({
      next: (res: any) => {
        if (res.success) {
          const all = res.data as Quotation[];
          this.quotations = all.filter((q: any) =>
            !q.status?.startsWith('archivada')
          );
          this.archivedQuotations = all.filter((q: any) =>
            q.status?.startsWith('archivada')
          );
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  getDisplayList(): Quotation[] {
    return this.activeTab === 'activas' ? this.quotations : this.archivedQuotations;
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status] || status?.toUpperCase() || 'NUEVO';
  }

  getStatusClass(status: string): string {
    if (status === 'borrador') return 'nuevo';
    if (status === 'auditada' || status === 'enviada') return 'en_revision';
    if (status === 'aprobada') return 'aceptada';
    return status || 'nuevo';
  }

  changeStatus(quotation: any, newStatus: string) {
    const id = quotation._id;
    if (!id) return;

    this.quotationService.updateQuotation(id, { status: newStatus }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.loadQuotations();
        }
      },
      error: (err: any) => {
        alert('Error al cambiar estado: ' + (err.error?.message || err.message));
      }
    });
  }

  editQuotation(id?: string) {
    if (id) {
      this.router.navigate(['/quotations', id]);
    }
  }

  downloadPdf(quotation: Quotation) {
    this.pdfGenerator.generateQuotationPdf(quotation, null);
  }

  deleteQuotation(id: string | undefined, number: number) {
    if (!id) return;
    if (confirm(`¿Estás seguro de que deseas eliminar la cotización No. ${number}? Esta acción no se puede deshacer.`)) {
      this.quotationService.deleteQuotation(id).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.loadQuotations();
          }
        },
        error: (err: any) => {
          alert('Error al eliminar: ' + (err.error?.message || err.message));
        }
      });
    }
  }
}
