import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number;
  icon: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = new Subject<ToastMessage>();
  private _confirmSubject = new Subject<ConfirmOptions>();
  private _confirmResponse = new Subject<boolean>();
  private _counter = 0;

  toasts$ = this._toasts.asObservable();
  confirm$ = this._confirmSubject.asObservable();
  confirmResponse$ = this._confirmResponse.asObservable();

  private iconMap: Record<string, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  show(type: ToastMessage['type'], title: string, message: string = '', duration: number = 4000) {
    this._toasts.next({
      id: ++this._counter,
      type,
      title,
      message,
      duration,
      icon: this.iconMap[type]
    });
  }

  success(title: string, message: string = '') {
    this.show('success', title, message);
  }

  error(title: string, message: string = '') {
    this.show('error', title, message, 6000);
  }

  warning(title: string, message: string = '') {
    this.show('warning', title, message, 5000);
  }

  info(title: string, message: string = '') {
    this.show('info', title, message, 4000);
  }

  /** Opens a styled confirm dialog. Returns a Promise<boolean>. */
  confirm(options: ConfirmOptions): Promise<boolean> {
    this._confirmSubject.next(options);
    return new Promise<boolean>(resolve => {
      const sub = this._confirmResponse.subscribe(result => {
        resolve(result);
        sub.unsubscribe();
      });
    });
  }

  /** Called by the ToastComponent when the user clicks confirm/cancel. */
  respondToConfirm(result: boolean) {
    this._confirmResponse.next(result);
  }
}
