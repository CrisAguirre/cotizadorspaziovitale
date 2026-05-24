import { Component, OnInit } from '@angular/core';
import { QuotationService } from '../../../services/quotation.service';
import { Quotation } from '../../../models/interfaces';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quotation-list',
  templateUrl: './quotation-list.component.html',
  styleUrls: ['./quotation-list.component.css']
})
export class QuotationListComponent implements OnInit {
  quotations: Quotation[] = [];
  isLoading = true;

  constructor(private quotationService: QuotationService, private router: Router) {}

  ngOnInit() {
    this.loadQuotations();
  }

  loadQuotations() {
    this.isLoading = true;
    this.quotationService.getQuotations({ limit: 50 }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.quotations = res.data;
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  editQuotation(id?: string) {
    if (id) {
      this.router.navigate(['/quotations', id]);
    }
  }
}
