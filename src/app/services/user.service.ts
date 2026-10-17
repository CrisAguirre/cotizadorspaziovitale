import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  constructor(private http: HttpClient) {}
  getUsers(): Observable<ApiResponse<{ email: string; role: string }[]>> {
    return this.http.get<ApiResponse<{ email: string; role: string }[]>>(this.apiUrl);
  }
}
