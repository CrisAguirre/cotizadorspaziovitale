import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();
  const expectedRole = route.data?.['expectedRole'];

  if (user && user.role === expectedRole) {
    return true;
  } else {
    // If user is authenticated but not authorized, maybe redirect to dashboard
    if (authService.isAuthenticated()) {
      router.navigate(['/dashboard']);
    } else {
      router.navigate(['/login']);
    }
    return false;
  }
};
