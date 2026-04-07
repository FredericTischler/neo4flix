import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { RatingService } from '../../core/services/rating.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import QRCode from 'qrcode';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-2xl mx-auto space-y-8">
      <h2 class="text-2xl font-bold text-gray-100">Profile</h2>

      <!-- User info -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <div class="flex items-center gap-4 mb-2">
          <span class="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-2xl font-bold text-white">
            {{ authService.currentUser()?.username?.charAt(0)?.toUpperCase() }}
          </span>
          <div>
            <h3 class="text-lg font-semibold text-gray-100">{{ authService.currentUser()?.username }}</h3>
            <p class="text-sm text-gray-400">{{ authService.currentUser()?.email }}</p>
          </div>
        </div>

        @if (isEditing()) {
          <div class="space-y-4 pt-4 border-t border-gray-800">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input
                type="text"
                [ngModel]="editUsername()"
                (ngModelChange)="editUsername.set($event)"
                class="w-full rounded-lg border-gray-700 bg-gray-800 text-gray-100 text-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                [ngModel]="editEmail()"
                (ngModelChange)="editEmail.set($event)"
                class="w-full rounded-lg border-gray-700 bg-gray-800 text-gray-100 text-sm focus:border-red-500 focus:ring-red-500/20"
              />
            </div>
            <div class="flex gap-3">
              <button
                (click)="saveProfile()"
                [disabled]="saving()"
                class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
              <button
                (click)="isEditing.set(false)"
                class="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium border border-gray-700 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
            @if (saveError()) {
              <p class="text-sm text-red-400">{{ saveError() }}</p>
            }
            @if (saveSuccess()) {
              <p class="text-sm text-green-400">Profile updated!</p>
            }
          </div>
        } @else {
          <button
            (click)="startEditing()"
            class="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
          >
            Edit profile
          </button>
        }
      </div>

      <!-- 2FA -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <h3 class="text-lg font-semibold text-gray-100">Two-Factor Authentication</h3>

        @if (authService.currentUser()?.twoFactorEnabled) {
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span class="text-sm text-gray-300">2FA is enabled</span>
          </div>
          @if (confirmDisable()) {
            <div class="p-4 bg-red-900/20 border border-red-800/40 rounded-lg space-y-3">
              <p class="text-sm text-red-300">Are you sure you want to disable 2FA? This will reduce account security.</p>
              <div class="flex gap-3">
                <button
                  (click)="disable2fa()"
                  class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors"
                >
                  Disable 2FA
                </button>
                <button
                  (click)="confirmDisable.set(false)"
                  class="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium border border-gray-700 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          } @else {
            <button
              (click)="confirmDisable.set(true)"
              class="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Disable 2FA
            </button>
          }
        } @else {
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
            <span class="text-sm text-gray-400">2FA is not enabled</span>
          </div>

          @if (qrCodeUri()) {
            <div class="space-y-4">
              <p class="text-sm text-gray-300">Scan this code with your authenticator app:</p>
              @if (qrCodeDataUrl()) {
                <div class="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
                  <img [src]="qrCodeDataUrl()" alt="QR Code" class="w-48 h-48" />
                </div>
              }
              <div class="flex items-center gap-2">
                <p class="text-xs text-gray-500 truncate flex-1">{{ qrCodeUri() }}</p>
                <button
                  (click)="copySecret()"
                  class="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs border border-gray-700 hover:bg-gray-700 transition-colors shrink-0"
                >
                  {{ secretCopied() ? 'Copied!' : 'Copy' }}
                </button>
              </div>
            </div>

            @if (showConfirm2fa()) {
              <div class="space-y-3 pt-4 border-t border-gray-800">
                <label class="block text-sm font-medium text-gray-300">Enter 6-digit code from your authenticator</label>
                <div class="flex gap-3">
                  <input
                    type="text"
                    maxlength="6"
                    [ngModel]="totpCode()"
                    (ngModelChange)="totpCode.set($event)"
                    placeholder="000000"
                    class="w-36 rounded-lg border-gray-700 bg-gray-800 text-gray-100 text-sm text-center tracking-widest focus:border-red-500 focus:ring-red-500/20"
                  />
                  <button
                    (click)="confirm2fa()"
                    [disabled]="totpCode().length !== 6"
                    class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    Verify
                  </button>
                </div>
                @if (tfaError()) {
                  <p class="text-sm text-red-400">{{ tfaError() }}</p>
                }
              </div>
            } @else {
              <button
                (click)="showConfirm2fa.set(true)"
                class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors"
              >
                I've scanned it — verify code
              </button>
            }
          } @else {
            <button
              (click)="enable2fa()"
              class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors"
            >
              Enable 2FA
            </button>
          }
        }
      </div>

      <!-- Stats -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Statistics</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 bg-gray-800 rounded-lg text-center">
            <p class="text-2xl font-bold text-red-400">{{ ratedCount() }}</p>
            <p class="text-sm text-gray-400 mt-1">Movies rated</p>
          </div>
          <div class="p-4 bg-gray-800 rounded-lg text-center">
            <p class="text-2xl font-bold text-amber-400">{{ watchlistCount() }}</p>
            <p class="text-sm text-gray-400 mt-1">In watchlist</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export default class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private ratingService = inject(RatingService);
  private watchlistService = inject(WatchlistService);

  isEditing = signal(false);
  editUsername = signal('');
  editEmail = signal('');
  saving = signal(false);
  saveError = signal('');
  saveSuccess = signal(false);

  qrCodeUri = signal<string | null>(null);
  qrCodeDataUrl = signal<string | null>(null);
  showConfirm2fa = signal(false);
  totpCode = signal('');
  tfaError = signal('');
  confirmDisable = signal(false);
  secretCopied = signal(false);

  ratedCount = signal(0);
  watchlistCount = signal(0);

  ngOnInit(): void {
    this.loadStats();
  }

  startEditing(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.editUsername.set(user.username);
      this.editEmail.set(user.email);
    }
    this.saveError.set('');
    this.saveSuccess.set(false);
    this.isEditing.set(true);
  }

  saveProfile(): void {
    this.saving.set(true);
    this.saveError.set('');
    this.http.put<any>('/api/users/me', {
      username: this.editUsername(),
      email: this.editEmail(),
    }).subscribe({
      next: (user) => {
        this.authService.currentUser.set(user);
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => {
          this.isEditing.set(false);
          this.saveSuccess.set(false);
        }, 1500);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err.error?.message || 'Failed to update profile');
      },
    });
  }

  enable2fa(): void {
    this.http.post<{ qrCodeUri: string }>('/api/users/me/enable-2fa', {}).subscribe({
      next: (res) => {
        this.qrCodeUri.set(res.qrCodeUri);
        this.showConfirm2fa.set(false);
        this.totpCode.set('');
        this.tfaError.set('');
        QRCode.toDataURL(res.qrCodeUri, { width: 200, margin: 1 })
          .then(url => this.qrCodeDataUrl.set(url));
      },
      error: () => this.tfaError.set('Failed to enable 2FA'),
    });
  }

  confirm2fa(): void {
    this.tfaError.set('');
    this.http.post<any>('/api/users/me/confirm-2fa', { code: this.totpCode() }).subscribe({
      next: () => {
        const user = this.authService.currentUser();
        if (user) {
          this.authService.currentUser.set({ ...user, twoFactorEnabled: true });
        }
        this.qrCodeUri.set(null);
        this.qrCodeDataUrl.set(null);
        this.showConfirm2fa.set(false);
        this.totpCode.set('');
      },
      error: () => this.tfaError.set('Invalid code. Please try again.'),
    });
  }

  disable2fa(): void {
    this.http.delete<any>('/api/users/me/disable-2fa').subscribe({
      next: () => {
        const user = this.authService.currentUser();
        if (user) {
          this.authService.currentUser.set({ ...user, twoFactorEnabled: false });
        }
        this.confirmDisable.set(false);
      },
    });
  }

  copySecret(): void {
    const uri = this.qrCodeUri();
    if (uri) {
      navigator.clipboard.writeText(uri).then(() => {
        this.secretCopied.set(true);
        setTimeout(() => this.secretCopied.set(false), 2000);
      });
    }
  }

  private loadStats(): void {
    this.http.get<any>('/api/ratings/me', { params: { page: '0', size: '1' } }).subscribe({
      next: (res) => this.ratedCount.set(res.totalElements || 0),
      error: () => this.ratedCount.set(0),
    });
    this.watchlistService.getWatchlist(0, 1).subscribe({
      next: (res) => this.watchlistCount.set(res.totalElements || 0),
      error: () => this.watchlistCount.set(0),
    });
  }
}