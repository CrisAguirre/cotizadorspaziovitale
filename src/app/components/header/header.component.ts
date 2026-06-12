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
}
