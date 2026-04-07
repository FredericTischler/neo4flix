import { Component, ChangeDetectionStrategy, input, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Movie } from '../../../core/models/movie.model';
import { WatchlistService } from '../../../core/services/watchlist.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative group">
      <a
        [routerLink]="['/movies', movie().movieId]"
        class="block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:scale-[1.03] hover:border-gray-700 transition-all duration-200"
      >
        <div class="aspect-[2/3] bg-gray-800 flex items-center justify-center p-4">
          <span class="text-center text-gray-300 font-semibold text-lg leading-tight group-hover:text-white transition-colors">
            {{ movie().title }}
          </span>
        </div>
        <div class="p-4 space-y-2">
          <h3 class="font-semibold text-gray-100 truncate">{{ movie().title }}</h3>
          <p class="text-sm text-gray-400">{{ movie().year }}</p>
          <div class="flex flex-wrap gap-1.5">
            @for (genre of movie().genres; track genre) {
              <span class="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                {{ genre }}
              </span>
            }
          </div>
          <div class="flex items-center justify-between pt-1">
            <div class="flex items-center gap-1.5">
              <span class="text-yellow-500 text-sm">★</span>
              <span class="text-sm font-medium text-gray-200">{{ movie().avgRating | number:'1.1-1' }}</span>
            </div>
            <span class="text-xs text-gray-500">{{ movie().voteCount }} votes</span>
          </div>
        </div>
      </a>

      <!-- Watchlist toggle -->
      <button
        (click)="toggleWatchlist($event)"
        class="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-gray-900/80 border border-gray-700 opacity-0 group-hover:opacity-100 transition-all"
        [class.text-amber-400]="inWatchlist()"
        [class.text-gray-400]="!inWatchlist()"
        [class.hover:text-amber-300]="inWatchlist()"
        [class.hover:text-white]="!inWatchlist()"
        [title]="inWatchlist() ? 'Remove from watchlist' : 'Add to watchlist'"
      >
        <svg class="w-5 h-5" [attr.fill]="inWatchlist() ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
      </button>
    </div>
  `,
})
export default class MovieCardComponent implements OnInit {
  movie = input.required<Movie>();
  private watchlistService = inject(WatchlistService);

  inWatchlist = signal(false);

  ngOnInit(): void {
    const movieId = String(this.movie().movieId);
    this.inWatchlist.set(this.watchlistService.watchlistIds().has(movieId));
  }

  toggleWatchlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const movieId = String(this.movie().movieId);

    if (this.inWatchlist()) {
      this.watchlistService.removeFromWatchlist(movieId).subscribe({
        next: () => {
          this.inWatchlist.set(false);
          this.watchlistService.toggleWatchlistId(movieId, false);
        },
      });
    } else {
      this.watchlistService.addToWatchlist(movieId).subscribe({
        next: () => {
          this.inWatchlist.set(true);
          this.watchlistService.toggleWatchlistId(movieId, true);
        },
      });
    }
  }
}