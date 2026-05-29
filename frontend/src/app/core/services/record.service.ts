import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CandidateRecord {
  _id: string;
  name: string;
  email: string;
  status: 'Created' | 'Documents Submitted' | 'Background Check' | 'Under Review' | 'Verified';
  riskScore: number;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecordService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {}

  public getRecords(): Observable<{ success: boolean; records: CandidateRecord[] }> {
    return this.http.get<{ success: boolean; records: CandidateRecord[] }>(`${this.apiUrl}/records`);
  }

  public createRecord(name: string, email: string, riskScore?: number): Observable<{ success: boolean; record: CandidateRecord }> {
    return this.http.post<{ success: boolean; record: CandidateRecord }>(`${this.apiUrl}/records`, { name, email, riskScore });
  }

  public updateRecordDetails(id: string, name: string, email: string, riskScore: number): Observable<{ success: boolean; record: CandidateRecord }> {
    return this.http.put<{ success: boolean; record: CandidateRecord }>(`${this.apiUrl}/records/${id}`, { name, email, riskScore });
  }

  public updateRecordStatus(id: string, status: string): Observable<{ success: boolean; record: CandidateRecord }> {
    return this.http.put<{ success: boolean; record: CandidateRecord }>(`${this.apiUrl}/records/${id}/status`, { status });
  }

  public deleteRecord(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/records/${id}`);
  }

  public getAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analytics`);
  }
}
