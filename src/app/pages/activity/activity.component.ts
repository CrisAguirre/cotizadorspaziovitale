import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.css']
})
export class ActivityComponent implements OnInit {
  activities: any[] = [];
  isLoading: boolean = true;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.loadActivities();
  }

  loadActivities(): void {
    this.authService.getActivities().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.activities = res.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching activities:', err);
        this.isLoading = false;
      }
    });
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: 'ADMIN',
      comercial: 'ASESOR COMERCIAL',
      contabilidad: 'CONTABILIDAD',
      diseno: 'DISEÑO'
    };
    return labels[role] || (role ? String(role).toUpperCase() : '');
  }

  roleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      admin: 'badge-admin',
      comercial: 'badge-comercial',
      contabilidad: 'badge-contabilidad',
      diseno: 'badge-diseno'
    };
    return classes[role] || 'badge-designer';
  }
}
