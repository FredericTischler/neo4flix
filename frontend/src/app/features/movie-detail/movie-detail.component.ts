import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MovieService } from '../../core/services/movie.service';
import { RatingService } from '../../core/services/rating.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { Movie } from '../../core/models/movie.model';
import StarRatingComponent from '../../shared/components/star-rating/star-rating.component';

const GENRE_COLORS: Record<string, string> = {
  Action: 'bg-red-900/60 text-red-300 border-red-800',
  Comedy: 'bg-yellow-900/60 text-yellow-300 border-yellow-800',
  Drama: 'bg-blue-900/60 text-blue-300 border-blue-800',
  Horror: 'bg-purple-900/60 text-purple-300 border-purple-800',
  Romance: 'bg-pink-900/60 text-pink-300 border-pink-800',
  'Sci-Fi': 'bg-cyan-900/60 text-cyan-300 border-cyan-800',
  Thriller: 'bg-orange-900/60 text-orange-300 border-orange-800',
  Animation: 'bg-green-900/60 text-green-300 border-green-800',
  Documentary: 'bg-teal-900/60 text-teal-300 border-teal-800',
  Fantasy: 'bg-indigo-900/60 text-indigo-300 border-indigo-800',
};
const DEFAULT_GENRE_COLOR = 'bg-gray-800 text-gray-300 border-gray-700';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    } @else if (movie()) {
      <button
        (click)="goBack()"
        class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back
      </button>

      <div class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8">
        <!-- Placeholder poster -->
        <div class="aspect-[2/3] rounded-xl bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 border border-gray-700 flex items-center justify-center p-6">
          <span class="text-2xl font-bold text-gray-400 text-center leading-tight">{{ movie()!.title }}</span>
        </div>

        <!-- Info -->
        <div class="space-y-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-100">{{ movie()!.title }}</h1>
            <p class="text-lg text-gray-400 mt-1">{{ movie()!.year }}</p>
          </div>

          <!-- Genres -->
          <div class="flex flex-wrap gap-2">
            @for (genre of movie()!.genres; track genre) {
              <span class="px-3 py-1 text-sm rounded-full border" [class]="genreColor(genre)">
                {{ genre }}
              </span>
            }
          </div>

          <!-- Average rating -->
          <div class="flex items-center gap-3">
            <app-star-rating [rating]="movie()!.avgRating" [readonly]="true" />
            <span class="text-sm text-gray-400">{{ movie()!.voteCount }} votes</span>
          </div>

          <!-- Watchlist button -->
          <button
            (click)="toggleWatchlist()"
            [disabled]="watchlistLoading()"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            [class]="isInWatchlist()
              ? 'bg-amber-600/20 text-amber-400 border border-amber-600/40 hover:bg-amber-600/30'
              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white'"
          >
            <svg class="w-5 h-5" [attr.fill]="isInWatchlist() ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            {{ isInWatchlist() ? 'Remove from watchlist' : 'Add to watchlist' }}
          </button>

          <!-- User rating section -->
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wide">My Rating</h3>
            <app-star-rating
              [rating]="userRating()"
              [readonly]="false"
              (ratingChange)="onRate($event)"
            />
            @if (userRating() > 0) {
              <button
                (click)="onDeleteRating()"
                class="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Remove my rating
              </button>
            }
            @if (ratingSuccess()) {
              <p class="text-sm text-green-400 animate-pulse">Rating saved!</p>
            }
          </div>
        </div>
      </div>
    } @else {
      <p class="text-center text-gray-500 py-20">Movie not found.</p>
    }
  `,
})
export default class MovieDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private movieService = inject(MovieService);
  private ratingService = inject(RatingService);
  private watchlistService = inject(WatchlistService);

  movie = signal<Movie | null>(null);
  userRating = signal(0);
  isInWatchlist = signal(false);
  isLoading = signal(true);
  watchlistLoading = signal(false);
  ratingSuccess = signal(false);

  ngOnInit(): void {
    const movieId = this.route.snapshot.paramMap.get('movieId')!;

    forkJoin({
      movie: this.movieService.getMovie(Number(movieId)),
      watchlisted: this.watchlistService.isInWatchlist(movieId),
    }).subscribe({
      next: ({ movie, watchlisted }) => {
        this.movie.set(movie);
        this.isInWatchlist.set(watchlisted);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    this.ratingService.getUserRatingForMovie(movieId).subscribe({
      next: (rating) => this.userRating.set(rating.score),
      error: () => {},
    });
  }

  genreColor(genre: string): string {
    return GENRE_COLORS[genre] ?? DEFAULT_GENRE_COLOR;
  }

  onRate(score: number): void {
    const movieId = String(this.movie()!.movieId);
    this.ratingService.rateMovie(movieId, score).subscribe({
      next: () => {
        this.userRating.set(score);
        this.ratingSuccess.set(true);
        setTimeout(() => this.ratingSuccess.set(false), 2000);
      },
    });
  }

  onDeleteRating(): void {
    const movieId = String(this.movie()!.movieId);
    this.ratingService.deleteRating(movieId).subscribe({
      next: () => this.userRating.set(0),
    });
  }

  toggleWatchlist(): void {
    const movieId = String(this.movie()!.movieId);
    this.watchlistLoading.set(true);
    if (this.isInWatchlist()) {
      this.watchlistService.removeFromWatchlist(movieId).subscribe({
        next: () => {
          this.isInWatchlist.set(false);
          this.watchlistService.toggleWatchlistId(movieId, false);
          this.watchlistLoading.set(false);
        },
        error: () => this.watchlistLoading.set(false),
      });
    } else {
      this.watchlistService.addToWatchlist(movieId).subscribe({
        next: () => {
          this.isInWatchlist.set(true);
          this.watchlistService.toggleWatchlistId(movieId, true);
          this.watchlistLoading.set(false);
        },
        error: () => this.watchlistLoading.set(false),
      });
    }
  }

  goBack(): void {
    this.location.back();
  }
}