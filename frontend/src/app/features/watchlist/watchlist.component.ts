import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WatchlistService } from '../../core/services/watchlist.service';
import { Movie } from '../../core/models/movie.model';
import MovieCardComponent from '../../shared/components/movie-card/movie-card.component';
import PaginationComponent from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [RouterLink, MovieCardComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="text-2xl font-bold text-gray-100 mb-6">My Watchlist</h2>

    @if (isLoading()) {
      <div class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    } @else if (movies().length === 0) {
      <div class="text-center py-20 space-y-4">
        <svg class="w-16 h-16 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
        <p class="text-gray-500 text-lg">Your watchlist is empty</p>
        <a routerLink="/home" class="inline-block px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500 transition-colors">
          Discover movies
        </a>
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        @for (movie of movies(); track movie.movieId) {
          <div class="relative group/card">
            <app-movie-card [movie]="movie" />
            <button
              (click)="removeFromWatchlist(movie.movieId)"
              class="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-gray-900/80 border border-gray-700 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 opacity-0 group-hover/card:opacity-100 transition-all"
              title="Remove from watchlist"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }
      </div>

      <app-pagination
        [currentPage]="currentPage()"
        [totalPages]="totalPages()"
        (pageChange)="onPageChange($event)"
      />
    }
  `,
})
export default class WatchlistComponent {
  private watchlistService = inject(WatchlistService);

  movies = signal<Movie[]>([]);
  currentPage = signal(0);
  totalPages = signal(0);
  isLoading = signal(true);

  constructor() {
    this.loadWatchlist(0);
  }

  private loadWatchlist(page: number): void {
    this.isLoading.set(true);
    this.watchlistService.getWatchlist(page, 20).subscribe({
      next: (res) => {
        this.movies.set(
          res.content.map((item) => ({
            movieId: Number(item.movieId),
            title: item.movieTitle,
            year: item.year,
            genres: item.genres,
            avgRating: 0,
            voteCount: 0,
          }))
        );
        this.totalPages.set(res.totalPages);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  removeFromWatchlist(movieId: number): void {
    const id = String(movieId);
    this.watchlistService.removeFromWatchlist(id).subscribe({
      next: () => {
        this.movies.update((list) => list.filter((m) => m.movieId !== movieId));
        this.watchlistService.toggleWatchlistId(id, false);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadWatchlist(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}