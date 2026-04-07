import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { WatchlistItem } from '../models/rating.model';
import { PageResponse } from '../models/movie.model';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private http = inject(HttpClient);

  watchlist = signal<WatchlistItem[]>([]);
  totalPages = signal(0);
  isLoading = signal(false);
  watchlistIds = signal<Set<string>>(new Set());

  addToWatchlist(movieId: string): Observable<void> {
    return this.http.post<void>(`/api/watchlist/${movieId}`, {});
  }

  removeFromWatchlist(movieId: string): Observable<void> {
    return this.http.delete<void>(`/api/watchlist/${movieId}`);
  }

  getWatchlist(page: number, size: number): Observable<PageResponse<WatchlistItem>> {
    this.isLoading.set(true);
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<WatchlistItem>>('/api/watchlist', { params }).pipe(
      tap({
        next: (res) => {
          this.watchlist.set(res.content);
          this.totalPages.set(res.totalPages);
          const ids = new Set<string>(res.content.map((item) => item.movieId));
          this.watchlistIds.set(ids);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      })
    );
  }

  isInWatchlist(movieId: string): Observable<boolean> {
    return this.http.get<boolean>(`/api/watchlist/${movieId}/exists`);
  }

  toggleWatchlistId(movieId: string, add: boolean): void {
    const current = new Set(this.watchlistIds());
    if (add) {
      current.add(movieId);
    } else {
      current.delete(movieId);
    }
    this.watchlistIds.set(current);
  }
}