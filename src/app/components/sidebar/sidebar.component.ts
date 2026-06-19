import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TemporalService, TemporalData } from '../../services/temporal.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Input() isOpen = true;
  temporals: TemporalData[] = [];

  constructor(
    public authService: AuthService, 
    private router: Router,
    private temporalService: TemporalService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.temporalService.temporals$.subscribe(data => {
      this.temporals = data;
    });
  }

  deleteTemporal(id: string, event: Event) {
    event.stopPropagation();
    this.toastService.confirm({
      title: 'Eliminar borrador',
      message: '¿Deseas eliminar esta cotización temporal?',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.temporalService.deleteTemporal(id).subscribe({
          next: () => this.toastService.success('Borrador eliminado', 'La cotización temporal ha sido descartada.'),
          error: () => this.toastService.error('Error', 'No se pudo eliminar el borrador.')
        });
      }
    });
  }

  resumeTemporal(id: string) {
    this.router.navigate(['/quotations/new'], { queryParams: { temporalId: id } });
  }

  logout() {
    if (this.authService.isAuthenticated()) {
      this.authService.logoutApi().subscribe({
        next: () => {
          this.authService.logout();
          this.router.navigate(['/login']);
        },
        error: () => {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      });
    } else {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
