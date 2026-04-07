import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-2fa.component.html',
})
export default class Verify2faComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  ngOnInit(): void {
    if (!this.authService.tempToken()) {
      this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const tempToken = this.authService.tempToken();
    if (!tempToken) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService
      .verify2fa({ tempToken, code: this.form.getRawValue().code })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/home']);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Invalid code. Please try again.');
        },
      });
  }
}