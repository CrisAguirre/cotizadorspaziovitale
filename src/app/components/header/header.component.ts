import { Component, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  constructor(
    public authService: AuthService,
    public themeService: ThemeService
  ) {}

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  getRoleLabel(): string {
    const role = this.authService.getUser()?.role;
    const labels: Record<string, string> = {
      admin: 'Administrador',
      comercial: 'Asesor Comercial',
      contabilidad: 'Contabilidad',
      diseno: 'Diseño'
    };
    return labels[role] || (role ? String(role).toUpperCase() : 'Usuario');
  }
}
