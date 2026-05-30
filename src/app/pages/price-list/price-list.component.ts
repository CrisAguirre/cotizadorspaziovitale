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
    { value: 'meson', label: 'Mesones' }
  ];
  filterCategory = '';
  searchTerm = '';

  formatOptions: { value: SupplierImportFormat; label: string }[] = [
    { value: 'hejercol', label: 'Hejercol (portafolio herrajes)' },
    { value: 'ferramenta', label: 'Ferramenta Italiana' },
    { value: 'volpato', label: 'Volpato' },
    { value: 'iberway_cocina', label: 'Iberway cocina / armario' }
  ];

  constructor(
    private materialService: MaterialService,
    private supplierImport: SupplierImportService
  ) {}

  ngOnInit(): void {
    this.loadMaterials();
  }

  loadMaterials(): void {
    this.isLoading = true;
    const params: Record<string, string | number> = { limit: 200 };
    if (this.filterCategory) params['category'] = this.filterCategory;
    if (this.searchTerm.trim()) params['search'] = this.searchTerm.trim();

    this.materialService.getMaterials(params).subscribe({
      next: (res) => {
        if (res.success) this.materials = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
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
