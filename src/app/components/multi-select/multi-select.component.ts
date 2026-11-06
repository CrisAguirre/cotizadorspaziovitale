import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Selector múltiple con chips, buscador y estilos alineados a `.form-control`
 * de la plataforma. Se usa para asignar varios operarios a un proyecto.
 */
@Component({
  selector: 'app-multi-select',
  templateUrl: './multi-select.component.html',
  styleUrls: ['./multi-select.component.css']
})
export class MultiSelectComponent {
  @Input() options: MultiSelectOption[] = [];
  @Input() selected: string[] = [];
  @Input() placeholder = 'Seleccionar…';
  @Input() searchPlaceholder = 'Buscar…';
  @Input() emptyText = 'Sin resultados';
  @Input() disabled = false;

  @Output() selectedChange = new EventEmitter<string[]>();

  isOpen = false;
  search = '';

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  get filteredOptions(): MultiSelectOption[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.options;
    return this.options.filter(
      (o) => o.label.toLowerCase().includes(term) || (o.hint || '').toLowerCase().includes(term)
    );
  }

  get selectedOptions(): MultiSelectOption[] {
    const values = new Set(this.selected || []);
    return this.options.filter((o) => values.has(o.value));
  }

  isSelected(value: string): boolean {
    return (this.selected || []).includes(value);
  }

  toggleOpen(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (!this.isOpen) this.search = '';
  }

  toggle(value: string): void {
    const current = this.selected || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.selectedChange.emit(next);
  }

  remove(value: string, event?: Event): void {
    event?.stopPropagation();
    this.selectedChange.emit((this.selected || []).filter((v) => v !== value));
  }

  clear(event?: Event): void {
    event?.stopPropagation();
    this.selectedChange.emit([]);
  }

  private close(): void {
    this.isOpen = false;
    this.search = '';
  }
}
