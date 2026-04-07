import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="flex items-center justify-center gap-1.5 mt-8">
        <button
          (click)="pageChange.emit(currentPage() - 1)"
          [disabled]="currentPage() === 0"
          class="px-3 py-2 rounded-lg text-sm text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>

        @for (page of pages(); track page) {
          @if (page === -1) {
            <span class="px-2 py-2 text-gray-500">…</span>
          } @else {
            <button
              (click)="pageChange.emit(page)"
              [class]="page === currentPage()
                ? 'px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white border border-red-600'
                : 'px-3 py-2 rounded-lg text-sm text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors'"
            >
              {{ page + 1 }}
            </button>
          }
        }

        <button
          (click)="pageChange.emit(currentPage() + 1)"
          [disabled]="currentPage() >= totalPages() - 1"
          class="px-3 py-2 rounded-lg text-sm text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </nav>
    }
  `,
})
export default class PaginationComponent {
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  pageChange = output<number>();

  pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 0; i < total; i++) pages.push(i);
      return pages;
    }

    pages.push(0);
    if (current > 2) pages.push(-1);

    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 3) pages.push(-1);
    pages.push(total - 1);

    return pages;
  });
}