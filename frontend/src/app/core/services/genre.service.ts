import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Genre } from '../models/movie.model';

@Injectable({ providedIn: 'root' })
export class GenreService {
  private http = inject(HttpClient);

  genres = signal<Genre[]>([]);

  loadGenres(): void {
    this.http.get<Genre[]>('/api/genres').subscribe({
      next: (genres) => this.genres.set(genres),
    });
  }
}