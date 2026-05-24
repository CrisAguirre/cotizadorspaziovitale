import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppConfig, ApiResponse } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl = `${environment.apiUrl}/config`;

  constructor(private http: HttpClient) { }

  getConfig(): Observable<ApiResponse<AppConfig>> {
    return this.http.get<ApiResponse<AppConfig>>(this.apiUrl);
  }

  updateConfig(config: Partial<AppConfig>): Observable<ApiResponse<AppConfig>> {
    return this.http.put<ApiResponse<AppConfig>>(this.apiUrl, config);
  }

  getNextQuotationNumber(): Observable<ApiResponse<{number: number}>> {
    return this.http.get<ApiResponse<{number: number}>>(`${this.apiUrl}/next-number`);
  }
}
