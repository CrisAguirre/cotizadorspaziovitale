import { Component, OnInit } from '@angular/core';
import { MaterialService } from '../../services/material.service';
import { SupplierImportService, SupplierImportFormat, ImportPreview } from '../../services/supplier-import.service';
import { Material } from '../../models/interfaces';

@Component({
  selector: 'app-price-list',
  templateUrl: './price-list.component.html',
  styleUrls: ['./price-list.component.css']
})
export class PriceListComponent implements OnInit {
  materials: Material[] = [];
  isLoading = true;
  isImporting = false;
  importMessage = '';
  importError = '';

  selectedFormat: SupplierImportFormat = 'hejercol';
  replaceProviderOnImport = false;
  preview: ImportPreview | null = null;

  categories = [
    { value: '', label: 'Todas' },
    { value: 'melamina', label: 'Melaminas' },
    { value: 'canto', label: 'Cantos' },
    { value: 'herraje', label: 'Herrajes' },
    { value: 'accesorio', label: 'Accesorios' },
    { value: 'meson', label: 'Mesones' },
    { value: 'vidrio', label: 'Vidrios' },
    { value: 'otro', label: 'Otros' }
  ];
  filterCategory = '';
  filterProvider = '';
  filterBrand = '';
  searchTerm = '';
  providers: string[] = [];
  brands: string[] = [];

  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  readonly pageSize = 50;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  formatOptions: { value: SupplierImportFormat; label: string }[] = [
    { value: 'hejercol', label: 'Hejercol (portafolio herrajes)' },
    { value: 'ferramenta', label: 'Ferramenta Italiana' },
    { value: 'volpato', label: 'Volpato' },
    { value: 'iberway_cocina', label: 'Iberway cocina / armario' },
    { value: 'roca_marmol', label: 'Roca Mármol (mesones granito)' },
    { value: 'lamitech_compac', label: 'Lamitech (compactos)' },
    { value: 'tecnifacil', label: 'TECNIFACIL (sistemas corredizos)' }
  ];

  constructor(
    private materialService: MaterialService,
    private supplierImport: SupplierImportService
  ) {}

  ngOnInit(): void {
    this.loadProviders();
    this.loadBrands();
    this.loadMaterials();
  }

  loadProviders(): void {
    this.materialService.getProviders().subscribe({
      next: (res: any) => {
        if (res.success) this.providers = res.data;
      }
    });
  }

  loadBrands(): void {
    this.materialService.getBrands().subscribe({
      next: (res: any) => {
        if (res.success) this.brands = res.data;
      }
    });
  }

  loadMaterials(): void {
    this.isLoading = true;
    const params: Record<string, string | number> = {
      limit: this.pageSize,
      page: this.currentPage
    };
    if (this.filterCategory) params['category'] = this.filterCategory;
    if (this.filterProvider) params['provider'] = this.filterProvider;
    if (this.filterBrand) params['brand'] = this.filterBrand;
    if (this.searchTerm.trim()) params['search'] = this.searchTerm.trim();
    if (this.sortColumn) {
      params['sort'] = this.sortDirection === 'desc' ? `-${this.sortColumn}` : this.sortColumn;
    }

    this.materialService.getMaterials(params).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.materials = res.data;
          if (res.pagination) {
            this.totalPages = res.pagination.pages || 1;
            this.totalItems = res.pagination.total || 0;
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadMaterials();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadMaterials();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadMaterials();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadMaterials();
    }
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
    this.loadMaterials();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importError = '';
    this.importMessage = '';
    this.preview = null;

    const detected = this.supplierImport.detectFormat(file.name);
    if (detected) this.selectedFormat = detected;

    try {
      this.preview = await this.supplierImport.parseFile(file, this.selectedFormat);
      this.importMessage = `Vista previa: ${this.preview.materials.length} ítems listos (${this.preview.provider}).`;
    } catch (err: unknown) {
      this.importError = err instanceof Error ? err.message : 'Error al leer el Excel';
    }

    input.value = '';
  }

  confirmImport(): void {
    if (!this.preview?.materials.length) return;

    this.isImporting = true;
    this.importError = '';
    this.importMessage = '';

    const replace = this.replaceProviderOnImport ? this.preview.provider : undefined;

    this.materialService.bulkUpsert(this.preview.materials, replace).subscribe({
      next: (res) => {
        this.isImporting = false;
        if (res.success && res.data) {
          this.importMessage = res.message || `Importados ${res.data.total} materiales.`;
          this.preview = null;
          this.currentPage = 1;
          this.loadMaterials();
        }
      },
      error: (err) => {
        this.isImporting = false;
        this.importError = err?.error?.message || 'Error al guardar en el servidor';
      }
    });
  }

  cancelPreview(): void {
    this.preview = null;
    this.importMessage = '';
  }
}

