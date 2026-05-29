import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface UserSession {
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<UserSession | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.restoreSession();
  }

  public get currentUserValue(): UserSession | null {
    return this.currentUserSubject.value;
  }

  public login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res.success && res.token) {
          localStorage.setItem('verix_auth_token', res.token);
          localStorage.setItem('verix_user_role', res.user.role);
          localStorage.setItem('verix_user_email', res.user.email);
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  public logout() {
    localStorage.removeItem('verix_auth_token');
    localStorage.removeItem('verix_user_role');
    localStorage.removeItem('verix_user_email');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  public checkSessionValidity(): Observable<boolean> {
    const token = localStorage.getItem('verix_auth_token');
    if (!token) return of(false);

    return this.http.get<any>(`${this.apiUrl}/session`).pipe(
      map(res => {
        if (res.success) {
          this.currentUserSubject.next(res.user);
          return true;
        }
        this.logout();
        return false;
      }),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  private restoreSession() {
    const token = localStorage.getItem('verix_auth_token');
    const role = localStorage.getItem('verix_user_role');
    const email = localStorage.getItem('verix_user_email');

    if (token && role && email) {
      this.currentUserSubject.next({
        email,
        role: role as 'admin' | 'user',
        status: 'active'
      });
      // Verify with backend silently
      this.checkSessionValidity().subscribe();
    }
  }
}
