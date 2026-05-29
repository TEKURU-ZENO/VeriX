import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecordService, CandidateRecord } from '../../core/services/record.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="records-wrapper fade-in">
      
      <!-- Operational Filters Toolbar -->
      <section class="toolbar glass-panel">
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search candidates by name or email..."
            (ngModelChange)="applyFilters()"
          />
        </div>

        <div class="filter-controls">
          <div class="select-wrapper">
            <span class="material-symbols-outlined select-icon">filter_list</span>
            <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
              <option value="">All Workflow States</option>
              <option value="Created">Created</option>
              <option value="Documents Submitted">Documents Submitted</option>
              <option value="Background Check">Background Check</option>
              <option value="Under Review">Under Review</option>
              <option value="Verified">Verified</option>
            </select>
          </div>

          <div class="select-wrapper">
            <span class="material-symbols-outlined select-icon">warning</span>
            <select [(ngModel)]="riskFilter" (ngModelChange)="applyFilters()">
              <option value="">All Risk Ratings</option>
              <option value="low">Low Risk (< 30%)</option>
              <option value="medium">Medium Risk (30% - 70%)</option>
              <option value="high">High Risk (> 70%)</option>
            </select>
          </div>

          <button class="btn btn-secondary" (click)="exportCsv()" title="Download CSV report">
            <span class="material-symbols-outlined">download</span>
            <span>Export CSV</span>
          </button>

          <button class="btn btn-cyan" (click)="openAddModal()">
            <span class="material-symbols-outlined font-icon">person_add</span>
            <span>Initiate Check</span>
          </button>
        </div>
      </section>

      <!-- Main Candidate Data Grid -->
      <div class="table-container glass-panel">
        <table class="glass-table" *ngIf="filteredRecords.length > 0; else emptyState">
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Email Identifier</th>
              <th>Workflow Status</th>
              <th>Risk Assessment</th>
              <th>Last Checked</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              *ngFor="let record of paginatedRecords" 
              (click)="openWorkflowDrawer(record)"
              class="clickable-row"
              [class.active-row]="selectedCandidate?._id === record._id"
            >
              <td>
                <div class="name-col">
                  <span class="material-symbols-outlined account-avatar">account_circle</span>
                  <span class="name">{{ record.name }}</span>
                </div>
              </td>
              <td>{{ record.email }}</td>
              <td>
                <span class="status-badge" [class]="getStatusClass(record.status)">
                  {{ record.status }}
                </span>
              </td>
              <td>
                <div class="risk-gauge-container">
                  <div class="risk-bar-bg">
                    <div 
                      class="risk-bar-fill" 
                      [style.width.%]="record.riskScore"
                      [class]="getRiskColorClass(record.riskScore)"
                    ></div>
                  </div>
                  <span class="risk-score" [class]="getRiskTextClass(record.riskScore)">
                    {{ record.riskScore }}%
                  </span>
                </div>
              </td>
              <td>{{ record.updatedAt | date:'mediumDate' }}</td>
              <td class="table-actions" (click)="$event.stopPropagation()">
                <button class="action-btn" (click)="openEditModal(record)" title="Modify details">
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button 
                  class="action-btn delete-btn" 
                  *ngIf="isAdmin" 
                  (click)="deleteCandidate(record._id)"
                  title="Remove record file"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <ng-template #emptyState>
          <div class="empty-state">
            <span class="material-symbols-outlined empty-icon">folder_open</span>
            <p>No active verification records match the selection.</p>
          </div>
        </ng-template>

        <!-- Pagination Footer -->
        <div class="table-pagination" *ngIf="filteredRecords.length > 0">
          <span class="pager-info">Showing {{ (currentPage-1)*pageSize + 1 }} - {{ getMinCount() }} of {{ filteredRecords.length }}</span>
          <div class="pager-buttons">
            <button [disabled]="currentPage === 1" (click)="changePage(-1)" class="action-btn">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <span class="page-num">{{ currentPage }}</span>
            <button [disabled]="currentPage >= maxPage()" (click)="changePage(1)" class="action-btn">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Add/Edit Candidate Form Modal -->
      <div class="modal-backdrop" *ngIf="isModalOpen" (click)="closeModal()">
        <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
          <h2>{{ modalMode === 'add' ? 'Initiate Verification File' : 'Update Candidate Details' }}</h2>
          <form (ngSubmit)="saveCandidate()">
            <div class="form-group">
              <label>Full Candidate Name</label>
              <input type="text" [(ngModel)]="formName" name="formName" required placeholder="e.g. John Doe" />
            </div>

            <div class="form-group">
              <label>Security Email Address</label>
              <input type="email" [(ngModel)]="formEmail" name="formEmail" required placeholder="e.g. john.doe@example.com" />
            </div>

            <div class="form-group">
              <label>Risk Assessment Override (%)</label>
              <input type="number" [(ngModel)]="formRisk" name="formRisk" min="0" max="100" placeholder="Optional: 0-100" />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-cyan">Save Profile</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Sliding Side Drawer: Verification Workflow Engine -->
      <div class="drawer-backdrop" *ngIf="isDrawerOpen" (click)="closeDrawer()">
        <div class="drawer-container glass-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h2>Workflow Pipeline Engine</h2>
            <button class="action-btn" (click)="closeDrawer()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="drawer-body" *ngIf="selectedCandidate">
            <!-- Candidate Meta Card -->
            <div class="candidate-meta-card">
              <div class="avatar">{{ selectedCandidate.name.charAt(0) }}</div>
              <div class="info">
                <h3>{{ selectedCandidate.name }}</h3>
                <span class="email">{{ selectedCandidate.email }}</span>
              </div>
              <div class="risk-badge" [class]="getRiskColorClass(selectedCandidate.riskScore)">
                {{ selectedCandidate.riskScore }}%
              </div>
            </div>

            <!-- Detailed Check Audit Parameters Panel -->
            <div class="audit-details-panel glass-card">
              <h4>Verification Component Audit</h4>
              <div class="detail-row">
                <span class="label">Reference ID</span>
                <span class="value monospace">{{ selectedCandidate._id }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Initiation Date</span>
                <span class="value">{{ selectedCandidate.updatedAt | date:'mediumDate' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Identity Validation</span>
                <span class="value text-green"><span class="bullet-indicator active"></span>Verified</span>
              </div>
              <div class="detail-row">
                <span class="label">Criminal Registry Audit</span>
                <span class="value" [class.text-red]="selectedCandidate.riskScore > 70" [class.text-green]="selectedCandidate.riskScore <= 70">
                  <span class="bullet-indicator" [class.active]="selectedCandidate.riskScore <= 70" [class.failed]="selectedCandidate.riskScore > 70"></span>
                  {{ selectedCandidate.riskScore > 70 ? 'Flagged (Attention Needed)' : 'Cleared (No Records)' }}
                </span>
              </div>
              <div class="detail-row">
                <span class="label">Academic Credentials</span>
                <span class="value text-green"><span class="bullet-indicator active"></span>Completed</span>
              </div>
            </div>

            <!-- Workflow Progress Line -->
            <div class="pipeline-section">
              <h4>Progress Workflow Sequence</h4>
              <p class="section-desc">Click a node to advance the verification stage.</p>

              <div class="pipeline-flow">
                <div 
                  class="pipeline-node" 
                  *ngFor="let state of workflowStates; let idx = index"
                  [class.completed]="isNodeCompleted(state)"
                  [class.active]="selectedCandidate.status === state"
                  (click)="advanceToState(state)"
                >
                  <div class="node-bullet">
                    <span class="material-symbols-outlined" *ngIf="isNodeCompleted(state) && selectedCandidate.status !== state">done</span>
                    <span class="num" *ngIf="!isNodeCompleted(state) || selectedCandidate.status === state">{{ idx + 1 }}</span>
                  </div>
                  <div class="node-label">{{ state }}</div>
                  <div class="node-connector" *ngIf="idx < workflowStates.length - 1"></div>
                </div>
              </div>
            </div>

            <!-- Active Status Logs -->
            <div class="workflow-logs">
              <h4>Stage Validation Logs</h4>
              <div class="log-box">
                <div class="log-entry">
                  <span class="bullet"></span>
                  <div class="entry-meta">
                    <span class="date">{{ selectedCandidate.updatedAt | date:'medium' }}</span>
                    <p class="msg">Background check transitioned to state <strong>{{ selectedCandidate.status }}</strong></p>
                  </div>
                </div>
                <div class="log-entry" *ngIf="selectedCandidate.status !== 'Created'">
                  <span class="bullet complete"></span>
                  <div class="entry-meta">
                    <span class="date">Auto Audit Log</span>
                    <p class="msg">Prior credentials successfully decrypted and reviewed.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .records-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
      position: relative;
    }

    /* Filters toolbar */
    .toolbar {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .search-box {
      display: flex;
      align-items: center;
      background: rgba(15, 12, 28, 0.8);
      border: 1px solid rgba(189, 147, 249, 0.2);
      border-radius: 6px;
      padding: 8px 12px;
      width: 320px;
      gap: 8px;

      span { color: #00e5ff; font-size: 20px; }
      input {
        background: transparent;
        border: none;
        outline: none;
        color: #f8f8f2;
        width: 100%;
        font-family: inherit;
        font-size: 0.85rem;
      }
    }

    .filter-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .select-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      background: rgba(15, 12, 28, 0.8);
      border: 1px solid rgba(189, 147, 249, 0.2);
      border-radius: 6px;
      padding: 0 12px;
      height: 40px;

      .select-icon {
        color: #bd93f9;
        font-size: 18px;
        margin-right: 8px;
      }

      select {
        background: transparent;
        border: none;
        color: #f8f8f2;
        outline: none;
        font-size: 0.85rem;
        font-family: inherit;
        cursor: pointer;
        padding-right: 16px;
      }
    }

    /* Table styling */
    .table-container {
      overflow: hidden;
      border-radius: 12px;
      position: relative;
    }

    .clickable-row {
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background: rgba(13, 242, 255, 0.02) !important;
      }

      &.active-row {
        background: rgba(13, 242, 255, 0.05) !important;
        border-left: 3px solid #00e5ff;
      }
    }

    .name-col {
      display: flex;
      align-items: center;
      gap: 10px;

      .account-avatar {
        color: #bd93f9;
        font-size: 22px;
      }
      .name {
        font-weight: 600;
        color: #f8f8f2;
      }
    }

    /* Risk scores */
    .risk-gauge-container {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 140px;
    }

    .risk-bar-bg {
      flex: 1;
      height: 4px;
      background: rgba(255,255,255,0.05);
      border-radius: 2px;
      overflow: hidden;
    }

    .risk-bar-fill {
      height: 100%;
      border-radius: 2px;
      
      &.risk-low { background: #00e676; }
      &.risk-med { background: #ffc107; }
      &.risk-high { background: #ff1744; }
    }

    .risk-score {
      font-size: 0.75rem;
      font-weight: bold;
      width: 35px;
      text-align: right;

      &.risk-low { color: #00e676; }
      &.risk-med { color: #ffc107; }
      &.risk-high { color: #ff1744; }
    }

    .table-actions {
      display: flex;
      gap: 8px;
    }

    .actions-header {
      width: 100px;
    }

    .action-btn {
      background: transparent;
      border: none;
      color: #a0a0b8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 4px;
      transition: all 0.2s;

      span { font-size: 18px; }

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #00e5ff;
      }

      &.delete-btn:hover {
        color: #ff1744;
        background: rgba(255, 23, 68, 0.1);
      }
    }

    /* Empty state */
    .empty-state {
      padding: 60px;
      text-align: center;
      color: #a0a0b8;

      .empty-icon {
        font-size: 48px;
        color: #bd93f9;
        margin-bottom: 12px;
      }
    }

    /* Pagination */
    .table-pagination {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(189, 147, 249, 0.15);
      background: rgba(8, 6, 16, 0.2);

      .pager-info {
        font-size: 0.8rem;
        color: #a0a0b8;
      }

      .pager-buttons {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .page-num {
          font-weight: 700;
          color: #00e5ff;
          font-size: 0.9rem;
        }
      }
    }

    /* Modals styling */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.2s;
    }

    .modal-card {
      width: 450px;
      padding: 32px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);

      h2 {
        font-size: 1.25rem;
        color: #f8f8f2;
        margin-bottom: 24px;
      }
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    /* Side Drawer Layout */
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 900;
      display: flex;
      justify-content: flex-end;
    }

    .drawer-container {
      width: 480px;
      height: 100vh;
      border-radius: 0 !important;
      border-right: none !important;
      border-top: none !important;
      border-bottom: none !important;
      background: #0c0919 !important;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      animation: drawerSlideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(189, 147, 249, 0.15);
      padding-bottom: 16px;

      h2 { font-size: 1.2rem; color: #f8f8f2; }
    }

    .drawer-body {
      display: flex;
      flex-direction: column;
      gap: 28px;
      flex: 1;
      overflow-y: auto;
    }

    .candidate-meta-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(189, 147, 249, 0.1);
      border-radius: 8px;
      position: relative;

      .avatar {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #00e5ff, #bd93f9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #06040a;
      }

      .info {
        display: flex;
        flex-direction: column;
        h3 { font-size: 0.95rem; color: #f8f8f2; }
        .email { font-size: 0.75rem; color: #a0a0b8; }
      }

      .risk-badge {
        position: absolute;
        top: 16px;
        right: 16px;
        font-size: 0.7rem;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 700;

        &.risk-low { background: rgba(0, 230, 118, 0.12); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.25); }
        &.risk-med { background: rgba(255, 193, 7, 0.12); color: #ffc107; border: 1px solid rgba(255, 193, 7, 0.25); }
        &.risk-high { background: rgba(255, 23, 68, 0.12); color: #ff1744; border: 1px solid rgba(255, 23, 68, 0.25); }
      }
    }

    .audit-details-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px !important;
      background: rgba(255, 255, 255, 0.01) !important;
      border: 1px solid rgba(189, 147, 249, 0.1) !important;

      h4 {
        font-size: 0.78rem;
        color: #bd93f9;
        text-transform: uppercase;
        margin-bottom: 6px;
        letter-spacing: 0.5px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        padding-bottom: 6px;

        .label {
          color: #a0a0b8;
        }

        .value {
          color: #f8f8f2;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;

          &.monospace {
            font-family: monospace;
            font-size: 0.75rem;
            color: #00e5ff;
          }
        }
      }

      .bullet-indicator {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        display: inline-block;
        background: #707085;

        &.active {
          background: #00e676;
          box-shadow: 0 0 6px #00e676;
        }

        &.failed {
          background: #ff1744;
          box-shadow: 0 0 6px #ff1744;
        }
      }
    }

    .pipeline-section {
      display: flex;
      flex-direction: column;
      gap: 12px;

      h4 { font-size: 0.85rem; color: #bd93f9; text-transform: uppercase; letter-spacing: 0.5px; }
      .section-desc { font-size: 0.75rem; color: #a0a0b8; }
    }

    /* Pipeline Sequence Chart */
    .pipeline-flow {
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: relative;
      padding-left: 10px;
    }

    .pipeline-node {
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
      cursor: pointer;
      user-select: none;

      .node-bullet {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #120e22;
        border: 2px solid rgba(189, 147, 249, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: bold;
        color: #a0a0b8;
        z-index: 5;
        transition: all 0.2s;

        span { font-size: 16px; color: #06040a; font-weight: bold; }
      }

      .node-label {
        font-size: 0.85rem;
        color: #a0a0b8;
        font-weight: 500;
        transition: color 0.2s;
      }

      .node-connector {
        position: absolute;
        top: 28px;
        left: 13px;
        width: 2px;
        height: 22px;
        background: rgba(189, 147, 249, 0.15);
        z-index: 1;
      }

      // States
      &.completed {
        .node-bullet {
          background: #bd93f9;
          border-color: #bd93f9;
          color: #06040a;
        }
        .node-label {
          color: #bd93f9;
        }
        .node-connector {
          background: #bd93f9;
        }
      }

      &.active {
        .node-bullet {
          background: #00e5ff;
          border-color: #00e5ff;
          color: #06040a;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
        }
        .node-label {
          color: #00e5ff;
          font-weight: 700;
        }
      }
    }

    .workflow-logs {
      display: flex;
      flex-direction: column;
      gap: 12px;
      h4 { font-size: 0.85rem; color: #bd93f9; text-transform: uppercase; }
      
      .log-box {
        background: rgba(15, 12, 28, 0.8);
        border: 1px solid rgba(189, 147, 249, 0.15);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .log-entry {
        display: flex;
        gap: 10px;
        font-size: 0.75rem;

        .bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00e5ff;
          margin-top: 5px;
          
          &.complete { background: #bd93f9; }
        }

        .entry-meta {
          display: flex;
          flex-direction: column;
          
          .date { color: #707085; font-weight: bold; margin-bottom: 2px; }
          .msg { color: #f8f8f2; }
        }
      }
    }

    @keyframes drawerSlideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `]
})
export class RecordsComponent implements OnInit {
  private recordService = inject(RecordService);
  private authService = inject(AuthService);
  private toastService = inject(NotificationService);

  public records: CandidateRecord[] = [];
  public filteredRecords: CandidateRecord[] = [];
  public paginatedRecords: CandidateRecord[] = [];

  // Filters & State
  public searchQuery = '';
  public statusFilter = '';
  public riskFilter = '';
  public isAdmin = false;

  // Pagination Config
  public currentPage = 1;
  public pageSize = 8;

  // Modals Controller
  public isModalOpen = false;
  public modalMode: 'add' | 'edit' = 'add';
  public editTargetId = '';
  public formName = '';
  public formEmail = '';
  public formRisk?: number;

  // Drawer Workflow Controller
  public isDrawerOpen = false;
  public selectedCandidate: CandidateRecord | null = null;
  public workflowStates = ['Created', 'Documents Submitted', 'Background Check', 'Under Review', 'Verified'];

  ngOnInit() {
    this.isAdmin = this.authService.currentUserValue?.role === 'admin';
    this.fetchRecords();
  }

  public fetchRecords() {
    this.recordService.getRecords().subscribe({
      next: (res) => {
        if (res.success) {
          this.records = res.records;
          this.applyFilters();
        }
      },
      error: () => this.toastService.show('Failed to synchronize records from API server.', 'error')
    });
  }

  public applyFilters() {
    let result = [...this.records];

    // Search query filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }

    // Status filter
    if (this.statusFilter) {
      result = result.filter(r => r.status === this.statusFilter);
    }

    // Risk levels filter
    if (this.riskFilter) {
      if (this.riskFilter === 'low') result = result.filter(r => r.riskScore < 30);
      else if (this.riskFilter === 'medium') result = result.filter(r => r.riskScore >= 30 && r.riskScore <= 70);
      else if (this.riskFilter === 'high') result = result.filter(r => r.riskScore > 70);
    }

    this.filteredRecords = result;
    this.currentPage = 1; // reset page on filter
    this.updatePagination();
  }

  public updatePagination() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedRecords = this.filteredRecords.slice(startIndex, startIndex + this.pageSize);
  }

  public getMinCount(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredRecords.length);
  }

  public changePage(dir: number) {
    this.currentPage += dir;
    this.updatePagination();
  }

  public maxPage(): number {
    return Math.ceil(this.filteredRecords.length / this.pageSize);
  }

  // Modals operations
  public openAddModal() {
    this.modalMode = 'add';
    this.formName = '';
    this.formEmail = '';
    this.formRisk = undefined;
    this.isModalOpen = true;
  }

  public openEditModal(record: CandidateRecord) {
    this.modalMode = 'edit';
    this.editTargetId = record._id;
    this.formName = record.name;
    this.formEmail = record.email;
    this.formRisk = record.riskScore;
    this.isModalOpen = true;
  }

  public closeModal() {
    this.isModalOpen = false;
  }

  public saveCandidate() {
    if (!this.formName || !this.formEmail) {
      this.toastService.show('Please fulfill name and email values.', 'warning');
      return;
    }

    if (this.modalMode === 'add') {
      this.recordService.createRecord(this.formName, this.formEmail, this.formRisk).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.show(`Verification pipeline initiated for candidate ${this.formName}.`, 'success');
            this.fetchRecords();
            this.closeModal();
          }
        },
        error: (err) => this.toastService.show(err.error?.message || 'Failed to trigger verification check.', 'error')
      });
    } else {
      this.recordService.updateRecordDetails(this.editTargetId, this.formName, this.formEmail, this.formRisk || 0).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.show(`Record details modified for candidate ${this.formName}.`, 'success');
            this.fetchRecords();
            this.closeModal();
            // sync drawer too if open
            if (this.selectedCandidate?._id === this.editTargetId) {
              this.selectedCandidate = res.record;
            }
          }
        },
        error: (err) => this.toastService.show(err.error?.message || 'Failed to update record.', 'error')
      });
    }
  }

  public deleteCandidate(id: string) {
    if (confirm('Are you absolute certain you want to purge this record check?')) {
      this.recordService.deleteRecord(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.show('Candidate file permanently removed.', 'success');
            this.fetchRecords();
            if (this.selectedCandidate?._id === id) {
              this.closeDrawer();
            }
          }
        },
        error: (err) => this.toastService.show(err.error?.message || 'Failed to delete record.', 'error')
      });
    }
  }

  // Side Drawer Workflow progress methods
  public openWorkflowDrawer(record: CandidateRecord) {
    this.selectedCandidate = record;
    this.isDrawerOpen = true;
  }

  public closeDrawer() {
    this.isDrawerOpen = false;
    this.selectedCandidate = null;
  }

  public isNodeCompleted(state: string): boolean {
    if (!this.selectedCandidate) return false;
    const currentIdx = this.workflowStates.indexOf(this.selectedCandidate.status);
    const targetIdx = this.workflowStates.indexOf(state);
    return targetIdx <= currentIdx;
  }

  public advanceToState(state: string) {
    if (!this.selectedCandidate) return;
    
    // Prevent backtracking or clicking same state
    if (this.selectedCandidate.status === state) return;

    this.recordService.updateRecordStatus(this.selectedCandidate._id, state).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.show(`Workflow transitioned: '${this.selectedCandidate?.name}' advanced to '${state}'`, 'success');
          this.selectedCandidate = res.record;
          this.fetchRecords(); // Reload main grid
        }
      },
      error: (err) => this.toastService.show(err.error?.message || 'Failed to progress state.', 'error')
    });
  }

  // Export CSV utility
  public exportCsv() {
    if (this.filteredRecords.length === 0) {
      this.toastService.show('No candidate lines to export.', 'warning');
      return;
    }

    const headers = 'ID,Name,Email,Status,Risk Score,Last Updated\n';
    const rows = this.filteredRecords.map(r => 
      `"${r._id}","${r.name.replace(/"/g, '""')}","${r.email}","${r.status}",${r.riskScore},"${r.updatedAt}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'verix_candidates_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.show('Candidate ledger exported to CSV file.', 'success');
  }

  // Styles formatting mapping helpers
  public getStatusClass(status: string): string {
    return status.toLowerCase().replace(/ /g, '-');
  }

  public getRiskColorClass(score: number): string {
    if (score < 30) return 'risk-low';
    if (score <= 70) return 'risk-med';
    return 'risk-high';
  }

  public getRiskTextClass(score: number): string {
    if (score < 30) return 'risk-low';
    if (score <= 70) return 'risk-med';
    return 'risk-high';
  }
}
