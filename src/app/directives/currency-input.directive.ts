import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Directiva para inputs de precios: muestra el valor formateado como moneda
 * ($ + separadores de miles + decimales) al perder el foco y mantiene el
 * modelo como número.
 */
@Directive({
  selector: 'input[currencyInput]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CurrencyInputDirective), multi: true }
  ]
})
export class CurrencyInputDirective implements ControlValueAccessor {
  constructor(private el: ElementRef) {}

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  @HostListener('focus')
  onFocus(): void {
    this.el.nativeElement.value = this.toRaw(this.el.nativeElement.value);
  }

  @HostListener('blur')
  onBlur(): void {
    this.el.nativeElement.value = this.format(this.parse(this.el.nativeElement.value));
    this.onTouched();
  }

  @HostListener('input')
  onInput(): void {
    this.onChange(this.parse(this.el.nativeElement.value));
  }

  writeValue(value: any): void {
    const n = Number(value) || 0;
    this.el.nativeElement.value = this.format(n);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  private parse(v: string): number {
    if (!v) return 0;
    let s = v.replace(/[$\s]/g, '');
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/\.(?=\d{3}(\D|$))/g, '');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  private toRaw(v: string): string {
    const n = this.parse(v);
    const decimals = v.includes(',') ? 2 : 0;
    return decimals ? n.toFixed(2) : n.toString();
  }

  private format(n: number): string {
    return '$ ' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}
