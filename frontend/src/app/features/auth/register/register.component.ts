import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
})
export default class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  passwordValue = signal('');
  confirmValue = signal('');
  formValid = signal(false);

  hasMinLength = computed(() => this.passwordValue().length >= 8);
  hasUpperCase = computed(() => /[A-Z]/.test(this.passwordValue()));
  hasLowerCase = computed(() => /[a-z]/.test(this.passwordValue()));
  hasDigit = computed(() => /\d/.test(this.passwordValue()));
  hasSpecial = computed(() => /[^a-zA-Z0-9]/.test(this.passwordValue()));
  passwordsMatch = computed(() => this.passwordValue() === this.confirmValue() && this.confirmValue().length > 0);

  criteria = computed(() => [
    { label: 'At least 8 characters', met: this.hasMinLength() },
    { label: 'One uppercase letter', met: this.hasUpperCase() },
    { label: 'One lowercase letter', met: this.hasLowerCase() },
    { label: 'One digit', met: this.hasDigit() },
    { label: 'One special character', met: this.hasSpecial() },
  ]);

  allCriteriaMet = computed(
    () => this.hasMinLength() && this.hasUpperCase() && this.hasLowerCase() && this.hasDigit() && this.hasSpecial()
  );

  canSubmit = computed(() => this.formValid() && this.allCriteriaMet() && this.passwordsMatch());

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit(): void {
    this.form.statusChanges.subscribe(() => {
      this.formValid.set(this.form.valid);
    });
  }

  onPasswordInput(event: Event): void {
    this.passwordValue.set((event.target as HTMLInputElement).value);
  }

  onConfirmInput(event: Event): void {
    this.confirmValue.set((event.target as HTMLInputElement).value);
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, email, password } = this.form.getRawValue();
    this.authService.register({ username, email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/login'], {
          queryParams: { registered: 'true' },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.status === 409
            ? err.error?.message || 'Username or email already taken'
            : err.error?.message || 'An error occurred'
        );
      },
    });
  }
}