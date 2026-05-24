import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Material, ApiResponse, PaginatedResponse } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private apiUrl = `${environment.apiUrl}/materials`;

  constructor(private http: HttpClient) { }

  getMaterials(params?: any): Observable<PaginatedResponse<Material>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<Material>>(this.apiUrl, { params: httpParams });
  }

  getMaterialById(id: string): Observable<ApiResponse<Material>> {
    return this.http.get<ApiResponse<Material>>(`${this.apiUrl}/${id}`);
  }

  createMaterial(material: Material): Observable<ApiResponse<Material>> {
    return this.http.post<ApiResponse<Material>>(this.apiUrl, material);
  }

  updateMaterial(id: string, material: Partial<Material>): Observable<ApiResponse<Material>> {
    return this.http.put<ApiResponse<Material>>(`${this.apiUrl}/${id}`, material);
  }

  deleteMaterial(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`);
  }
}
