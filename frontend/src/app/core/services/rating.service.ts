import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RatingResponse } from '../models/rating.model';
import { PageResponse } from '../models/movie.model';

@Injectable({ providedIn: 'root' })
export class RatingService {
  private http = inject(HttpClient);

  userRatings = signal<RatingResponse[]>([]);
  isLoading = signal(false);

  rateMovie(movieId: string, score: number): Observable<RatingResponse> {
    return this.http.post<RatingResponse>('/api/ratings', { movieId, score });
  }

  getUserRatings(page: number, size: number): void {
    this.isLoading.set(true);
    const params = new HttpParams().set('page', page).set('size', size);
    this.http.get<PageResponse<RatingResponse>>('/api/ratings/me', { params }).subscribe({
      next: (res) => {
        this.userRatings.set(res.content);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  getUserRatingForMovie(movieId: string): Observable<RatingResponse> {
    return this.http.get<RatingResponse>(`/api/ratings/me/${movieId}`);
  }

  deleteRating(movieId: string): Observable<void> {
    return this.http.delete<void>(`/api/ratings/me/${movieId}`);
  }
}