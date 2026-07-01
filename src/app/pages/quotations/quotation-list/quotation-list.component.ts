import { Component, OnInit } from '@angular/core';
import { QuotationService } from '../../../services/quotation.service';
import { Quotation } from '../../../models/interfaces';
import { Router, ActivatedRoute } from '@angular/router';
import { PdfGeneratorService } from '../../../services/pdf-generator.service';
import { ToastService } from '../../../services/toast.service';

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
  filterStatus: string | null = null;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

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
    private route: ActivatedRoute,
    private pdfGenerator: PdfGeneratorService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.filterStatus = params['filter'] || null;
      // switch to archivo tab if filter suggests it, but let's stick to activas if filtering the active ones.
    });
    this.loadQuotations();
  }

  clearFilter() {
    this.setFilter(null);
  }

  setFilter(status: string | null) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: status },
      queryParamsHandling: 'merge'
    });
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
    let list = this.activeTab === 'activas' ? this.quotations : this.archivedQuotations;
    
    if (this.filterStatus) {
      list = list.filter((q: any) => this.getStatusClass(q.status) === this.filterStatus);
    }

    if (this.sortColumn) {
      list = [...list].sort((a: any, b: any) => {
        let valA = a[this.sortColumn];
        let valB = b[this.sortColumn];

        // Manejar sub-propiedades
        if (this.sortColumn === 'client.name') {
          valA = a.client?.name;
          valB = b.client?.name;
        } else if (this.sortColumn === 'totals.grandTotal') {
          valA = a.totals?.grandTotal;
          valB = b.totals?.grandTotal;
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
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

    this.quotationService.updateQuotation(id, { status: newStatus as Quotation['status'] }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.loadQuotations();
        }
      },
      error: (err: any) => {
        this.toastService.error('Error al cambiar estado', err.error?.message || err.message);
      }
    });
  }

  viewQuotation(id?: string) {
    if (id) {
      this.router.navigate(['/quotations/view', id]);
    }
  }

  editQuotation(id?: string) {
    if (id) {
      this.router.navigate(['/quotations', id]);
    }
  }

  downloadPdf(quotation: Quotation) {
    if (!quotation._id) return;
    this.quotationService.getQuotationById(quotation._id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.pdfGenerator.generateQuotationPdf(res.data, null);
        } else {
          this.toastService.error('Error', 'No se pudo obtener la cotización completa para el PDF.');
        }
      },
      error: (err: any) => {
        console.error('Error fetching full quotation:', err);
        this.toastService.error('Error al descargar PDF', 'Verifica la consola para más detalles.');
      }
    });
  }

  deleteQuotation(id: string | undefined, number: number) {
    if (!id) return;
    this.toastService.confirm({
      title: 'Eliminar cotización',
      message: `¿Estás seguro de que deseas eliminar la cotización No. ${number}? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.quotationService.deleteQuotation(id).subscribe({
          next: (res: any) => {
            if (res.success) {
              this.toastService.success('Eliminada', `Cotización No. ${number} eliminada exitosamente.`);
              this.loadQuotations();
            }
          },
          error: (err: any) => {
            this.toastService.error('Error al eliminar', err.error?.message || err.message);
          }
        });
      }
    });
  }
}
