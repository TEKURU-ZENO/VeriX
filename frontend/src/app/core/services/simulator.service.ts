import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SimulatedRequest {
  id: string;
  url: string;
  method: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  retries: number;
  maxRetries: number;
  latency: number;
  startTime: number;
  endTime?: number;
  errorMsg?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SimulatorService {
  // Simulator Parameters
  public latency$ = new BehaviorSubject<number>(1500); // Default 1.5s
  public failureRate$ = new BehaviorSubject<number>(20); // Default 20%
  public offline$ = new BehaviorSubject<boolean>(false);
  public autoRetry$ = new BehaviorSubject<boolean>(true);
  public retryAttempts$ = new BehaviorSubject<number>(3); // Default 3 retries

  // Live Request Queue Telemetry
  private requestQueue: SimulatedRequest[] = [];
  public queue$ = new BehaviorSubject<SimulatedRequest[]>([]);

  // Telemetry Aggregates
  public totalRequests$ = new BehaviorSubject<number>(0);
  public failedRequests$ = new BehaviorSubject<number>(0);
  public successRate$ = new BehaviorSubject<number>(100);
  public avgLatency$ = new BehaviorSubject<number>(0);

  private latencySum = 0;
  private latencyCount = 0;

  constructor() {}

  // Simulator controls setting helpers
  public setLatency(val: number) {
    this.latency$.next(val);
  }

  public setFailureRate(val: number) {
    this.failureRate$.next(val);
  }

  public setOffline(val: boolean) {
    this.offline$.next(val);
  }

  public setAutoRetry(val: boolean) {
    this.autoRetry$.next(val);
  }

  public setRetryAttempts(val: number) {
    this.retryAttempts$.next(val);
  }

  // Telemetry registration helpers
  public registerRequest(id: string, url: string, method: string): SimulatedRequest {
    const newReq: SimulatedRequest = {
      id,
      url: url.replace(/https?:\/\/[^\/]+/, ''), // Get relative endpoint
      method,
      status: 'pending',
      retries: 0,
      maxRetries: this.autoRetry$.value ? this.retryAttempts$.value : 0,
      latency: 0,
      startTime: Date.now()
    };

    this.requestQueue = [newReq, ...this.requestQueue].slice(0, 30); // Keep last 30 requests
    this.queue$.next(this.requestQueue);
    this.totalRequests$.next(this.totalRequests$.value + 1);
    return newReq;
  }

  public markRetrying(id: string, attempt: number) {
    const req = this.requestQueue.find(r => r.id === id);
    if (req) {
      req.status = 'retrying';
      req.retries = attempt;
      this.queue$.next([...this.requestQueue]);
    }
  }

  public markSuccess(id: string) {
    const req = this.requestQueue.find(r => r.id === id);
    if (req) {
      req.status = 'success';
      req.endTime = Date.now();
      req.latency = req.endTime - req.startTime;

      // Update running latency averages
      this.latencySum += req.latency;
      this.latencyCount += 1;
      this.avgLatency$.next(Math.round(this.latencySum / this.latencyCount));

      this.queue$.next([...this.requestQueue]);
      this.recalculateSuccessRate();
    }
  }

  public markFailed(id: string, errorMsg: string) {
    const req = this.requestQueue.find(r => r.id === id);
    if (req) {
      req.status = 'failed';
      req.endTime = Date.now();
      req.latency = req.endTime - req.startTime;
      req.errorMsg = errorMsg;

      this.failedRequests$.next(this.failedRequests$.value + 1);
      this.queue$.next([...this.requestQueue]);
      this.recalculateSuccessRate();
    }
  }

  public clearStats() {
    this.requestQueue = [];
    this.queue$.next([]);
    this.totalRequests$.next(0);
    this.failedRequests$.next(0);
    this.successRate$.next(100);
    this.avgLatency$.next(0);
    this.latencySum = 0;
    this.latencyCount = 0;
  }

  private recalculateSuccessRate() {
    const total = this.totalRequests$.value;
    const failed = this.failedRequests$.value;
    if (total === 0) {
      this.successRate$.next(100);
    } else {
      const rate = Math.round(((total - failed) / total) * 100);
      this.successRate$.next(rate);
    }
  }
}
