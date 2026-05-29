import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-decorations">
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
      </div>

      <div class="login-card glass-panel fade-in">
        <div class="login-header">
          <div class="logo-circle">V</div>
          <h2>Veri<span>X</span></h2>
          <p>Background Checking Operations Terminal</p>
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Security Identifier (Email)</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              [(ngModel)]="email" 
              required
              placeholder="e.g. admin@verix.com"
              [disabled]="loading"
            />
          </div>

          <div class="form-group">
            <label for="password">Passphrase</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              [(ngModel)]="password" 
              required
              placeholder="••••••••"
              [disabled]="loading"
            />
          </div>

          <button 
            type="submit" 
            class="btn btn-cyan submit-btn" 
            [disabled]="loading || !loginForm.form.valid"
          >
            <span *ngIf="!loading" class="btn-text">Authenticate Session</span>
            <span *ngIf="loading" class="spinner-container">
              <span class="dot-spinner"></span>
              <span>Decrypting...</span>
            </span>
          </button>
        </form>

        <div class="quick-credentials">
          <div class="quick-header">Bypass Keys (Quick Seed Logins)</div>
          <div class="quick-buttons">
            <button 
              type="button" 
              class="btn btn-secondary quick-btn" 
              (click)="quickFill('admin@verix.com', 'admin123')"
              [disabled]="loading"
            >
              <span class="material-symbols-outlined key-icon">security</span>
              <span>Admin Terminal</span>
            </button>
            <button 
              type="button" 
              class="btn btn-secondary quick-btn" 
              (click)="quickFill('user@verix.com', 'user123')"
              [disabled]="loading"
            >
              <span class="material-symbols-outlined key-icon">person</span>
              <span>User Panel</span>
            </button>
          </div>
        </div>

        <div class="system-status">
          <span>Auth Pipeline: SECURE</span>
          <span class="indicator-dot"></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      background: #050409;
      overflow: hidden;
    }

    .login-decorations {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      z-index: 1;

      .glow-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(120px);
        opacity: 0.25;

        &.orb-1 {
          width: 350px;
          height: 350px;
          background: #00e5ff;
          top: 15%;
          left: 20%;
          animation: driftOrb1 15s infinite alternate;
        }

        &.orb-2 {
          width: 400px;
          height: 400px;
          background: #9d4edd;
          bottom: 15%;
          right: 20%;
          animation: driftOrb2 18s infinite alternate;
        }
      }
    }

    .login-card {
      width: 420px;
      padding: 40px;
      z-index: 5;
      border: 1px solid rgba(189, 147, 249, 0.2) !important;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6) !important;
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;

      .logo-circle {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #00e5ff, #9d4edd);
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #06040a;
        font-size: 1.6rem;
        margin-bottom: 12px;
        box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
      }

      h2 {
        font-size: 1.7rem;
        color: #f8f8f2;
        margin-bottom: 4px;
        letter-spacing: 1px;
        span {
          color: #00e5ff;
        }
      }

      p {
        font-size: 0.8rem;
        color: #a0a0b8;
      }
    }

    .submit-btn {
      width: 100%;
      height: 44px;
      justify-content: center;
      margin-top: 10px;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 1px;
    }

    .quick-credentials {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid rgba(189, 147, 249, 0.15);

      .quick-header {
        font-size: 0.7rem;
        color: #a0a0b8;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-align: center;
        margin-bottom: 12px;
      }

      .quick-buttons {
        display: flex;
        gap: 12px;
      }

      .quick-btn {
        flex: 1;
        font-size: 0.75rem;
        padding: 8px;
        justify-content: center;
        border: 1px solid rgba(189, 147, 249, 0.1) !important;
        
        .key-icon {
          font-size: 16px;
          color: #00e5ff;
        }

        &:hover {
          border-color: rgba(0, 229, 255, 0.25) !important;
          background: rgba(189, 147, 249, 0.05);
        }
      }
    }

    .system-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 24px;
      font-size: 0.65rem;
      color: #00e676;
      font-weight: 700;
      letter-spacing: 0.5px;

      .indicator-dot {
        width: 6px;
        height: 6px;
        background: #00e676;
        border-radius: 50%;
        box-shadow: 0 0 6px #00e676;
      }
    }

    /* Loading Spinner */
    .spinner-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dot-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(5, 5, 8, 0.2);
      border-top-color: #050508;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes driftOrb1 {
      from { transform: translate(0, 0) scale(1); }
      to { transform: translate(100px, 80px) scale(1.2); }
    }

    @keyframes driftOrb2 {
      from { transform: translate(0, 0) scale(1); }
      to { transform: translate(-100px, -80px) scale(0.9); }
    }
  `]
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(NotificationService);
  private router = inject(Router);

  public email = '';
  public password = '';
  public loading = false;

  ngOnInit() {
    // If already logged in, redirect straight to dashboard
    if (this.authService.currentUserValue) {
      this.router.navigate(['/dashboard']);
    }
  }

  public onSubmit() {
    this.loading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.toastService.show(`Session authenticated: welcome back ${res.user.email}!`, 'success');
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || 'Authentication rejected.';
        this.toastService.show(msg, 'error');
      }
    });
  }

  public quickFill(email: string, pass: string) {
    this.email = email;
    this.password = pass;
    this.onSubmit();
  }
}
