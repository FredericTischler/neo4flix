export interface Movie {
  movieId: number;
  title: string;
  year: number;
  genres: string[];
  avgRating: number;
  voteCount: number;
}

export interface Genre {
  name: string;
}

export interface SearchParams {
  title?: string;
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  page: number;
  size: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
}