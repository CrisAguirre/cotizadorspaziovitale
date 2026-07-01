import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { MaterialService } from '../../services/material.service';
import { Material } from '../../models/interfaces';

@Component({
  selector: 'app-material-picker',
  templateUrl: './material-picker.component.html',
  styleUrls: ['./material-picker.component.css']
})
export class MaterialPickerComponent {
  @Input() category: string = '';
  @Input() placeholder = 'Buscar en lista de precios...';
  @Output() materialSelected = new EventEmitter<Material>();

  query = '';
  results: Material[] = [];
  totalResults = 0;
  isOpen = false;
  isLoading = false;

  private search$ = new Subject<string>();

  constructor(private materialService: MaterialService) {
    this.search$
      .pipe(
        debounceTime(50),
        distinctUntilChanged(),
        switchMap((q) => {
          // Si no hay query pero hay categoría, mostrar todos los items de la categoría
          if ((!q || q.length < 2) && this.category) {
            this.isLoading = true;
            return this.materialService.searchLocalMaterials('', 50, this.category);
          }
          if (!q || q.length < 2) {
            return of({ success: true, data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } });
          }
          this.isLoading = true;
          return this.materialService.searchLocalMaterials(q, 50, this.category);
        })
      )
      .subscribe({
        next: (res) => {
          this.results = res.data || [];
          this.totalResults = res.pagination?.total || this.results.length;
          this.isLoading = false;
          this.isOpen = true;
        },
        error: () => {
          this.isLoading = false;
          this.results = [];
          this.totalResults = 0;
        }
      });
  }

  onInput(): void {
    this.search$.next(this.query.trim());
  }

  onFocus(): void {
    // Al enfocar, disparar la búsqueda con el query actual (o vacío para mostrar todos de la categoría)
    this.search$.next(this.query.trim());
  }

  select(material: Material): void {
    this.materialSelected.emit(material);
    this.query = material.description;
    this.isOpen = false;
  }

  close(): void {
    setTimeout(() => (this.isOpen = false), 150);
  }
}
