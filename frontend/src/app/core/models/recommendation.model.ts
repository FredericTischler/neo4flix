export interface RecommendedMovie {
  movieId: string;
  title: string;
  year: number;
  genres: string[];
  predictedScore: number;
  recommenderCount: number;
  avgRating: number;
  voteCount: number;
  sources: string[];
}

export interface SimilarUser {
  userId: string;
  username: string;
  similarity: number;
}