import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SimulatorService } from '../../../core/services/simulator.service';
import { NotificationService } from '../../../core/services/notification.service';

interface CommandItem {
  icon: string;
  name: string;
  category: string;
  action: () => void;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="palette-overlay" *ngIf="isOpen" (click)="close()">
      <div class="palette-modal glass-panel" (click)="$event.stopPropagation()">
        <div class="palette-header">
          <span class="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (ngModelChange)="filterCommands()"
            placeholder="Type a command or action (e.g. 'Reset Latency', 'Go to Dashboard')..."
            (keydown.arrowdown)="moveCursor(1, $event)"
            (keydown.arrowup)="moveCursor(-1, $event)"
            (keydown.enter)="executeSelected()"
            #searchInput
          />
          <span class="esc-badge">ESC</span>
        </div>
        
        <div class="palette-results" *ngIf="filteredCommands.length > 0; else noResults">
          <div class="category-group" *ngFor="let cat of getCategories()">
            <div class="category-header">{{ cat }}</div>
            <div 
              class="command-item" 
              *ngFor="let cmd of getCommandsByCategory(cat)"
              [class.active]="isSelected(cmd)"
              (click)="runCommand(cmd)"
              (mouseenter)="setHovered(cmd)"
            >
              <span class="material-symbols-outlined item-icon">{{ cmd.icon }}</span>
              <span class="item-name">{{ cmd.name }}</span>
              <span class="shortcut-indicator" *ngIf="isSelected(cmd)">⏎ Run</span>
            </div>
          </div>
        </div>

        <ng-template #noResults>
          <div class="no-results">No matching commands found.</div>
        </ng-template>

        <div class="palette-footer">
          <span>Use <span class="key">↑</span> <span class="key">↓</span> keys to navigate</span>
          <span>Press <span class="key">Enter</span> to execute</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .palette-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(4, 2, 10, 0.75);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 15vh;
      animation: fadeIn 0.15s ease-out;
    }

    .palette-modal {
      width: 600px;
      max-height: 450px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(13, 242, 255, 0.2) !important;
      box-shadow: 0 0 30px rgba(13, 242, 255, 0.15) !important;
    }

    .palette-header {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid rgba(189, 147, 249, 0.15);
      gap: 12px;

      .search-icon {
        color: #00e5ff;
        font-size: 24px;
      }

      input {
        flex: 1;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        color: #f8f8f2;
        font-size: 1.05rem;
        font-family: inherit;
        box-shadow: none !important;
        padding: 0 !important;
      }

      .esc-badge {
        font-size: 0.65rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #a0a0b8;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
      }
    }

    .palette-results {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .category-group {
      margin-bottom: 14px;
    }

    .category-header {
      font-size: 0.7rem;
      font-weight: 700;
      color: #9d4edd;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-left: 8px;
      margin-bottom: 6px;
    }

    .command-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      gap: 12px;
      transition: all 0.15s ease;

      .item-icon {
        color: #a0a0b8;
        font-size: 20px;
      }

      .item-name {
        color: #f8f8f2;
        font-size: 0.9rem;
      }

      .shortcut-indicator {
        margin-left: auto;
        font-size: 0.7rem;
        color: #00e5ff;
        background: rgba(0, 229, 255, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(0, 229, 255, 0.2);
      }

      &.active {
        background: rgba(13, 242, 255, 0.08);
        border-left: 3px solid #00e5ff;
        padding-left: 9px;

        .item-icon {
          color: #00e5ff;
        }
      }
    }

    .no-results {
      padding: 30px;
      text-align: center;
      color: #a0a0b8;
      font-size: 0.9rem;
    }

    .palette-footer {
      padding: 10px 16px;
      border-top: 1px solid rgba(189, 147, 249, 0.1);
      display: flex;
      justify-content: space-between;
      color: #a0a0b8;
      font-size: 0.7rem;

      .key {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        padding: 1px 4px;
        font-weight: bold;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class PaletteComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private simulatorService = inject(SimulatorService);
  private toastService = inject(NotificationService);

  public isOpen = false;
  public searchQuery = '';
  public selectedIndex = 0;
  
  private allCommands: CommandItem[] = [];
  public filteredCommands: CommandItem[] = [];

  ngOnInit() {
    this.initializeCommands();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Toggle on Ctrl+K
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    }
    
    // Close on Escape
    if (event.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  private toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.selectedIndex = 0;
      this.filterCommands();
      // Autofocus input
      setTimeout(() => {
        const inputEl = document.querySelector('.palette-header input') as HTMLInputElement;
        inputEl?.focus();
      }, 50);
    }
  }

  public close() {
    this.isOpen = false;
  }

  private initializeCommands() {
    const userRole = this.authService.currentUserValue?.role || 'user';
    const isAdmin = userRole === 'admin';

    this.allCommands = [
      // Navigation
      {
        icon: 'dashboard',
        name: 'Go to Dashboard',
        category: 'Navigation',
        action: () => this.router.navigate(['/dashboard'])
      },
      {
        icon: 'fact_check',
        name: 'Go to Verification Center',
        category: 'Navigation',
        action: () => this.router.navigate(['/records'])
      },
      {
        icon: 'shield_person',
        name: 'Go to Admin Control Center',
        category: 'Navigation',
        action: () => this.router.navigate(['/admin']),
        adminOnly: true
      },
      {
        icon: 'terminal',
        name: 'Go to Network Simulation Lab',
        category: 'Navigation',
        action: () => this.router.navigate(['/simulator'])
      },

      // Simulator Utilities
      {
        icon: 'timer',
        name: 'Set Network Latency to 0ms (Fast)',
        category: 'Resilience Simulator',
        action: () => {
          this.simulatorService.setLatency(0);
          this.toastService.show('Latency reset to 0ms', 'success');
        }
      },
      {
        icon: 'timer_3',
        name: 'Set Network Latency to 2000ms (Slow)',
        category: 'Resilience Simulator',
        action: () => {
          this.simulatorService.setLatency(2000);
          this.toastService.show('Latency set to 2.0s', 'info');
        }
      },
      {
        icon: 'warning',
        name: 'Set Request Failure Rate to 0%',
        category: 'Resilience Simulator',
        action: () => {
          this.simulatorService.setFailureRate(0);
          this.toastService.show('Failures reset to 0%', 'success');
        }
      },
      {
        icon: 'wifi_off',
        name: 'Toggle Offline Mode Simulation',
        category: 'Resilience Simulator',
        action: () => {
          const target = !this.simulatorService.offline$.value;
          this.simulatorService.setOffline(target);
          this.toastService.show(target ? 'Offline mode enabled' : 'Online mode restored', target ? 'warning' : 'success');
        }
      },
      {
        icon: 'delete_sweep',
        name: 'Clear Live Telemetry Stats',
        category: 'Resilience Simulator',
        action: () => {
          this.simulatorService.clearStats();
          this.toastService.show('Telemetry queue flushed', 'info');
        }
      },

      // System Actions
      {
        icon: 'logout',
        name: 'Sign Out Session',
        category: 'System',
        action: () => {
          this.authService.logout();
          this.toastService.show('Session terminated', 'info');
        }
      }
    ].filter(cmd => !cmd.adminOnly || isAdmin);
  }

  public filterCommands() {
    this.initializeCommands(); // Re-initialize to ensure role shifts are accurate
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredCommands = [...this.allCommands];
    } else {
      this.filteredCommands = this.allCommands.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.category.toLowerCase().includes(query)
      );
    }
    this.selectedIndex = 0;
  }

  public getCategories(): string[] {
    const cats = this.filteredCommands.map(c => c.category);
    return Array.from(new Set(cats));
  }

  public getCommandsByCategory(category: string): CommandItem[] {
    return this.filteredCommands.filter(c => c.category === category);
  }

  public isSelected(cmd: CommandItem): boolean {
    const globalIdx = this.filteredCommands.indexOf(cmd);
    return globalIdx === this.selectedIndex;
  }

  public setHovered(cmd: CommandItem) {
    this.selectedIndex = this.filteredCommands.indexOf(cmd);
  }

  public moveCursor(dir: number, event: Event) {
    event.preventDefault();
    const count = this.filteredCommands.length;
    if (count === 0) return;
    this.selectedIndex = (this.selectedIndex + dir + count) % count;
  }

  public executeSelected() {
    if (this.filteredCommands.length === 0) return;
    const cmd = this.filteredCommands[this.selectedIndex];
    this.runCommand(cmd);
  }

  public runCommand(cmd: CommandItem) {
    cmd.action();
    this.close();
  }
}
