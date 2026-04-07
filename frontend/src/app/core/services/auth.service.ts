import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, shareReplay, of, catchError } from 'rxjs';
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

  private profileLoad$: Observable<UserProfile> | null = null;

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
          this.profileLoad$ = null;
          this.ensureProfile().subscribe();
        }
      })
    );
  }

  verify2fa(req: Verify2faRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/verify-2fa', req).pipe(
      tap((res) => {
        this.tokenService.setTokens(res.accessToken, res.refreshToken);
        this.tempToken.set(null);
        this.profileLoad$ = null;
        this.ensureProfile().subscribe();
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
    this.profileLoad$ = null;
    this.router.navigate(['/login']);
  }

  /**
   * Returns a shared Observable that loads the profile once.
   * Multiple callers (guard, constructor) share the same HTTP call.
   */
  ensureProfile(): Observable<UserProfile> {
    if (this.currentUser()) {
      return of(this.currentUser()!);
    }

    if (!this.profileLoad$) {
      this.profileLoad$ = this.http.get<UserProfile>('/api/users/me').pipe(
        tap((user) => this.currentUser.set(user)),
        catchError((err) => {
          this.profileLoad$ = null;
          throw err;
        }),
        shareReplay(1)
      );
    }

    return this.profileLoad$;
  }
}