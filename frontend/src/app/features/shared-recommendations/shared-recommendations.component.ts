import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RecommendationService } from '../../core/services/recommendation.service';
import { UserProfile } from '../../core/models/user.model';
import MovieCardComponent from '../../shared/components/movie-card/movie-card.component';
import PaginationComponent from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-shared-recommendations',
  standalone: true,
  imports: [RouterLink, MovieCardComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <a
          routerLink="/recommendations"
          class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </a>
        <h2 class="text-2xl font-bold text-gray-100">
          @if (sharedUser()) {
            {{ sharedUser()!.username }}'s Recommendations
          } @else {
            Shared Recommendations
          }
        </h2>
      </div>
      <button
        (click)="copyLink()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-1.102-4.243a4 4 0 015.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>
        {{ copied() ? 'Copied!' : 'Copy link' }}
      </button>
    </div>

    @if (recService.isLoading()) {
      <div class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    } @else if (recService.recommendations().length === 0) {
      <p class="text-center text-gray-500 py-20">No recommendations available for this user.</p>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        @for (rec of recService.recommendations(); track rec.movieId) {
          <app-movie-card [movie]="toMovie(rec)" [sources]="rec.sources" />
        }
      </div>
      <app-pagination
        [currentPage]="currentPage()"
        [totalPages]="recService.totalPages()"
        (pageChange)="onPageChange($event)"
      />
    }
  `,
})
export default class SharedRecommendationsComponent implements OnInit {
  recService = inject(RecommendationService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  sharedUser = signal<UserProfile | null>(null);
  currentPage = signal(0);
  copied = signal(false);
  private userId = '';

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId')!;
    this.http.get<UserProfile>(`/api/users/${this.userId}`).subscribe({
      next: (user) => this.sharedUser.set(user),
    });
    this.recService.getFromUser(this.userId, 0, 20);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.recService.getFromUser(this.userId, page, 20);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  copyLink(): void {
    const url = `${window.location.origin}/shared/${this.userId}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  toMovie(rec: any): any {
    return {
      movieId: rec.movieId,
      title: rec.title,
      year: rec.year,
      genres: rec.genres,
      avgRating: rec.avgRating,
      voteCount: rec.voteCount,
    };
  }
}