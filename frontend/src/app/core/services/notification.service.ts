import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  constructor() {}

  public show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    const toast: ToastMessage = {
      id: 'toast_' + Math.random().toString(36).substring(2, 9),
      message,
      type
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Auto dismiss toast after 4 seconds
    setTimeout(() => {
      this.dismiss(toast.id);
    }, 4000);
  }

  public dismiss(id: string) {
    const updated = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(updated);
  }
}
