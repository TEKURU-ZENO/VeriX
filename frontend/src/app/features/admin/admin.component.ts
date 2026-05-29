import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UserAccount, AuditEvent } from '../../core/services/admin.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-wrapper fade-in">
      
      <!-- Upper Section: User CRUD Management Grid -->
      <section class="admin-section glass-panel">
        <div class="section-header">
          <div>
            <h2>User Account Registry</h2>
            <span class="subtitle">System credential privileges & status switches</span>
          </div>
          <button class="btn btn-cyan" (click)="openAddUserModal()">
            <span class="material-symbols-outlined">person_add</span>
            <span>Create Profile</span>
          </button>
        </div>

        <div class="table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Access Level Role</th>
                <th>Terminal Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users">
                <td class="email-cell">
                  <span class="material-symbols-outlined user-avatar-icon">account_circle</span>
                  <span>{{ user.email }}</span>
                </td>
                <td>
                  <span class="role-badge" [class.role-admin]="user.role === 'admin'">
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" [class.active]="user.status === 'active'" [class.suspended]="user.status === 'suspended'">
                    {{ user.status }}
                  </span>
                </td>
                <td>{{ user.createdAt | date:'mediumDate' }}</td>
                <td class="user-actions">
                  <button 
                    class="action-btn-suspend"
                    [class.suspended-active]="user.status === 'suspended'"
                    (click)="toggleSuspendUser(user)"
                    [disabled]="user.email === currentEmail"
                    [title]="user.status === 'active' ? 'Suspend user session' : 'Restore user session'"
                  >
                    <span class="material-symbols-outlined">
                      {{ user.status === 'active' ? 'block' : 'check_circle' }}
                    </span>
                  </button>
                  <button 
                    class="action-btn-delete"
                    (click)="deleteUser(user._id)"
                    [disabled]="user.email === currentEmail"
                    title="Permanently remove user"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Lower Section: Time Travel Audit Logs Replay Console -->
      <section class="admin-section glass-panel audit-logs-replay">
        <div class="section-header">
          <div>
            <h2>Time Travel Audit Replay Console</h2>
            <span class="subtitle">Interactively step through past operations events chronologically</span>
          </div>
          
          <!-- Playback Navigation Controls -->
          <div class="playback-controls">
            <button 
              class="control-btn" 
              (click)="stepReplay(-1)" 
              [disabled]="isPlaying || activeLogIndex <= 0"
              title="Step backward"
            >
              <span class="material-symbols-outlined">skip_previous</span>
            </button>
            <button 
              class="control-btn play-btn" 
              (click)="togglePlay()"
              [title]="isPlaying ? 'Pause replay' : 'Play timeline replay'"
            >
              <span class="material-symbols-outlined">
                {{ isPlaying ? 'pause_circle' : 'play_circle' }}
              </span>
            </button>
            <button 
              class="control-btn" 
              (click)="stepReplay(1)" 
              [disabled]="isPlaying || activeLogIndex >= auditLogs.length - 1"
              title="Step forward"
            >
              <span class="material-symbols-outlined">skip_next</span>
            </button>
            <button 
              class="control-btn reset-btn" 
              (click)="resetReplay()"
              title="Jump to oldest event"
            >
              <span class="material-symbols-outlined">replay</span>
            </button>
          </div>
        </div>

        <div class="replay-grid" *ngIf="auditLogs.length > 0; else noLogs">
          <!-- Timeline View Column -->
          <div class="timeline-container">
            <div class="timeline-line"></div>
            
            <div 
              class="timeline-node" 
              *ngFor="let log of auditLogs; let i = index"
              [class.highlighted]="i === activeLogIndex"
              [class.passed]="i < activeLogIndex"
              (click)="jumpToLog(i)"
            >
              <div class="node-bullet"></div>
              <div class="node-content">
                <span class="time">{{ log.timestamp | date:'HH:mm:ss' }}</span>
                <span class="action-tag">{{ log.action }}</span>
                <span class="user">{{ log.user.split('@')[0] }}</span>
              </div>
            </div>
          </div>

          <!-- Highlight Terminal Card -->
          <div class="terminal-card glass-card">
            <div class="terminal-header">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
              <span class="title">Security Terminal - Event Details</span>
            </div>
            
            <div class="terminal-body" *ngIf="getActiveLog(); else noSelectedLog">
              <div class="term-row">
                <span class="term-lbl">EVENT ID:</span>
                <span class="term-val text-cyan">{{ getActiveLog()?._id }}</span>
              </div>
              <div class="term-row">
                <span class="term-lbl">TIMESTAMP:</span>
                <span class="term-val">{{ getActiveLog()?.timestamp | date:'medium' }}</span>
              </div>
              <div class="term-row">
                <span class="term-lbl">INITIATOR:</span>
                <span class="term-val text-violet">{{ getActiveLog()?.user }}</span>
              </div>
              <div class="term-row">
                <span class="term-lbl">ACTION:</span>
                <span class="term-val status-badge active">{{ getActiveLog()?.action }}</span>
              </div>
              <div class="term-row details">
                <span class="term-lbl">LEDGER PAYLOAD:</span>
                <p class="term-text cyan-glow">{{ getActiveLog()?.details }}</p>
              </div>
            </div>
            <ng-template #noSelectedLog>
              <div class="terminal-empty">
                <span class="material-symbols-outlined term-empty-icon animate-pulse">terminal</span>
                <p>Launch replay or select an audit point to inspect.</p>
              </div>
            </ng-template>
          </div>
        </div>

        <ng-template #noLogs>
          <div class="no-logs">No system audit events recorded.</div>
        </ng-template>
      </section>

      <!-- Create User Dialog Modal -->
      <div class="modal-backdrop" *ngIf="isUserModalOpen" (click)="closeUserModal()">
        <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
          <h2>Create System Access Profile</h2>
          <form (ngSubmit)="saveUser()">
            <div class="form-group">
              <label>System Email Address</label>
              <input type="email" [(ngModel)]="formEmail" name="formEmail" required placeholder="user@verix.com" />
            </div>

            <div class="form-group">
              <label>Session Passphrase</label>
              <input type="password" [(ngModel)]="formPassword" name="formPassword" required placeholder="••••••••" />
            </div>

            <div class="form-group">
              <label>Privileges Role</label>
              <select [(ngModel)]="formRole" name="formRole" required>
                <option value="user">General User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeUserModal()">Cancel</button>
              <button type="submit" class="btn btn-cyan">Build Profile</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .admin-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .admin-section {
      padding: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h2 { font-size: 1.15rem; color: #f8f8f2; }
      .subtitle { font-size: 0.75rem; color: #a0a0b8; }
    }

    /* Table user alignments */
    .email-cell {
      display: flex;
      align-items: center;
      gap: 10px;

      .user-avatar-icon {
        color: #bd93f9;
        font-size: 20px;
      }
    }

    .role-badge {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: bold;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #a0a0b8;

      &.role-admin {
        background: rgba(13, 242, 255, 0.08);
        border: 1px solid rgba(13, 242, 255, 0.15);
        color: #00e5ff;
      }
    }

    .status-badge {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: bold;

      &.active {
        background: rgba(0, 230, 118, 0.08);
        color: #00e676;
        border: 1px solid rgba(0, 230, 118, 0.15);
      }

      &.suspended {
        background: rgba(255, 23, 68, 0.08);
        color: #ff1744;
        border: 1px solid rgba(255, 23, 68, 0.15);
      }
    }

    .user-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn-suspend, .action-btn-delete {
      background: transparent;
      border: none;
      color: #a0a0b8;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      padding: 6px;
      border-radius: 4px;
      transition: all 0.2s;

      span { font-size: 18px; }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }

    .action-btn-suspend:hover:not(:disabled) {
      color: #ffc107;
      background: rgba(255, 193, 7, 0.08);
    }

    .action-btn-suspend.suspended-active:hover:not(:disabled) {
      color: #00e676;
      background: rgba(0, 230, 118, 0.08);
    }

    .action-btn-delete:hover:not(:disabled) {
      color: #ff1744;
      background: rgba(255, 23, 68, 0.1);
    }

    /* Time Travel Audit Player Controls */
    .playback-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .control-btn {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      color: #a0a0b8;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      span { font-size: 20px; }

      &:hover:not(:disabled) {
        background: rgba(0, 229, 255, 0.08);
        border-color: rgba(0, 229, 255, 0.25);
        color: #00e5ff;
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      &.play-btn {
        background: rgba(0, 229, 255, 0.08);
        border-color: rgba(0, 229, 255, 0.25);
        color: #00e5ff;
        width: 40px;
        height: 40px;

        span { font-size: 26px; }

        &:hover {
          box-shadow: 0 0 12px rgba(0, 229, 255, 0.25);
          filter: brightness(1.1);
        }
      }
    }

    .replay-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 20px;
      height: 380px;
    }

    /* Timeline events structure */
    .timeline-container {
      position: relative;
      overflow-y: auto;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .timeline-line {
      position: absolute;
      top: 10px;
      left: 27px;
      bottom: 10px;
      width: 2px;
      background: rgba(189, 147, 249, 0.15);
      z-index: 1;
    }

    .timeline-node {
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
      cursor: pointer;
      z-index: 5;
      padding: 6px;
      border-radius: 6px;
      transition: all 0.2s;

      .node-bullet {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #080610;
        border: 2px solid rgba(189, 147, 249, 0.4);
        transition: all 0.25s;
        z-index: 5;
      }

      .node-content {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.8rem;
        color: #a0a0b8;

        .time { color: #707085; font-size: 0.75rem; }
        .action-tag { 
          font-size: 0.7rem; 
          font-weight: 700; 
          color: #bd93f9; 
          text-transform: uppercase; 
          width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user { color: #f8f8f2; font-weight: 500; }
      }

      &:hover {
        background: rgba(189, 147, 249, 0.03);
        .node-bullet { border-color: #bd93f9; }
      }

      &.passed {
        .node-bullet {
          background: #bd93f9;
          border-color: #bd93f9;
        }
      }

      &.highlighted {
        background: rgba(13, 242, 255, 0.06);
        border: 1px dashed rgba(13, 242, 255, 0.2);

        .node-bullet {
          background: #00e5ff;
          border-color: #00e5ff;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
        }
        .node-content {
          color: #f8f8f2;
          .action-tag { color: #00e5ff; font-weight: bold; }
        }
      }
    }

    /* Highlight details console */
    .terminal-card {
      border: 1px solid rgba(189, 147, 249, 0.15) !important;
      display: flex;
      flex-direction: column;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
    }

    .terminal-header {
      background: rgba(13, 10, 24, 0.8);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid rgba(189, 147, 249, 0.15);

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        &.red { background: #ff5f56; }
        &.yellow { background: #ffbd2e; }
        &.green { background: #27c93f; }
      }

      .title {
        margin-left: 8px;
        font-size: 0.7rem;
        font-weight: 700;
        color: #a0a0b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .terminal-body {
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85rem;
      background: rgba(8, 6, 16, 0.5);

      .term-row {
        display: flex;
        border-bottom: 1px solid rgba(255,255,255,0.03);
        padding-bottom: 8px;

        .term-lbl { color: #707085; font-weight: bold; width: 120px; }
        .term-val { color: #f8f8f2; }

        &.details {
          flex-direction: column;
          border-bottom: none;
          gap: 8px;
          .term-text {
            color: #00e5ff;
            background: rgba(0, 229, 255, 0.03);
            border: 1px solid rgba(0, 229, 255, 0.08);
            padding: 12px;
            border-radius: 6px;
            line-height: 1.4;
          }
        }
      }
    }

    .terminal-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #707085;
      font-family: inherit;
      font-size: 0.85rem;
      gap: 12px;

      .term-empty-icon { font-size: 32px; color: #bd93f9; }
      .animate-pulse { animation: pulseAnim 2s infinite; }
    }

    .no-logs, .no-logs-detail {
      padding: 40px;
      text-align: center;
      color: #707085;
    }

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
    }

    .modal-card {
      width: 420px;
      padding: 32px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      h2 { font-size: 1.2rem; color: #f8f8f2; margin-bottom: 20px; }
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    @keyframes pulseAnim {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private toastService = inject(NotificationService);
  private authService = inject(AuthService);

  public users: UserAccount[] = [];
  public auditLogs: AuditEvent[] = [];
  public currentEmail = '';

  // Modals controllers
  public isUserModalOpen = false;
  public formEmail = '';
  public formPassword = '';
  public formRole: 'admin' | 'user' = 'user';

  // Time Travel Replay Player Controller
  public activeLogIndex = -1;
  public isPlaying = false;
  private playbackInterval: any = null;

  ngOnInit() {
    this.currentEmail = this.authService.currentUserValue?.email || '';
    this.fetchData();
  }

  ngOnDestroy() {
    this.stopReplay();
  }

  public fetchData() {
    this.adminService.getUsers().subscribe({
      next: (res) => {
        if (res.success) this.users = res.users;
      },
      error: () => this.toastService.show('Failed to sync accounts list.', 'error')
    });

    this.adminService.getAuditLogs().subscribe({
      next: (res) => {
        if (res.success) {
          // Sort reverse-chronologically for oldest-to-newest playback order
          this.auditLogs = [...res.logs].reverse();
          // Select newest on finish
          if (this.auditLogs.length > 0) {
            this.activeLogIndex = this.auditLogs.length - 1;
          }
        }
      },
      error: () => this.toastService.show('Failed to retrieve security event ledger.', 'error')
    });
  }

  public openAddUserModal() {
    this.formEmail = '';
    this.formPassword = '';
    this.formRole = 'user';
    this.isUserModalOpen = true;
  }

  public closeUserModal() {
    this.isUserModalOpen = false;
  }

  public saveUser() {
    if (!this.formEmail || !this.formPassword || !this.formRole) {
      this.toastService.show('Email, password, and role are required fields.', 'warning');
      return;
    }

    const payload = {
      email: this.formEmail,
      password: this.formPassword,
      role: this.formRole
    };

    this.adminService.createUser(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.show(`System access profile configured for '${this.formEmail}'.`, 'success');
          this.fetchData();
          this.closeUserModal();
        }
      },
      error: (err) => this.toastService.show(err.error?.message || 'Failed to construct user profile.', 'error')
    });
  }

  public toggleSuspendUser(user: UserAccount) {
    const targetStatus = user.status === 'active' ? 'suspended' : 'active';
    this.adminService.updateUser(user._id, { status: targetStatus }).subscribe({
      next: (res) => {
        if (res.success) {
          const actionText = targetStatus === 'active' ? 'restored' : 'suspended';
          this.toastService.show(`Account '${user.email}' status successfully ${actionText}.`, 'success');
          this.fetchData();
        }
      },
      error: (err) => this.toastService.show(err.error?.message || 'Failed to toggle account suspension.', 'error')
    });
  }

  public deleteUser(id: string) {
    if (confirm('Verify: Purge user credentials from system database?')) {
      this.adminService.deleteUser(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.show('User profile permanently purged.', 'success');
            this.fetchData();
          }
        },
        error: (err) => this.toastService.show(err.error?.message || 'Failed to delete user.', 'error')
      });
    }
  }

  // --- TIME TRAVEL AUDIT ENGINE METHODS ---
  public getActiveLog(): AuditEvent | null {
    if (this.activeLogIndex >= 0 && this.activeLogIndex < this.auditLogs.length) {
      return this.auditLogs[this.activeLogIndex];
    }
    return null;
  }

  public jumpToLog(index: number) {
    this.stopReplay();
    this.activeLogIndex = index;
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.stopReplay();
    } else {
      this.startReplay();
    }
  }

  private startReplay() {
    this.isPlaying = true;
    
    // If at end of timeline, start from oldest index
    if (this.activeLogIndex >= this.auditLogs.length - 1) {
      this.activeLogIndex = -1;
    }

    this.playbackInterval = setInterval(() => {
      if (this.activeLogIndex < this.auditLogs.length - 1) {
        this.activeLogIndex++;
        // Scroll to highlighted timeline row
        const highlightedNode = document.querySelector('.timeline-node.highlighted');
        highlightedNode?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        this.stopReplay();
        this.toastService.show('Replay playback sequence finished.', 'info');
      }
    }, 1500); // 1.5s step interval
  }

  private stopReplay() {
    this.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  public stepReplay(step: number) {
    this.stopReplay();
    const target = this.activeLogIndex + step;
    if (target >= 0 && target < this.auditLogs.length) {
      this.activeLogIndex = target;
      const highlightedNode = document.querySelector('.timeline-node.highlighted');
      highlightedNode?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  public resetReplay() {
    this.stopReplay();
    if (this.auditLogs.length > 0) {
      this.activeLogIndex = 0;
      const timelineBox = document.querySelector('.timeline-container');
      if (timelineBox) timelineBox.scrollTop = 0;
    }
  }
}
