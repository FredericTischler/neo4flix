import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-0.5" (mouseleave)="onMouseLeave()">
      @for (star of stars(); track star.index) {
        <button
          type="button"
          [disabled]="readonly()"
          class="relative w-7 h-7 focus:outline-none transition-transform"
          [class.cursor-pointer]="!readonly()"
          [class.cursor-default]="readonly()"
          [class.hover:scale-110]="!readonly()"
          (mousemove)="onMouseMove($event, star.index)"
          (click)="onStarClick($event, star.index)"
        >
          <!-- Empty star -->
          <svg class="absolute inset-0 w-7 h-7 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <!-- Filled star (full) -->
          @if (star.fill === 'full') {
            <svg class="absolute inset-0 w-7 h-7 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          }
          <!-- Filled star (half) -->
          @if (star.fill === 'half') {
            <svg class="absolute inset-0 w-7 h-7 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <defs>
                <clipPath [attr.id]="'half-clip-' + star.index">
                  <rect x="0" y="0" width="10" height="20"/>
                </clipPath>
              </defs>
              <path [attr.clip-path]="'url(#half-clip-' + star.index + ')'" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          }
        </button>
      }
      @if (displayValue() > 0) {
        <span class="ml-1.5 text-sm font-medium text-gray-300">{{ displayValue().toFixed(1) }}</span>
      }
    </div>
  `,
})
export default class StarRatingComponent {
  rating = input<number>(0);
  readonly = input<boolean>(false);
  ratingChange = output<number>();

  hoveredRating = signal(0);

  displayValue = computed(() => this.hoveredRating() || this.rating());

  stars = computed(() => {
    const value = this.displayValue();
    return Array.from({ length: 5 }, (_, i) => {
      const starNumber = i + 1;
      let fill: 'full' | 'half' | 'empty' = 'empty';
      if (value >= starNumber) {
        fill = 'full';
      } else if (value >= starNumber - 0.5) {
        fill = 'half';
      }
      return { index: i, fill };
    });
  });

  onMouseMove(event: MouseEvent, index: number): void {
    if (this.readonly()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left < rect.width / 2;
    this.hoveredRating.set(isLeftHalf ? index + 0.5 : index + 1);
  }

  onMouseLeave(): void {
    if (this.readonly()) return;
    this.hoveredRating.set(0);
  }

  onStarClick(event: MouseEvent, index: number): void {
    if (this.readonly()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left < rect.width / 2;
    const score = isLeftHalf ? index + 0.5 : index + 1;
    this.ratingChange.emit(score);
  }
}