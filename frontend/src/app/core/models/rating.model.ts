export interface RateMovieRequest {
  movieId: string;
  score: number;
}

export interface RatingResponse {
  movieId: string;
  movieTitle: string;
  score: number;
  timestamp: number;
}

export interface WatchlistItem {
  movieId: string;
  movieTitle: string;
  year: number;
  genres: string[];
}