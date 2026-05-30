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
  isOpen = false;
  isLoading = false;

  private search$ = new Subject<string>();

  constructor(private materialService: MaterialService) {
    this.search$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q || q.length < 2) {
            return of({ success: true, data: [], pagination: { total: 0, page: 1, limit: 12, pages: 0 } });
          }
          this.isLoading = true;
          const params: Record<string, string | number> = {
            search: q,
            limit: 12,
            active: 'true'
          };
          if (this.category) params['category'] = this.category;
          return this.materialService.getMaterials(params);
        })
      )
      .subscribe({
        next: (res) => {
          this.results = res.data || [];
          this.isLoading = false;
          this.isOpen = this.query.length >= 2;
        },
        error: () => {
          this.isLoading = false;
          this.results = [];
        }
      });
  }

  onInput(): void {
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
