import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Solo adjuntamos credenciales (cookie httpOnly) en peticiones hacia NUESTRO backend.
    // Peticiones a APIs externas (ej. TRM de datos.gov.co) deben viajar sin withCredentials,
    // de lo contrario el navegador las bloquea por CORS (el servidor externo no responde
    // con Access-Control-Allow-Credentials) y la petición nunca resuelve.
    const isOwnBackend = request.url.startsWith(environment.apiUrl);

    if (isOwnBackend) {
      request = request.clone({
        withCredentials: true
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token expirado o no válido
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
