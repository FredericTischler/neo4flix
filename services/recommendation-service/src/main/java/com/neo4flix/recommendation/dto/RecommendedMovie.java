package com.neo4flix.recommendation.dto;

import java.util.List;

public record RecommendedMovie(
        String movieId,
        String title,
        int year,
        List<String> genres,
        double predictedScore,
        int recommenderCount,
        Double avgRating,
        long voteCount,
        List<String> sources
) {
}