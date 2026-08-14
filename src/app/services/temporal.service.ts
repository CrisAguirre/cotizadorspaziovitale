import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, retry, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TemporalData {
  _id?: string;
  clientName: string;
  currentStepName: string;
  currentStepNumber: number;
  data: any;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TemporalService {
  private apiUrl = `${environment.apiUrl}/temporals`;
  private temporalsSubject = new BehaviorSubject<TemporalData[]>([]);
  public temporals$ = this.temporalsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refreshTemporals();
  }

  refreshTemporals(): void {
    this.http.get<{success: boolean, data: TemporalData[]}>(this.apiUrl).subscribe({
      next: (res) => {
        if (res.success) {
          this.temporalsSubject.next(res.data);
        }
      },
      error: (err) => console.error('Error fetching temporals', err)
    });
  }

  getTemporal(id: string): Observable<{success: boolean, data: TemporalData}> {
    return this.http.get<{success: boolean, data: TemporalData}>(`${this.apiUrl}/${id}`);
  }

  saveTemporal(temporal: TemporalData): Observable<{success: boolean, data: TemporalData}> {
    return this.http.post<{success: boolean, data: TemporalData}>(this.apiUrl, temporal).pipe(
      tap(() => this.refreshTemporals())
    );
  }

  deleteTemporal(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      retry({ count: 3, delay: 1000 }),
      catchError((err) => {
        console.error('No se pudo eliminar el temporal', err);
        return of(null);
      }),
      tap(() => this.refreshTemporals())
    );
  }
}
