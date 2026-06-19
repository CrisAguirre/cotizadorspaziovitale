import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TemporalService, TemporalData } from '../../services/temporal.service';

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
    private temporalService: TemporalService
  ) {}

  ngOnInit() {
    this.temporalService.temporals$.subscribe(data => {
      this.temporals = data;
    });
  }

  deleteTemporal(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('¿Eliminar cotización temporal?')) {
      this.temporalService.deleteTemporal(id).subscribe();
    }
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
