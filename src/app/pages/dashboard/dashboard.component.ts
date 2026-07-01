import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QuotationService } from '../../services/quotation.service';
import { DashboardStats } from '../../models/interfaces';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  isLoading = true;
  viewMode: 'month' | 'all' = 'month';

  currentTime: Date = new Date();
  currentTrm: number | null = null;
  private timerRef: any;

  constructor(
    private quotationService: QuotationService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.startClock();
    this.fetchTrm();
  }

  ngOnDestroy(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
    }
  }

  startClock(): void {
    this.timerRef = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  fetchTrm(): void {
    // API de Datos Abiertos de Colombia
    const url = 'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciahasta%20DESC';
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.currentTrm = parseFloat(data[0].valor);
        }
      },
      error: (err) => console.error('Error fetching TRM', err)
    });
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

  toggleViewMode(mode: 'month' | 'all'): void {
    this.viewMode = mode;
  }
}
