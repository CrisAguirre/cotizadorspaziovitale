import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeKey = 'app-theme';
  private darkTheme = 'dark';
  private lightTheme = 'light';

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem(this.themeKey);
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme(this.darkTheme);
    }
  }

  setTheme(theme: string): void {
    localStorage.setItem(this.themeKey, theme);
    if (theme === this.lightTheme) {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }

  toggleTheme(): void {
    const currentTheme = localStorage.getItem(this.themeKey) || this.darkTheme;
    const newTheme = currentTheme === this.darkTheme ? this.lightTheme : this.darkTheme;
    this.setTheme(newTheme);
  }

  isDarkTheme(): boolean {
    return (localStorage.getItem(this.themeKey) || this.darkTheme) === this.darkTheme;
  }
}
