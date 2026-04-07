import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Movie, PageResponse, SearchParams } from '../models/movie.model';

@Injectable({ providedIn: 'root' })
export class MovieService {
  private http = inject(HttpClient);

  movies = signal<Movie[]>([]);
  totalPages = signal(0);
  isLoading = signal(false);

  getMovies(page: number, size: number): void {
    this.isLoading.set(true);
    const params = new HttpParams().set('page', page).set('size', size);
    this.http.get<PageResponse<Movie>>('/api/movies', { params }).subscribe({
      next: (res) => {
        this.movies.set(res.content);
        this.totalPages.set(res.totalPages);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  searchMovies(searchParams: SearchParams): void {
    this.isLoading.set(true);
    let params = new HttpParams()
      .set('page', searchParams.page)
      .set('size', searchParams.size);

    if (searchParams.title) params = params.set('title', searchParams.title);
    if (searchParams.genre) params = params.set('genre', searchParams.genre);
    if (searchParams.yearFrom) params = params.set('yearFrom', searchParams.yearFrom);
    if (searchParams.yearTo) params = params.set('yearTo', searchParams.yearTo);
    if (searchParams.minRating) params = params.set('minRating', searchParams.minRating);

    this.http.get<PageResponse<Movie>>('/api/movies/search', { params }).subscribe({
      next: (res) => {
        this.movies.set(res.content);
        this.totalPages.set(res.totalPages);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  getMovie(id: number) {
    return this.http.get<Movie>(`/api/movies/${id}`);
  }
}