import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Movie } from '../../../core/models/movie.model';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="['/movies', movie().movieId]"
      class="block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:scale-[1.03] hover:border-gray-700 transition-all duration-200 group"
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
  `,
})
export default class MovieCardComponent {
  movie = input.required<Movie>();
}