import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SimulatorService, SimulatedRequest } from '../../core/services/simulator.service';
import { NotificationService } from '../../core/services/notification.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="simulator-wrapper fade-in">
      
      <!-- Upper Panel Grid -->
      <div class="upper-grid">
        
        <!-- Column Left: Instability Injector Controls -->
        <section class="control-panel glass-panel">
          <div class="panel-header">
            <h2>Instability Injector Controls</h2>
            <span class="subtitle">Modulate network pipeline parameters in real-time</span>
          </div>

          <div class="control-body">
            <!-- Latency modulation -->
            <div class="slider-group">
              <div class="slider-header">
                <span>Simulated Latency Delay</span>
                <span class="val-badge text-cyan">{{ latency }} ms</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="8000" 
                step="500" 
                [(ngModel)]="latency" 
                (ngModelChange)="onLatencyChange($event)"
              />
              <span class="range-labels"><span>0ms (Instant)</span><span>8s (Deep Timeout)</span></span>
            </div>

            <!-- Error rate modulation -->
            <div class="slider-group">
              <div class="slider-header">
                <span>Simulated Request Drop Rate</span>
                <span class="val-badge text-red">{{ failureRate }}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="90" 
                step="10" 
                [(ngModel)]="failureRate" 
                (ngModelChange)="onFailureRateChange($event)"
              />
              <span class="range-labels"><span>0% (Perfect Connection)</span><span>90% (Severely Degraded)</span></span>
            </div>

            <!-- Toggle connection online/offline -->
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="label">Simulate Complete Offline Outage</span>
                <span class="desc">Instantly drop all outgoing connections</span>
              </div>
              <label class="switch">
                <input 
                  type="checkbox" 
                  [(ngModel)]="offline" 
                  (ngModelChange)="onOfflineChange($event)"
                />
                <span class="slider round"></span>
              </label>
            </div>

            <!-- Auto retry toggle & limits -->
            <div class="retry-config glass-card">
              <div class="toggle-row no-border">
                <div class="toggle-info">
                  <span class="label">Reactive RxJS Auto-Retry</span>
                  <span class="desc">Client auto-retries when connection drops</span>
                </div>
                <label class="switch">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="autoRetry" 
                    (ngModelChange)="onAutoRetryChange($event)"
                  />
                  <span class="slider round"></span>
                </label>
              </div>

              <div class="form-group inline-row" *ngIf="autoRetry">
                <label>Max Retry Attempts</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  [(ngModel)]="retryAttempts" 
                  (ngModelChange)="onRetryAttemptsChange($event)"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Column Right: Live Telemetry Metrics Aggregates -->
        <section class="telemetry-panel glass-panel">
          <div class="panel-header">
            <h2>Real-time Pipeline Telemetry</h2>
            <button class="btn btn-secondary btn-small" (click)="clearQueue()">
              <span class="material-symbols-outlined btn-icon">delete_sweep</span>
              <span>Flush Logs</span>
            </button>
          </div>

          <div class="metrics-dashboard">
            <div class="dashboard-circle-kpi">
              <div class="circle-inner">
                <span class="circle-val cyan-glow">{{ successRate }}%</span>
                <span class="circle-lbl">Success Rate</span>
              </div>
            </div>

            <div class="telemetry-metrics-list">
              <div class="t-metric">
                <span class="lbl">Registered Triggers</span>
                <span class="val">{{ totalRequests }}</span>
              </div>
              <div class="t-metric">
                <span class="lbl">Failed Drops</span>
                <span class="val text-red">{{ failedRequests }}</span>
              </div>
              <div class="t-metric">
                <span class="lbl">Running Latency Avg</span>
                <span class="val text-violet">{{ avgLatency }}ms</span>
              </div>
              <button class="btn btn-cyan trigger-btn" (click)="triggerTestQueries()">
                <span class="material-symbols-outlined">network_ping</span>
                <span>Trigger Stress Test Batch</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- Lower Console: HTTP Request Visual Queue -->
      <section class="queue-console glass-panel">
        <div class="panel-header">
          <h2>Active HTTP Request Monitor</h2>
          <span class="queue-depth-badge" [class.active]="activeQueue.length > 0">
            {{ activeQueue.length }} pending queries
          </span>
        </div>

        <div class="queue-list" *ngIf="activeQueue.length > 0; else emptyQueue">
          <div 
            class="queue-card glass-card fade-in" 
            *ngFor="let req of activeQueue"
            [class]="req.status"
          >
            <div class="req-method-path">
              <span class="method" [class]="req.method.toLowerCase()">{{ req.method }}</span>
              <span class="path">{{ req.url }}</span>
            </div>

            <div class="req-status-telemetry">
              <!-- Pending status -->
              <ng-container *ngIf="req.status === 'pending'">
                <div class="status-pulse-spinner">
                  <span class="pulse-dot"></span>
                  <span>Executing delay ({{ latency }}ms)...</span>
                </div>
              </ng-container>

              <!-- Success status -->
              <ng-container *ngIf="req.status === 'success'">
                <div class="status-success">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>Success in {{ req.latency }}ms</span>
                </div>
              </ng-container>

              <!-- Failed status -->
              <ng-container *ngIf="req.status === 'failed'">
                <div class="status-failed">
                  <span class="material-symbols-outlined">error</span>
                  <span class="err-text" [title]="req.errorMsg">{{ req.errorMsg }} ({{ req.latency }}ms)</span>
                </div>
              </ng-container>

              <!-- Retrying status -->
              <ng-container *ngIf="req.status === 'retrying'">
                <div class="status-retrying">
                  <span class="material-symbols-outlined spin-icon">sync</span>
                  <span>Retrying (Attempt {{ req.retries }}/{{ req.maxRetries }})</span>
                </div>
              </ng-container>
            </div>

            <!-- Elapsed Timer -->
            <div class="elapsed-time">
              <span>{{ getElapsedTime(req) }}s elapsed</span>
            </div>
          </div>
        </div>
        <ng-template #emptyQueue>
          <div class="terminal-empty-view">
            <span class="material-symbols-outlined terminal-icon animate-pulse">settings_ethernet</span>
            <p>Queue idle. Trigger database changes or batch runs to monitor request life cycles.</p>
          </div>
        </ng-template>
      </section>

    </div>
  `,
  styles: [`
    .simulator-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .upper-grid {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 24px;
    }

    .control-panel, .telemetry-panel, .queue-console {
      padding: 24px;
    }

    .panel-header {
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      h2 { font-size: 1.15rem; color: #f8f8f2; }
      .subtitle { font-size: 0.75rem; color: #a0a0b8; }
    }

    /* Sliders and ranges styling */
    .control-body {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .slider-group {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .slider-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        font-weight: 600;
        color: #a0a0b8;
      }

      .val-badge {
        font-family: monospace;
        font-size: 0.9rem;
      }

      input[type="range"] {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
        outline: none;
        
        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00e5ff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
          transition: transform 0.1s;
          &:hover { transform: scale(1.2); }
        }
      }

      .range-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        color: #707085;
      }
    }

    /* Toggle switches */
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(189, 147, 249, 0.1);

      &.no-border { border-bottom: none; padding-bottom: 0; }

      .toggle-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .label { font-size: 0.85rem; font-weight: 600; color: #f8f8f2; }
        .desc { font-size: 0.72rem; color: #a0a0b8; }
      }
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      
      input { opacity: 0; width: 0; height: 0; }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(255,255,255,0.08);
        transition: .3s;
        border: 1px solid rgba(255,255,255,0.1);

        &::before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: #a0a0b8;
          transition: .3s;
        }
      }

      input:checked + .slider {
        background-color: rgba(0, 229, 255, 0.15);
        border-color: #00e5ff;
        
        &::before {
          transform: translateX(20px);
          background-color: #00e5ff;
          box-shadow: 0 0 6px #00e5ff;
        }
      }

      .slider.round {
        border-radius: 24px;
        &::before { border-radius: 50%; }
      }
    }

    .retry-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: rgba(189, 147, 249, 0.02) !important;
      border: 1px dashed rgba(189, 147, 249, 0.15) !important;
      
      .inline-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0;

        label { margin-bottom: 0; }
        input { width: 80px; text-align: center; }
      }
    }

    /* Telemetry indicators */
    .metrics-dashboard {
      display: flex;
      align-items: center;
      gap: 32px;
      height: 100%;
      justify-content: center;
      padding: 10px 0;
    }

    .dashboard-circle-kpi {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: conic-gradient(#00e5ff var(--success-percent, 100%), rgba(255,255,255,0.03) 0);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);

      .circle-inner {
        width: 124px;
        height: 124px;
        border-radius: 50%;
        background: #080610;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        .circle-val {
          font-size: 1.7rem;
          font-weight: 800;
          color: #00e5ff;
        }

        .circle-lbl {
          font-size: 0.65rem;
          color: #a0a0b8;
          text-transform: uppercase;
        }
      }
    }

    .telemetry-metrics-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 180px;

      .t-metric {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        border-bottom: 1px solid rgba(255,255,255,0.03);
        padding-bottom: 4px;

        .lbl { color: #a0a0b8; }
        .val { color: #f8f8f2; font-weight: 600; }
      }

      .trigger-btn {
        margin-top: 8px;
        font-size: 0.75rem;
        padding: 8px;
        justify-content: center;
      }
    }

    /* HTTP request visual queue */
    .queue-depth-badge {
      font-size: 0.7rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      color: #a0a0b8;
      border-radius: 12px;
      padding: 4px 10px;
      text-transform: uppercase;
      font-weight: bold;

      &.active {
        background: rgba(0, 225, 255, 0.08);
        border-color: rgba(0, 225, 255, 0.15);
        color: #00e5ff;
      }
    }

    .queue-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 380px;
      overflow-y: auto;
    }

    .queue-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px !important;
      gap: 16px;

      // Card borders based on status
      &.pending { border-left: 4px solid #ffbd2e !important; }
      &.retrying { border-left: 4px solid #ff7b00 !important; }
      &.success { border-left: 4px solid #00e676 !important; }
      &.failed { border-left: 4px solid #ff1744 !important; }

      .req-method-path {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 40%;
        overflow: hidden;

        .method {
          font-family: monospace;
          font-weight: bold;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          
          &.get { background: rgba(0, 230, 118, 0.1); color: #00e676; }
          &.post { background: rgba(0, 229, 255, 0.1); color: #00e5ff; }
          &.put { background: rgba(157, 78, 221, 0.1); color: #bd93f9; }
          &.delete { background: rgba(255, 23, 68, 0.1); color: #ff1744; }
        }

        .path {
          color: #f8f8f2;
          font-family: monospace;
          font-size: 0.8rem;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        }
      }

      .req-status-telemetry {
        flex: 1;
        font-size: 0.8rem;

        .status-pulse-spinner {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ffbd2e;

          .pulse-dot {
            width: 8px;
            height: 8px;
            background: #ffbd2e;
            border-radius: 50%;
            animation: indicatorPulse 1.2s infinite;
          }
        }

        .status-success {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #00e676;
          span { font-size: 16px; }
        }

        .status-failed {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ff1744;
          overflow: hidden;
          
          span { font-size: 16px; }
          .err-text {
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
            max-width: 250px;
          }
        }

        .status-retrying {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ff7b00;

          span { font-size: 16px; }
          .spin-icon { animation: rotate 2s linear infinite; }
        }
      }

      .elapsed-time {
        font-family: monospace;
        font-size: 0.75rem;
        color: #707085;
      }
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 0.75rem;
      border-radius: 4px;
    }

    .terminal-empty-view {
      padding: 40px;
      text-align: center;
      color: #707085;
      font-size: 0.85rem;

      .terminal-icon { font-size: 40px; color: #bd93f9; margin-bottom: 12px; }
    }

    @keyframes rotate {
      to { transform: rotate(360deg); }
    }

    @keyframes indicatorPulse {
      0% { transform: scale(0.9); opacity: 0.5; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.5; }
    }
  `]
})
export class SimulatorComponent implements OnInit {
  private simulatorService = inject(SimulatorService);
  private toastService = inject(NotificationService);
  private http = inject(HttpClient);

  // Bind values
  public latency = 1500;
  public failureRate = 20;
  public offline = false;
  public autoRetry = true;
  public retryAttempts = 3;

  public activeQueue: SimulatedRequest[] = [];
  public totalRequests = 0;
  public failedRequests = 0;
  public successRate = 100;
  public avgLatency = 0;

  ngOnInit() {
    this.syncParameters();
    this.subscribeToQueue();
  }

  private syncParameters() {
    this.latency = this.simulatorService.latency$.value;
    this.failureRate = this.simulatorService.failureRate$.value;
    this.offline = this.simulatorService.offline$.value;
    this.autoRetry = this.simulatorService.autoRetry$.value;
    this.retryAttempts = this.simulatorService.retryAttempts$.value;
  }

  private subscribeToQueue() {
    this.simulatorService.queue$.subscribe(queue => {
      this.activeQueue = queue;
    });

    this.simulatorService.totalRequests$.subscribe(val => this.totalRequests = val);
    this.simulatorService.failedRequests$.subscribe(val => this.failedRequests = val);
    
    this.simulatorService.successRate$.subscribe(val => {
      this.successRate = val;
      // Inject CSS conic variable dynamically
      document.documentElement.style.setProperty('--success-percent', `${val}%`);
    });
    
    this.simulatorService.avgLatency$.subscribe(val => this.avgLatency = val);
  }

  // Update central states on inputs modification
  public onLatencyChange(val: number) {
    this.simulatorService.setLatency(val);
  }

  public onFailureRateChange(val: number) {
    this.simulatorService.setFailureRate(val);
  }

  public onOfflineChange(val: boolean) {
    this.simulatorService.setOffline(val);
  }

  public onAutoRetryChange(val: boolean) {
    this.simulatorService.setAutoRetry(val);
  }

  public onRetryAttemptsChange(val: number) {
    this.simulatorService.setRetryAttempts(val);
  }

  public clearQueue() {
    this.simulatorService.clearStats();
    this.toastService.show('Queue and counters reset.', 'info');
  }

  // Trigger test queries to demonstrate auto-retry visual paths
  public triggerTestQueries() {
    this.toastService.show('Stress Test: Launching 3 asynchronous database requests.', 'info');
    
    const backendUrl = `${environment.apiUrl}/health`;
    
    // Fire 3 simultaneous requests to trigger UI visual pipeline entries
    forkJoin([
      this.http.get(backendUrl).pipe(catchError(e => of(null))),
      this.http.get(backendUrl).pipe(catchError(e => of(null))),
      this.http.get(backendUrl).pipe(catchError(e => of(null)))
    ]).subscribe();
  }

  public getElapsedTime(req: SimulatedRequest): string {
    const end = req.endTime ? req.endTime : Date.now();
    return ((end - req.startTime) / 1000).toFixed(1);
  }
}
