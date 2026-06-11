import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LaborTime, PaginatedResponse, ApiResponse } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class LaborTimeService {
  private apiUrl = `${environment.apiUrl}/labor-times`;

  constructor(private http: HttpClient) {}

  getLaborTimes(params?: any): Observable<PaginatedResponse<LaborTime>> {
    return this.http.get<PaginatedResponse<LaborTime>>(this.apiUrl, { params });
  }

  getLaborTimeById(id: string): Observable<ApiResponse<LaborTime>> {
    return this.http.get<ApiResponse<LaborTime>>(`${this.apiUrl}/${id}`);
  }

  createLaborTime(laborTime: Partial<LaborTime>): Observable<ApiResponse<LaborTime>> {
    return this.http.post<ApiResponse<LaborTime>>(this.apiUrl, laborTime);
  }

  updateLaborTime(id: string, laborTime: Partial<LaborTime>): Observable<ApiResponse<LaborTime>> {
    return this.http.put<ApiResponse<LaborTime>>(`${this.apiUrl}/${id}`, laborTime);
  }

  deleteLaborTime(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`);
  }
}
