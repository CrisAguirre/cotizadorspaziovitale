import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { QuotationService } from '../../../services/quotation.service';
import { ConfigService } from '../../../services/config.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-quotation-wizard',
  templateUrl: './quotation-wizard.component.html',
  styleUrls: ['./quotation-wizard.component.css']
})
export class QuotationWizardComponent implements OnInit {
  currentStep = 1;
  quotationForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private configService: ConfigService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.quotationForm = this.fb.group({
      number: [0],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      city: ['', Validators.required],
      title: ['', Validators.required],
      client: this.fb.group({
        name: ['', Validators.required],
        city: [''],
        phone: [''],
        email: ['', Validators.email]
      }),
      areas: this.fb.array([]),
      paymentTerms: [''],
      validityDays: [15]
    });
  }

  ngOnInit(): void {
    this.addArea();
  }

  get areas(): FormArray {
    return this.quotationForm.get('areas') as FormArray;
  }

  addArea() {
    this.areas.push(this.fb.group({
      name: ['', Validators.required],
      furniture: this.fb.array([])
    }));
  }

  removeArea(index: number) {
    this.areas.removeAt(index);
  }

  nextStep() {
    if (this.currentStep < 4) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  saveQuotation() {
    console.log('Quotation values:', this.quotationForm.value);
  }
}
