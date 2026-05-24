import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../../services/config.service';
import { AppConfig, WasteRange } from '../../models/interfaces';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  configForm: FormGroup;
  isLoading = true;
  isSaving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private configService: ConfigService,
    private fb: FormBuilder
  ) {
    this.configForm = this.fb.group({
      laborRatePerHour: [0, Validators.required],
      designRatePerHour: [0, Validators.required],
      unforeseenPercent: [0, Validators.required],
      profitPercent: [0, Validators.required],
      indirectPercent: [0, Validators.required],
      taxPercent: [0, Validators.required],
      defaultDiscount: [0],
      nextQuotationNumber: [0, Validators.required],
      paymentTerms: ['', Validators.required],
      validityDays: [0, Validators.required],
      companyName: ['', Validators.required],
      city: ['', Validators.required],
      wasteTable: this.fb.array([])
    });
  }

  ngOnInit() {
    this.loadConfig();
  }

  get wasteTable() {
    return this.configForm.get('wasteTable') as FormArray;
  }

  addWasteRange() {
    this.wasteTable.push(this.fb.group({
      minMl: [0, Validators.required],
      maxMl: [0, Validators.required],
      factor: [0, [Validators.required, Validators.min(0.01)]]
    }));
  }

  removeWasteRange(index: number) {
    this.wasteTable.removeAt(index);
  }

  loadConfig() {
    this.isLoading = true;
    this.configService.getConfig().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const config = res.data;
          this.configForm.patchValue({
            laborRatePerHour: config.laborRatePerHour,
            designRatePerHour: config.designRatePerHour,
            unforeseenPercent: config.unforeseenPercent,
            profitPercent: config.profitPercent,
            indirectPercent: config.indirectPercent,
            taxPercent: config.taxPercent,
            defaultDiscount: config.defaultDiscount,
            nextQuotationNumber: config.nextQuotationNumber,
            paymentTerms: config.paymentTerms,
            validityDays: config.validityDays,
            companyName: config.companyName,
            city: config.city
          });
          
          this.wasteTable.clear();
          if (config.wasteTable) {
            config.wasteTable.forEach(range => {
              this.wasteTable.push(this.fb.group({
                minMl: [range.minMl, Validators.required],
                maxMl: [range.maxMl, Validators.required],
                factor: [range.factor, Validators.required]
              }));
            });
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar la configuración';
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.configForm.valid) {
      this.isSaving = true;
      this.successMessage = '';
      this.errorMessage = '';
      this.configService.updateConfig(this.configForm.value).subscribe({
        next: (res) => {
          if (res.success) {
            this.successMessage = 'Configuración actualizada correctamente.';
          }
          this.isSaving = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => {
          this.errorMessage = 'Error al guardar la configuración.';
          this.isSaving = false;
        }
      });
    }
  }
}
