import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecommendationService, RecommendationParams } from '../../core/services/recommendation.service';
import { GenreService } from '../../core/services/genre.service';
import { AuthService } from '../../core/services/auth.service';
import MovieCardComponent from '../../shared/components/movie-card/movie-card.component';
import PaginationComponent from '../../shared/components/pagination/pagination.component';

type Tab = 'combined' | 'collaborative' | 'content-based';

const SOURCE_COLORS: Record<string, string> = {
  collaborative: 'bg-blue-900/60 text-blue-300 border-blue-700',
  'content-based': 'bg-green-900/60 text-green-300 border-green-700',
  gds: 'bg-purple-900/60 text-purple-300 border-purple-700',
  popular: 'bg-gray-700/60 text-gray-300 border-gray-600',
};

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [FormsModule, RouterLink, MovieCardComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Main content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-100">Recommendations</h2>
          <button
            (click)="shareRecommendations()"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-1.102-4.243a4 4 0 015.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            {{ copied() ? 'Copied!' : 'Share' }}
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-800 mb-6">
          @for (tab of tabs; track tab.key) {
            <button
              (click)="switchTab(tab.key)"
              class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
              [class]="activeTab() === tab.key
                ? 'text-red-400 border-red-500'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <!-- Filters -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8 p-4 bg-gray-900 rounded-xl border border-gray-800">
          <select
            [ngModel]="genre()"
            (ngModelChange)="genre.set($event); applyFilters()"
            class="rounded-lg border-gray-700 bg-gray-800 text-gray-100 text-sm focus:border-red-500 focus:ring-red-500/20"
          >
            <option value="">All genres</option>
            @for (g of genreService.genres(); track g.name) {
              <option [value]="g.name">{{ g.name }}</option>
            }
          </select>
          <input
            type="number"
            placeholder="Year from"
            [ngModel]="yearFrom()"
            (ngModelChange)="yearFrom.set($event)"
            (change)="applyFilters()"
            class="rounded-lg border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 text-sm focus:border-red-500 focus:ring-red-500/20"
          />
          <input
            type="number"
            placeholder="Year to"
            [ngModel]="yearTo()"
            (ngModelChange)="yearTo.set($event)"
            (change)="applyFilters()"
            class="rounded-lg border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 text-sm focus:border-red-500 focus:ring-red-500/20"
          />
          <select
            [ngModel]="minRating()"
            (ngModelChange)="minRating.set($event); applyFilters()"
            class="rounded-lg border-gray-700 bg-gray-800 text-gray-100 text-sm focus:border-red-500 focus:ring-red-500/20"
          >
            <option value="">Min rating</option>
            <option value="1">★ 1+</option>
            <option value="2">★ 2+</option>
            <option value="3">★ 3+</option>
            <option value="4">★ 4+</option>
          </select>
        </div>

        @if (recService.isLoading()) {
          <div class="flex justify-center py-20">
            <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (recService.recommendations().length === 0) {
          <div class="text-center py-20 space-y-4">
            <p class="text-gray-400 text-lg">No recommendations yet.</p>
            <p class="text-gray-500 text-sm">Start rating movies to get personalized recommendations!</p>
            <a routerLink="/home" class="inline-block mt-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors">
              Browse movies
            </a>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (rec of recService.recommendations(); track rec.movieId) {
              <div class="relative">
                <app-movie-card [movie]="toMovie(rec)" [sources]="rec.sources" />
              </div>
            }
          </div>
          <app-pagination
            [currentPage]="currentPage()"
            [totalPages]="recService.totalPages()"
            (pageChange)="onPageChange($event)"
          />
        }
      </div>

      <!-- Similar users sidebar -->
      <aside class="lg:w-72 shrink-0">
        <h3 class="text-lg font-semibold text-gray-100 mb-4">Similar Users</h3>
        @if (recService.similarUsers().length === 0) {
          <p class="text-sm text-gray-500">No similar users found yet.</p>
        } @else {
          <div class="space-y-3">
            @for (user of recService.similarUsers(); track user.userId) {
              <a
                [routerLink]="['/shared', user.userId]"
                class="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <span class="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {{ user.username.charAt(0).toUpperCase() }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-200 truncate">{{ user.username }}</p>
                  <div class="mt-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div class="h-full rounded-full bg-red-500" [style.width.%]="user.similarity * 100"></div>
                  </div>
                </div>
                <span class="text-xs text-gray-400 shrink-0">{{ (user.similarity * 100).toFixed(0) }}%</span>
              </a>
            }
          </div>
        }
      </aside>
    </div>
  `,
})
export default class RecommendationsComponent implements OnInit {
  recService = inject(RecommendationService);
  genreService = inject(GenreService);
  private authService = inject(AuthService);

  activeTab = signal<Tab>('combined');
  genre = signal('');
  yearFrom = signal<number | null>(null);
  yearTo = signal<number | null>(null);
  minRating = signal<string>('');
  currentPage = signal(0);
  copied = signal(false);

  tabs = [
    { key: 'combined' as Tab, label: 'For You' },
    { key: 'collaborative' as Tab, label: 'Similar Tastes' },
    { key: 'content-based' as Tab, label: 'By Genre' },
  ];

  ngOnInit(): void {
    this.loadRecommendations();
    this.recService.getSimilarUsers();
  }

  switchTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.currentPage.set(0);
    this.loadRecommendations();
  }

  applyFilters(): void {
    this.currentPage.set(0);
    this.loadRecommendations();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadRecommendations();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  shareRecommendations(): void {
    const userId = this.authService.currentUser()?.userId;
    if (!userId) return;
    const url = `${window.location.origin}/shared/${userId}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  toMovie(rec: any): any {
    return {
      movieId: rec.movieId,
      title: rec.title,
      year: rec.year,
      genres: rec.genres,
      avgRating: rec.avgRating,
      voteCount: rec.voteCount,
    };
  }

  private loadRecommendations(): void {
    const params: RecommendationParams = {
      page: this.currentPage(),
      size: 20,
    };
    if (this.genre()) params.genre = this.genre();
    if (this.yearFrom()) params.yearFrom = this.yearFrom()!;
    if (this.yearTo()) params.yearTo = this.yearTo()!;
    if (this.minRating()) params.minRating = +this.minRating();

    switch (this.activeTab()) {
      case 'combined':
        this.recService.getRecommendations(params);
        break;
      case 'collaborative':
        this.recService.getCollaborative(params);
        break;
      case 'content-based':
        this.recService.getContentBased(params);
        break;
    }
  }
}