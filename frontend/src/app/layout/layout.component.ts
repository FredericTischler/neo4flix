import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import HeaderComponent from './header/header.component';
import { GenreService } from '../core/services/genre.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col">
      <app-header />
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export default class LayoutComponent {
  private genreService = inject(GenreService);

  constructor() {
    this.genreService.loadGenres();
  }
}