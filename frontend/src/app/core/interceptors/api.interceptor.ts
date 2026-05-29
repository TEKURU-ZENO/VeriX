import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { tap, catchError, retry } from 'rxjs/operators';
import { SimulatorService } from '../services/simulator.service';

export const apiInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const simulatorService = inject(SimulatorService);
  const token = localStorage.getItem('verix_auth_token');

  // Only intercept requests directed to our API gateway
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  // Get active configurations from simulator state
  const latency = simulatorService.latency$.value;
  const failureRate = simulatorService.failureRate$.value;
  const offline = simulatorService.offline$.value;
  const autoRetry = simulatorService.autoRetry$.value;
  const retryAttempts = simulatorService.retryAttempts$.value;

  // Clone request to inject credentials and simulator control headers
  let headers = req.headers
    .set('x-simulate-latency', latency.toString())
    .set('x-simulate-failure', failureRate.toString())
    .set('x-simulate-offline', offline ? 'true' : 'false');

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const clonedReq = req.clone({ headers });

  // Generate a telemetry tracker ID
  const reqId = 'req_' + Math.random().toString(36).substring(2, 9);
  simulatorService.registerRequest(reqId, req.url, req.method);

  return next(clonedReq).pipe(
    tap((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse) {
        simulatorService.markSuccess(reqId);
      }
    }),
    retry({
      count: autoRetry ? retryAttempts : 0,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        simulatorService.markRetrying(reqId, retryCount);
        // Stagger retry attempts by 1.2 seconds to give network space
        return timer(1200);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const errorMsg = error.error?.message || error.statusText || 'Simulated response drop';
      simulatorService.markFailed(reqId, errorMsg);
      return throwError(() => error);
    })
  );
};
