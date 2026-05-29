import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Client-side JWT Decoder Helper
function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('verix_auth_token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // Token exists, check expiration
  const payload = decodeJwt(token);
  if (!payload || (payload.exp && Date.now() >= payload.exp * 1000)) {
    localStorage.removeItem('verix_auth_token');
    localStorage.removeItem('verix_user_role');
    localStorage.removeItem('verix_user_email');
    router.navigate(['/login']);
    return false;
  }

  return true;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('verix_auth_token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const payload = decodeJwt(token);
  if (!payload || payload.role !== 'admin') {
    // Redirect to dashboard if user has general access but not admin privileges
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
