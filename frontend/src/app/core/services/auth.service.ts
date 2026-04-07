import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { TokenService } from './token.service';
import { UserProfile } from '../models/user.model';
import {
  AuthResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  Verify2faRequest,
  isTwoFactorRequired,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenService = inject(TokenService);

  currentUser = signal<UserProfile | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);
  tempToken = signal<string | null>(null);

  constructor() {
    if (this.tokenService.isAuthenticated()) {
      this.loadProfile();
    }
  }

  register(req: RegisterRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>('/api/auth/register', req);
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', req).pipe(
      tap((res) => {
        if (isTwoFactorRequired(res)) {
          this.tempToken.set(res.tempToken);
        } else {
          this.tokenService.setTokens(res.accessToken, res.refreshToken);
          this.loadProfile();
        }
      })
    );
  }

  verify2fa(req: Verify2faRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/verify-2fa', req).pipe(
      tap((res) => {
        this.tokenService.setTokens(res.accessToken, res.refreshToken);
        this.tempToken.set(null);
        this.loadProfile();
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.tokenService.getRefreshToken();
    return this.http
      .post<AuthResponse>('/api/auth/refresh', { refreshToken })
      .pipe(
        tap((res) => {
          this.tokenService.setTokens(res.accessToken, res.refreshToken);
        })
      );
  }

  logout(): void {
    this.tokenService.removeTokens();
    this.currentUser.set(null);
    this.tempToken.set(null);
    this.router.navigate(['/login']);
  }

  loadProfile(): void {
    this.http.get<UserProfile>('/api/users/me').subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => this.logout(),
    });
  }
}