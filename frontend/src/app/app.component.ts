import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserSession } from './core/services/auth.service';
import { NotificationService, ToastMessage } from './core/services/notification.service';
import { PaletteComponent } from './shared/components/palette/palette.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, PaletteComponent],
  template: `
    <div class="app-layout" [class.no-auth]="!session">
      
      <!-- Side Navigation Panel (Only shown when authenticated) -->
      <aside class="sidebar glass-panel" *ngIf="session">
        <div class="sidebar-logo">
          <div class="logo-box">V</div>
          <span class="logo-text">Veri<span>X</span></span>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active-route" class="nav-item">
            <span class="material-symbols-outlined">dashboard</span>
            <span class="nav-label">Dashboard</span>
          </a>

          <a routerLink="/records" routerLinkActive="active-route" class="nav-item">
            <span class="material-symbols-outlined">fact_check</span>
            <span class="nav-label">Verification</span>
          </a>

          <a routerLink="/admin" routerLinkActive="active-route" class="nav-item" *ngIf="session.role === 'admin'">
            <span class="material-symbols-outlined">shield_person</span>
            <span class="nav-label">Admin Center</span>
          </a>

          <a routerLink="/simulator" routerLinkActive="active-route" class="nav-item">
            <span class="material-symbols-outlined">terminal</span>
            <span class="nav-label">Async Lab</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="kbd-info" (click)="openPalette()">
            <span class="kbd">Ctrl</span>+<span class="kbd">K</span>
          </div>
          
          <div class="user-badge">
            <div class="user-avatar">{{ session.email.charAt(0).toUpperCase() }}</div>
            <div class="user-meta">
              <span class="email">{{ session.email.split('@')[0] }}</span>
              <span class="role">{{ session.role }}</span>
            </div>
          </div>

          <button class="logout-btn" (click)="logout()" title="Sign Out Session">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Layout Frame -->
      <main class="main-content">
        <header class="app-header" *ngIf="session">
          <div class="header-breadcrumb">
            <h1>{{ getPageTitle() }}</h1>
          </div>
          <div class="header-actions">
            <div class="kbd-hint" (click)="openPalette()">
              <span class="material-symbols-outlined search-icon">search</span>
              <span>Search Actions...</span>
              <span class="shortcut">Ctrl+K</span>
            </div>
            
            <div class="status-indicator">
              <span class="dot pulse"></span>
              <span class="text">Secure Terminal</span>
            </div>
          </div>
        </header>

        <!-- Dynamic router viewport -->
        <div class="page-container">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Floating Glass Toast Alerts -->
      <div class="toast-container">
        <div 
          class="toast-alert glass-panel fade-in" 
          *ngFor="let toast of toasts$ | async"
          [class]="toast.type"
        >
          <span class="material-symbols-outlined toast-icon">{{ getToastIcon(toast.type) }}</span>
          <span class="toast-text">{{ toast.message }}</span>
          <button class="toast-close" (click)="dismissToast(toast.id)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Command Palette overlay -->
      <app-palette #palette></app-palette>

    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      width: 100vw;
      height: 100vh;
      background: #06040a;
      overflow: hidden;

      &.no-auth {
        .main-content {
          margin-left: 0;
          padding: 0;
        }
        .page-container {
          height: 100vh;
          padding: 0;
        }
      }
    }

    /* Sidebar Layout styling */
    .sidebar {
      width: 250px;
      height: 100vh;
      border-radius: 0 !important;
      border-left: none !important;
      border-top: none !important;
      border-bottom: none !important;
      background: #0d0a1a !important;
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      z-index: 100;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 40px;
      padding-left: 8px;

      .logo-box {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #00e5ff, #9d4edd);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #06040a;
        font-size: 1.2rem;
      }

      .logo-text {
        font-weight: 700;
        font-size: 1.25rem;
        letter-spacing: 1px;
        color: #f8f8f2;
        
        span {
          color: #00e5ff;
        }
      }
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-radius: 8px;
      color: #a0a0b8;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(189, 147, 249, 0.05);
        color: #f8f8f2;
      }

      &.active-route {
        background: rgba(0, 229, 255, 0.08);
        border: 1px solid rgba(0, 229, 255, 0.15);
        color: #00e5ff;
        font-weight: 600;

        span {
          color: #00e5ff;
        }
      }
    }

    .sidebar-footer {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 20px;
      border-top: 1px solid rgba(189, 147, 249, 0.1);
    }

    .kbd-info {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px;
      text-align: center;
      font-size: 0.75rem;
      color: #a0a0b8;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 4px;
      transition: background 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .kbd {
        background: rgba(255, 255, 255, 0.1);
        padding: 1px 4px;
        border-radius: 3px;
        font-weight: bold;
      }
    }

    .user-badge {
      display: flex;
      align-items: center;
      gap: 10px;

      .user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #bd93f9, #7b2cbf);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
      }

      .user-meta {
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .email {
          color: #f8f8f2;
          font-size: 0.85rem;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .role {
          color: #a0a0b8;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }
    }

    .logout-btn {
      width: 100%;
      background: rgba(255, 23, 68, 0.05);
      border: 1px solid rgba(255, 23, 68, 0.15);
      color: #ff1744;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 23, 68, 0.15);
        box-shadow: 0 0 10px rgba(255, 23, 68, 0.15);
      }
    }

    /* Main viewport layout */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .app-header {
      height: 70px;
      padding: 0 32px;
      border-bottom: 1px solid rgba(189, 147, 249, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(8, 6, 16, 0.3);
      backdrop-filter: blur(10px);

      h1 {
        font-size: 1.3rem;
        font-weight: 700;
        color: #f8f8f2;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .kbd-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 0.8rem;
      color: #a0a0b8;
      cursor: pointer;
      transition: border-color 0.2s;

      .search-icon {
        font-size: 18px;
        color: #00e5ff;
      }

      &:hover {
        border-color: rgba(0, 229, 255, 0.3);
      }

      .shortcut {
        background: rgba(255, 255, 255, 0.08);
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: bold;
      }
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      color: #00e676;
      background: rgba(0, 230, 118, 0.08);
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid rgba(0, 230, 118, 0.15);

      .dot {
        width: 6px;
        height: 6px;
        background: #00e676;
        border-radius: 50%;

        &.pulse {
          animation: indicatorPulse 2s infinite;
        }
      }

      .text {
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .page-container {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
      background: linear-gradient(180deg, rgba(8,6,16,0.3) 0%, rgba(6,4,10,1) 100%);
    }

    /* Toast containers styles */
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 11000;
    }

    .toast-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 320px;
      max-width: 450px;
      padding: 14px 18px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      animation: toastSlideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;

      .toast-icon {
        font-size: 20px;
      }

      .toast-text {
        font-size: 0.85rem;
        font-weight: 500;
        color: #f8f8f2;
        flex: 1;
      }

      .toast-close {
        background: transparent;
        border: none;
        color: #a0a0b8;
        cursor: pointer;
        display: flex;
        align-items: center;
        &:hover {
          color: white;
        }
        span {
          font-size: 18px;
        }
      }

      &.success {
        border-left: 4px solid #00e676;
        .toast-icon { color: #00e676; }
      }

      &.error {
        border-left: 4px solid #ff1744;
        .toast-icon { color: #ff1744; }
      }

      &.info {
        border-left: 4px solid #00e5ff;
        .toast-icon { color: #00e5ff; }
      }

      &.warning {
        border-left: 4px solid #ffc107;
        .toast-icon { color: #ffc107; }
      }
    }

    @keyframes indicatorPulse {
      0% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(0, 230, 118, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0); }
    }

    @keyframes toastSlideIn {
      from { transform: translateX(100%) translateY(0); opacity: 0; }
      to { transform: translateX(0) translateY(0); opacity: 1; }
    }
  `]
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(NotificationService);
  private router = inject(Router);

  public session: UserSession | null = null;
  public toasts$ = this.toastService.toasts$;

  ngOnInit() {
    this.authService.currentUser$.subscribe(session => {
      this.session = session;
    });
  }

  public logout() {
    this.authService.logout();
    this.toastService.show('Signed out successfully.', 'info');
  }

  public getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('/dashboard')) return 'Background Verification Analytics';
    if (url.includes('/records')) return 'Verification Operations Console';
    if (url.includes('/admin')) return 'Security Control Center';
    if (url.includes('/simulator')) return 'Network Resilience Laboratory';
    return 'VeriX Platform';
  }

  public getToastIcon(type: string): string {
    if (type === 'success') return 'check_circle';
    if (type === 'error') return 'error';
    if (type === 'warning') return 'warning';
    return 'info';
  }

  public dismissToast(id: string) {
    this.toastService.dismiss(id);
  }

  public openPalette() {
    // Access palette component
    const kbdEvent = new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' });
    document.dispatchEvent(kbdEvent);
  }
}
