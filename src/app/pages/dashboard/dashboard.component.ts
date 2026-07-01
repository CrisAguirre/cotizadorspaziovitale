import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
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
  trmError = false;
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
    this.trmError = false;
    this.http.get<any[]>(url).pipe(
      timeout(8000),
      catchError((err) => {
        console.error('Error fetching TRM', err);
        this.trmError = true;
        return of(null);
      })
    ).subscribe((data) => {
      if (data && data.length > 0) {
        this.currentTrm = parseFloat(data[0].valor);
      } else if (data === null) {
        // Ya se marcó trmError arriba; no dejamos el indicador colgado en "Cargando..."
      }
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
