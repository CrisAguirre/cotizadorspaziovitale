import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Material, ApiResponse, PaginatedResponse } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private apiUrl = `${environment.apiUrl}/materials`;
  
  private allMaterials: Material[] = [];
  public isPreloaded$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) { }

  preloadAllMaterials(): Observable<PaginatedResponse<Material>> {
    const params = new HttpParams().set('limit', '10000').set('active', 'true');
    return this.http.get<PaginatedResponse<Material>>(this.apiUrl, { params }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.allMaterials = res.data;
          this.isPreloaded$.next(true);
        }
      })
    );
  }

  findExactOrBestMatch(keyword: string): Material | undefined {
    if (!this.allMaterials || this.allMaterials.length === 0) return undefined;
    const lowerQ = keyword.toLowerCase();
    
    // First try exact match
    let match = this.allMaterials.find(m => m.description.toLowerCase() === lowerQ);
    if (match) return match;

    // Then try includes
    match = this.allMaterials.find(m => m.description.toLowerCase().includes(lowerQ));
    return match;
  }

  searchLocalMaterials(query: string, limit: number = 12, category?: string): Observable<PaginatedResponse<Material>> {
    // Si aún no se han precargado, simplemente caeremos en un filtro vacío o podríamos esperar, 
    // pero para no bloquear, si no hay datos devolveremos vacío (o podríamos usar el API real si preferimos).
    if (!this.isPreloaded$.value) {
      return this.getMaterials({ search: query, limit, category, active: 'true' });
    }

    let filtered = this.allMaterials;
    
    if (category) {
      const cats = category.split(',').map(c => c.trim());
      filtered = filtered.filter(m => cats.includes(m.category));
    }

    if (query && query.length >= 2) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(m => 
        m.description.toLowerCase().includes(lowerQuery) ||
        m.code.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort: los que empiezan con el query primero (opcional pero ayuda a la velocidad de UX)
    if (query) {
       const lowerQ = query.toLowerCase();
       filtered.sort((a, b) => {
         const aStarts = a.description.toLowerCase().startsWith(lowerQ) || a.code.toLowerCase().startsWith(lowerQ);
         const bStarts = b.description.toLowerCase().startsWith(lowerQ) || b.code.toLowerCase().startsWith(lowerQ);
         if (aStarts && !bStarts) return -1;
         if (!aStarts && bStarts) return 1;
         return 0;
       });
    }

    const sliced = filtered.slice(0, limit);
    
    return of({
      success: true,
      data: sliced,
      pagination: {
        total: filtered.length,
        page: 1,
        limit,
        pages: Math.ceil(filtered.length / limit)
      }
    });
  }

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

  bulkUpsert(materials: Material[], replaceProvider?: string): Observable<ApiResponse<{ created: number; updated: number; total: number }>> {
    return this.http.post<ApiResponse<{ created: number; updated: number; total: number }>>(
      `${this.apiUrl}/bulk-upsert`,
      { materials, replaceProvider }
    );
  }

  getProviders(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/providers`);
  }
}
