import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../core/services/movie.service';
import { GenreService } from '../../core/services/genre.service';
import { SearchParams } from '../../core/models/movie.model';
import MovieCardComponent from '../../shared/components/movie-card/movie-card.component';
import PaginationComponent from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, MovieCardComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="text-2xl font-bold text-gray-100 mb-6">Search Movies</h2>

    <!-- Filters -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8 p-4 bg-gray-900 rounded-xl border border-gray-800">
      <input
        type="text"
        placeholder="Title…"
        [ngModel]="title()"
        (ngModelChange)="title.set($event)"
        (keydown.enter)="applyFilters()"
        class="rounded-lg border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 text-sm focus:border-red-500 focus:ring-red-500/20"
      />
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
        <p class="text-center text-gray-500 py-20">No results found. Try adjusting your filters.</p>
      }

      <app-pagination
        [currentPage]="currentPage()"
        [totalPages]="movieService.totalPages()"
        (pageChange)="onPageChange($event)"
      />
    }
  `,
})
export default class SearchComponent {
  movieService = inject(MovieService);
  genreService = inject(GenreService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  title = signal('');
  genre = signal('');
  yearFrom = signal<number | null>(null);
  yearTo = signal<number | null>(null);
  minRating = signal<string>('');
  currentPage = signal(0);

  constructor() {
    effect(() => {
      const params = this.route.snapshot.queryParams;
      if (params['title']) this.title.set(params['title']);
      if (params['genre']) this.genre.set(params['genre']);
      if (params['yearFrom']) this.yearFrom.set(+params['yearFrom']);
      if (params['yearTo']) this.yearTo.set(+params['yearTo']);
      if (params['minRating']) this.minRating.set(params['minRating']);
      this.doSearch();
    });
  }

  applyFilters(): void {
    this.currentPage.set(0);
    this.updateQueryParams();
    this.doSearch();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.doSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private doSearch(): void {
    const params: SearchParams = {
      page: this.currentPage(),
      size: 20,
    };
    if (this.title()) params.title = this.title();
    if (this.genre()) params.genre = this.genre();
    if (this.yearFrom()) params.yearFrom = this.yearFrom()!;
    if (this.yearTo()) params.yearTo = this.yearTo()!;
    if (this.minRating()) params.minRating = +this.minRating();

    this.movieService.searchMovies(params);
  }

  private updateQueryParams(): void {
    const queryParams: Record<string, string | undefined> = {};
    if (this.title()) queryParams['title'] = this.title();
    if (this.genre()) queryParams['genre'] = this.genre();
    if (this.yearFrom()) queryParams['yearFrom'] = String(this.yearFrom());
    if (this.yearTo()) queryParams['yearTo'] = String(this.yearTo());
    if (this.minRating()) queryParams['minRating'] = this.minRating();

    this.router.navigate([], { queryParams, queryParamsHandling: 'replace' });
  }
}