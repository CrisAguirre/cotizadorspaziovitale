import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  serverReady: boolean = false;
  wakeSeconds: number = 0;
  private wakeSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.startWakeUp();
  }

  ngOnDestroy(): void {
    this.wakeSub?.unsubscribe();
  }

  private startWakeUp(): void {
    const source = interval(2000).pipe(
      switchMap(() => this.authService.wakeUp().pipe(catchError(() => of(null))))
    );
    this.wakeSub = source.subscribe((res) => {
      this.wakeSeconds++;
      if (res) {
        this.serverReady = true;
        this.wakeSub?.unsubscribe();
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          if (response.user) {
            this.authService.saveUser(response.user, response.expiresAt);
          }
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Error de conexión con el servidor.';
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
