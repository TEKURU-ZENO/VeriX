import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserAccount {
  _id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface AuditEvent {
  _id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {}

  // User Administration CRUD
  public getUsers(): Observable<{ success: boolean; users: UserAccount[] }> {
    return this.http.get<{ success: boolean; users: UserAccount[] }>(`${this.apiUrl}/users`);
  }

  public createUser(userData: any): Observable<{ success: boolean; user: UserAccount }> {
    return this.http.post<{ success: boolean; user: UserAccount }>(`${this.apiUrl}/users`, userData);
  }

  public updateUser(id: string, updates: any): Observable<{ success: boolean; user: UserAccount }> {
    return this.http.put<{ success: boolean; user: UserAccount }>(`${this.apiUrl}/users/${id}`, updates);
  }

  public deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/users/${id}`);
  }

  // System Audit Trackers
  public getAuditLogs(): Observable<{ success: boolean; logs: AuditEvent[] }> {
    return this.http.get<{ success: boolean; logs: AuditEvent[] }>(`${this.apiUrl}/audit`);
  }
}
