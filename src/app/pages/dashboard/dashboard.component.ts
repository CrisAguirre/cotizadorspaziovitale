import { Component, OnInit } from '@angular/core';
import { QuotationService } from '../../services/quotation.service';
import { DashboardStats } from '../../models/interfaces';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  isLoading = true;

  constructor(private quotationService: QuotationService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.quotationService.getDashboardStats().subscribe({
      next: (res) => {
        if (res.success) {
          this.stats = res.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading stats', err);
        this.isLoading = false;
      }
    });
  }
}
