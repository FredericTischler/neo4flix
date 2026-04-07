import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RecommendedMovie, SimilarUser } from '../models/recommendation.model';

interface RecommendationResponse {
  movies: RecommendedMovie[];
  page: number;
  size: number;
  totalElements: number;
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private http = inject(HttpClient);

  recommendations = signal<RecommendedMovie[]>([]);
  similarUsers = signal<SimilarUser[]>([]);
  isLoading = signal(false);
  totalPages = signal(0);

  getRecommendations(params: RecommendationParams): void {
    this.fetchRecommendations('/api/recommendations', params);
  }

  getCollaborative(params: RecommendationParams): void {
    this.fetchRecommendations('/api/recommendations/collaborative', params);
  }

  getContentBased(params: RecommendationParams): void {
    this.fetchRecommendations('/api/recommendations/content-based', params);
  }

  getSimilarUsers(): void {
    this.http.get<SimilarUser[]>('/api/recommendations/similar-users').subscribe({
      next: (users) => this.similarUsers.set(users),
      error: () => this.similarUsers.set([]),
    });
  }

  getFromUser(userId: string, page: number, size: number): void {
    this.isLoading.set(true);
    this.http.get<RecommendedMovie[]>(`/api/recommendations/from-user/${userId}`).subscribe({
      next: (movies) => {
        this.recommendations.set(movies);
        this.totalPages.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.recommendations.set([]);
        this.isLoading.set(false);
      },
    });
  }

  private fetchRecommendations(url: string, p: RecommendationParams): void {
    this.isLoading.set(true);
    let params = new HttpParams().set('page', p.page).set('size', p.size);
    if (p.genre) params = params.set('genre', p.genre);
    if (p.yearFrom) params = params.set('yearFrom', p.yearFrom);
    if (p.yearTo) params = params.set('yearTo', p.yearTo);
    if (p.minRating) params = params.set('minRating', p.minRating);

    this.http.get<RecommendationResponse>(url, { params }).subscribe({
      next: (res) => {
        this.recommendations.set(res.movies);
        this.totalPages.set(res.size > 0 ? Math.ceil(res.totalElements / res.size) : 1);
        this.isLoading.set(false);
      },
      error: () => {
        this.recommendations.set([]);
        this.isLoading.set(false);
      },
    });
  }
}

export interface RecommendationParams {
  page: number;
  size: number;
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
}