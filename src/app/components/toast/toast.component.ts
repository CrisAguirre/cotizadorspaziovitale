import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage, ConfirmOptions } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: (ToastMessage & { removing?: boolean })[] = [];
  confirmData: ConfirmOptions | null = null;
  private subs: Subscription[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subs.push(
      this.toastService.toasts$.subscribe(toast => {
        this.toasts.push(toast);
        setTimeout(() => this.dismiss(toast.id), toast.duration);
      })
    );

    this.subs.push(
      this.toastService.confirm$.subscribe(options => {
        this.confirmData = options;
      })
    );
  }

  dismiss(id: number) {
    const t = this.toasts.find(x => x.id === id);
    if (t) {
      t.removing = true;
      setTimeout(() => {
        this.toasts = this.toasts.filter(x => x.id !== id);
      }, 350);
    }
  }

  respondConfirm(result: boolean) {
    this.confirmData = null;
    this.toastService.respondToConfirm(result);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
