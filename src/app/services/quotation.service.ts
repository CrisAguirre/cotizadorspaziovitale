import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Quotation, ApiResponse, PaginatedResponse, DashboardStats } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class QuotationService {
  private apiUrl = `${environment.apiUrl}/quotations`;

  constructor(private http: HttpClient) { }

  getQuotations(params?: any): Observable<PaginatedResponse<Quotation>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Quotation>>(this.apiUrl, { params: httpParams });
  }

  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/stats`);
  }

  getQuotationById(id: string): Observable<ApiResponse<Quotation>> {
    return this.http.get<ApiResponse<Quotation>>(`${this.apiUrl}/${id}`);
  }

  createQuotation(quotation: Partial<Quotation>): Observable<ApiResponse<Quotation>> {
    return this.http.post<ApiResponse<Quotation>>(this.apiUrl, quotation);
  }

  updateQuotation(id: string, quotation: Partial<Quotation>): Observable<ApiResponse<Quotation>> {
    return this.http.put<ApiResponse<Quotation>>(`${this.apiUrl}/${id}`, quotation);
  }

  updateStatus(id: string, status: string): Observable<ApiResponse<Quotation>> {
    return this.http.patch<ApiResponse<Quotation>>(`${this.apiUrl}/${id}/status`, { status });
  }

  duplicateQuotation(id: string): Observable<ApiResponse<Quotation>> {
    return this.http.post<ApiResponse<Quotation>>(`${this.apiUrl}/${id}/duplicate`, {});
  }

  deleteQuotation(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`);
  }
}
