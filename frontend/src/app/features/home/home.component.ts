import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MovieService } from '../../core/services/movie.service';
import MovieCardComponent from '../../shared/components/movie-card/movie-card.component';
import PaginationComponent from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MovieCardComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="text-2xl font-bold text-gray-100 mb-6">Popular Movies</h2>

    @if (movieService.isLoading()) {
      <div class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        @for (movie of movieService.movies(); track movie.movieId) {
          <app-movie-card [movie]="movie" />
        }
      </div>

      @if (movieService.movies().length === 0) {
        <p class="text-center text-gray-500 py-20">No movies found.</p>
      }

      <app-pagination
        [currentPage]="currentPage()"
        [totalPages]="movieService.totalPages()"
        (pageChange)="onPageChange($event)"
      />
    }
  `,
})
export default class HomeComponent {
  movieService = inject(MovieService);
  currentPage = signal(0);

  constructor() {
    this.movieService.getMovies(0, 20);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.movieService.getMovies(page, 20);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}