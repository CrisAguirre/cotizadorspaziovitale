import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/login`;

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    return this.http.post(this.apiUrl, credentials, { withCredentials: true });
  }

  saveUser(user: any, expiresAt?: number): void {
    localStorage.setItem('user', JSON.stringify(user));
    if (expiresAt) {
      localStorage.setItem('expiresAt', expiresAt.toString());
    }
  }

  getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    const hasUser = !!localStorage.getItem('user');
    const expiresAt = localStorage.getItem('expiresAt');
    
    if (hasUser && expiresAt) {
      const isExpired = Date.now() > parseInt(expiresAt, 10);
      if (isExpired) {
        this.logout();
        return false;
      }
      return true;
    }
    
    return hasUser;
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('expiresAt');
  }

  logoutApi(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/logout`, {}, { withCredentials: true });
  }

  getActivities(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/activities`, { withCredentials: true });
  }
}
