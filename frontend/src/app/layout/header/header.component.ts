import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
        <a routerLink="/home" class="text-2xl font-bold text-red-500 tracking-tight shrink-0">Neo4flix</a>

        <nav class="hidden md:flex items-center gap-1">
          <a
            routerLink="/home"
            routerLinkActive="text-white bg-gray-800/60"
            class="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >Home</a>
          <a
            routerLink="/recommendations"
            routerLinkActive="text-white bg-gray-800/60"
            class="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >Recommendations</a>
          <a
            routerLink="/watchlist"
            routerLinkActive="text-white bg-gray-800/60"
            class="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >Watchlist</a>
        </nav>

        <div class="flex-1 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search movies…"
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
            (keydown.enter)="onSearch()"
            class="w-full rounded-lg border-gray-700 bg-gray-900/60 text-gray-100 placeholder-gray-500 text-sm focus:border-red-500 focus:ring-red-500/20 transition-colors"
          />
        </div>

        <div class="relative shrink-0">
          <button
            (click)="menuOpen.set(!menuOpen())"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span class="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white">
              {{ userInitial() }}
            </span>
            <span class="hidden sm:inline">{{ authService.currentUser()?.username }}</span>
          </button>

          @if (menuOpen()) {
            <div class="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1">
              <a routerLink="/profile" class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white">Profile</a>
              <button
                (click)="onLogout()"
                class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >Logout</button>
            </div>
          }
        </div>
      </div>

      <!-- Mobile nav -->
      <nav class="md:hidden flex items-center gap-1 px-4 pb-2">
        <a
          routerLink="/home"
          routerLinkActive="text-white bg-gray-800/60"
          class="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
        >Home</a>
        <a
          routerLink="/recommendations"
          routerLinkActive="text-white bg-gray-800/60"
          class="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
        >Recs</a>
        <a
          routerLink="/watchlist"
          routerLinkActive="text-white bg-gray-800/60"
          class="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
        >Watchlist</a>
      </nav>
    </header>
  `,
})
export default class HeaderComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  searchQuery = signal('');
  menuOpen = signal(false);

  userInitial = () => {
    const user = this.authService.currentUser();
    return user ? user.username.charAt(0).toUpperCase() : '?';
  };

  onSearch(): void {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/search'], { queryParams: { title: q } });
    }
  }

  onLogout(): void {
    this.menuOpen.set(false);
    this.authService.logout();
  }
}