import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecordService } from '../../core/services/record.service';
import { SimulatorService } from '../../core/services/simulator.service';
import { AdminService, AuditEvent } from '../../core/services/admin.service';
import { NotificationService } from '../../core/services/notification.service';
import { Subscription, forkJoin } from 'rxjs';

interface DashboardMetrics {
  totalChecks: number;
  verifiedCases: number;
  pendingCases: number;
  riskAlerts: number;
  verificationSuccessRate: number;
  avgRiskScore: number;
  dbStatus: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-wrapper fade-in">
      
      <!-- Skeleton Loading Shimmer State -->
      <div class="shimmer-grid" *ngIf="loading">
        <div class="shimmer-card glass-panel" *ngFor="let i of [1,2,3,4,5]">
          <div class="shimmer-line header"></div>
          <div class="shimmer-line value"></div>
          <div class="shimmer-line desc"></div>
        </div>
      </div>

      <div class="dashboard-content" *ngIf="!loading">
        <!-- KPI Cards Grid -->
        <section class="kpi-grid">
          <div class="glass-card kpi-card">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined icon-total">folder_shared</span>
            </div>
            <div class="kpi-info">
              <h3>Active Audits</h3>
              <p class="kpi-value">{{ metrics?.totalChecks }}</p>
              <span class="kpi-desc">Total Background Files</span>
            </div>
          </div>

          <div class="glass-card kpi-card">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined icon-verified">verified_user</span>
            </div>
            <div class="kpi-info">
              <h3>Verified Credentials</h3>
              <p class="kpi-value text-green">{{ metrics?.verifiedCases }}</p>
              <span class="kpi-desc">Checks 100% Complete</span>
            </div>
          </div>

          <div class="glass-card kpi-card">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined icon-pending">hourglass_empty</span>
            </div>
            <div class="kpi-info">
              <h3>In Queue</h3>
              <p class="kpi-value text-cyan">{{ metrics?.pendingCases }}</p>
              <span class="kpi-desc">Verification Pending</span>
            </div>
          </div>

          <div class="glass-card kpi-card">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined icon-alert">gpp_maybe</span>
            </div>
            <div class="kpi-info">
              <h3>Risk Alerts</h3>
              <p class="kpi-value text-red">{{ metrics?.riskAlerts }}</p>
              <span class="kpi-desc">Flags Above 70% Limit</span>
            </div>
          </div>

          <div class="glass-card kpi-card">
            <div class="kpi-icon-box">
              <span class="material-symbols-outlined icon-rate">percent</span>
            </div>
            <div class="kpi-info">
              <h3>Success Yield</h3>
              <p class="kpi-value text-violet">{{ metrics?.verificationSuccessRate }}%</p>
              <span class="kpi-desc">Historical Validation Rate</span>
            </div>
          </div>
        </section>

        <!-- Dynamic Visuals & Telemetry Grid -->
        <div class="detail-grid">
          
          <!-- Column Left: Visual Analytics Metrics & Distribution -->
          <div class="detail-col glass-panel distribution-panel">
            <div class="panel-header">
              <h2>Verification State Progression</h2>
              <span class="subtitle">Operational status breakdowns</span>
            </div>
            
            <div class="distribution-bars">
              <div class="bar-row" *ngFor="let item of statusDistributionKeys">
                <div class="bar-label">
                  <span class="status-name">{{ item }}</span>
                  <span class="status-val">{{ getStatusCount(item) }}</span>
                </div>
                <div class="bar-container">
                  <div 
                    class="bar-fill" 
                    [class]="getStatusClass(item)" 
                    [style.width.%]="getStatusPercent(item)"
                  ></div>
                </div>
              </div>
            </div>

            <div class="analytics-submetrics">
              <div class="submetric">
                <span class="submetric-name">Average Profile Risk</span>
                <span class="submetric-value" [class.text-red]="(metrics?.avgRiskScore ?? 0) > 50">{{ metrics?.avgRiskScore }}%</span>
              </div>
              <div class="submetric">
                <span class="submetric-name">Verification Flow Output</span>
                <span class="submetric-value text-cyan">Optimized</span>
              </div>
            </div>
          </div>

          <!-- Column Right: Network Resilience & Backend Telemetry -->
          <div class="detail-col glass-panel telemetry-panel">
            <div class="panel-header">
              <h2>System Observability Indicators</h2>
              <span class="status-indicator-pill">
                <span class="dot active"></span> Live Telemetry
              </span>
            </div>

            <div class="health-simulator">
              <div class="health-metric">
                <div class="icon-circle">
                  <span class="material-symbols-outlined">database</span>
                </div>
                <div class="health-details">
                  <span class="label">Database Gateway</span>
                  <span class="value cyan-glow">{{ metrics?.dbStatus }}</span>
                </div>
              </div>

              <div class="health-metric">
                <div class="icon-circle">
                  <span class="material-symbols-outlined">speed</span>
                </div>
                <div class="health-details">
                  <span class="label">Average API Latency</span>
                  <span class="value text-violet">{{ avgLatency }}ms</span>
                </div>
              </div>

              <div class="health-metric">
                <div class="icon-circle">
                  <span class="material-symbols-outlined">queue</span>
                </div>
                <div class="health-details">
                  <span class="label">Pending Queue Depth</span>
                  <span class="value" [class.text-cyan]="activeRequestsCount > 0">{{ activeRequestsCount }} Actions</span>
                </div>
              </div>

              <div class="health-metric">
                <div class="icon-circle">
                  <span class="material-symbols-outlined">network_ping</span>
                </div>
                <div class="health-details">
                  <span class="label">API Success Target</span>
                  <span class="value text-green">{{ successRate }}%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Audit Event Stream Timeline -->
        <section class="timeline-section glass-panel">
          <div class="panel-header">
            <h2>Recent Operations Ledger</h2>
            <p class="subtitle">Log events from core backend audits</p>
          </div>
          
          <div class="audit-list" *ngIf="recentAudits.length > 0; else noAudits">
            <div class="audit-row" *ngFor="let audit of recentAudits">
              <span class="time">{{ audit.timestamp | date:'HH:mm:ss' }}</span>
              <div class="action-tag" [class]="getAuditClass(audit.action)">{{ audit.action }}</div>
              <span class="user">{{ audit.user.split('@')[0] }}</span>
              <span class="desc">{{ audit.details }}</span>
            </div>
          </div>
          <ng-template #noAudits>
            <div class="no-data-msg">No platform actions recorded yet.</div>
          </ng-template>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* KPI grid styling */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }

    .kpi-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;

      span {
        font-size: 24px;
      }
      .icon-total { color: #a0a0b8; }
      .icon-verified { color: #00e676; }
      .icon-pending { color: #00e5ff; }
      .icon-alert { color: #ff1744; }
      .icon-rate { color: #bd93f9; }
    }

    .kpi-info {
      display: flex;
      flex-direction: column;

      h3 {
        font-size: 0.75rem;
        color: #a0a0b8;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .kpi-value {
        font-size: 1.6rem;
        font-weight: 800;
        color: #f8f8f2;
        line-height: 1.2;
      }

      .kpi-desc {
        font-size: 0.65rem;
        color: #707085;
      }
    }

    /* Color utility text */
    .text-green { color: #00e676 !important; }
    .text-cyan { color: #00e5ff !important; }
    .text-red { color: #ff1744 !important; }
    .text-violet { color: #bd93f9 !important; }

    /* Detailed grid layouts */
    .detail-grid {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .detail-col {
      padding: 24px;
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      h2 {
        font-size: 1.1rem;
        font-weight: 700;
        color: #f8f8f2;
      }

      .subtitle {
        font-size: 0.75rem;
        color: #a0a0b8;
      }
    }

    /* Status progress bars */
    .distribution-bars {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
    }

    .bar-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .bar-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 500;

      .status-name { color: #a0a0b8; }
      .status-val { color: #f8f8f2; font-weight: 600; }
    }

    .bar-container {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 3px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.8s ease-in-out;
      width: 0%;

      &.c-created { background: #a0a0b8; }
      &.c-submitted { background: #00e5ff; }
      &.c-check { background: #bd93f9; }
      &.c-review { background: #ffc107; }
      &.c-verified { background: #00e676; }
    }

    .analytics-submetrics {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(189, 147, 249, 0.1);
      display: flex;
      justify-content: space-between;

      .submetric {
        display: flex;
        flex-direction: column;
        
        .submetric-name {
          font-size: 0.7rem;
          color: #a0a0b8;
          text-transform: uppercase;
        }
        .submetric-value {
          font-size: 1.1rem;
          font-weight: 700;
        }
      }
    }

    /* Telemetry health cards */
    .status-indicator-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(13, 242, 255, 0.08);
      color: #00e5ff;
      border: 1px solid rgba(13, 242, 255, 0.15);
      border-radius: 12px;
      padding: 4px 10px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;

      .dot {
        width: 6px;
        height: 6px;
        background: #00e5ff;
        border-radius: 50%;
        animation: indicatorPulse 2s infinite;
      }
    }

    .health-simulator {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
      justify-content: center;
    }

    .health-metric {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.03);

      .icon-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(189, 147, 249, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        span { font-size: 18px; color: #bd93f9; }
      }

      .health-details {
        display: flex;
        flex-direction: column;

        .label {
          font-size: 0.7rem;
          color: #a0a0b8;
          text-transform: uppercase;
        }
        .value {
          font-size: 0.9rem;
          font-weight: 700;
          color: #f8f8f2;
        }
      }
    }

    /* Timeline events */
    .timeline-section {
      padding: 24px;
    }

    .audit-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 250px;
      overflow-y: auto;
    }

    .audit-row {
      display: flex;
      align-items: center;
      font-size: 0.8rem;
      padding: 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.03);
      gap: 16px;

      .time {
        color: #707085;
        font-weight: bold;
      }

      .action-tag {
        font-size: 0.65rem;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 700;
        text-transform: uppercase;
        width: 170px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &.a-login { background: rgba(0, 230, 118, 0.1); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.2); }
        &.a-create { background: rgba(0, 229, 255, 0.1); color: #00e5ff; border: 1px solid rgba(0, 229, 255, 0.2); }
        &.a-status { background: rgba(189, 147, 249, 0.1); color: #bd93f9; border: 1px solid rgba(189, 147, 249, 0.2); }
        &.a-delete { background: rgba(255, 23, 68, 0.1); color: #ff1744; border: 1px solid rgba(255, 23, 68, 0.2); }
        &.a-other { background: rgba(255, 255, 255, 0.05); color: #a0a0b8; border: 1px solid rgba(255, 255, 255, 0.1); }
      }

      .user {
        color: #bd93f9;
        font-weight: 600;
        width: 80px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .desc {
        color: #f8f8f2;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .no-data-msg {
      padding: 20px;
      text-align: center;
      color: #707085;
      font-size: 0.85rem;
    }

    /* Shimmer Skeleton Loaders style */
    .shimmer-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .shimmer-card {
      height: 104px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    .shimmer-line {
      height: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
        animation: shimmerSwipe 1.5s infinite;
      }

      &.header { width: 50%; }
      &.value { width: 30%; height: 20px; }
      &.desc { width: 70%; }
    }

    @keyframes shimmerSwipe {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private recordService = inject(RecordService);
  private simulatorService = inject(SimulatorService);
  private adminService = inject(AdminService);
  private toastService = inject(NotificationService);

  public loading = true;
  public metrics: DashboardMetrics | null = null;
  public statusDistribution: any = {};
  public recentAudits: AuditEvent[] = [];

  // Observability references
  public activeRequestsCount = 0;
  public successRate = 100;
  public avgLatency = 0;

  public statusDistributionKeys: string[] = ['Created', 'Documents Submitted', 'Background Check', 'Under Review', 'Verified'];

  private subGroup = new Subscription();

  ngOnInit() {
    this.fetchData();
    this.subscribeToTelemetry();
  }

  ngOnDestroy() {
    this.subGroup.unsubscribe();
  }

  public fetchData() {
    this.loading = true;
    
    // Resolve analytics and logs concurrently
    forkJoin({
      analytics: this.recordService.getAnalytics(),
      audits: this.adminService.getAuditLogs()
    }).subscribe({
      next: (res: any) => {
        this.metrics = res.analytics.metrics;
        this.statusDistribution = res.analytics.statusDistribution;
        this.recentAudits = res.audits.logs.slice(0, 5); // Take top 5
        this.loading = false;
      },
      error: () => {
        this.toastService.show('Failed to sync dashboard states from API.', 'error');
        this.loading = false;
      }
    });
  }

  private subscribeToTelemetry() {
    // Monitor request visualizer counts
    this.subGroup.add(
      this.simulatorService.queue$.subscribe(queue => {
        this.activeRequestsCount = queue.filter(r => r.status === 'pending' || r.status === 'retrying').length;
      })
    );

    this.subGroup.add(
      this.simulatorService.successRate$.subscribe(rate => {
        this.successRate = rate;
      })
    );

    this.subGroup.add(
      this.simulatorService.avgLatency$.subscribe(avg => {
        this.avgLatency = avg;
      })
    );
  }

  // Visual helper calculations
  public getStatusCount(status: string): number {
    return this.statusDistribution[status] || 0;
  }

  public getStatusPercent(status: string): number {
    const total = this.metrics?.totalChecks || 0;
    if (total === 0) return 0;
    return Math.round((this.getStatusCount(status) / total) * 100);
  }

  public getStatusClass(status: string): string {
    if (status === 'Created') return 'c-created';
    if (status === 'Documents Submitted') return 'c-submitted';
    if (status === 'Background Check') return 'c-check';
    if (status === 'Under Review') return 'c-review';
    return 'c-verified';
  }

  public getAuditClass(action: string): string {
    if (action.includes('LOGIN')) return 'a-login';
    if (action.includes('CREATED')) return 'a-create';
    if (action.includes('STATUS') || action.includes('WORKFLOW')) return 'a-status';
    if (action.includes('DELETED')) return 'a-delete';
    return 'a-other';
  }
}
