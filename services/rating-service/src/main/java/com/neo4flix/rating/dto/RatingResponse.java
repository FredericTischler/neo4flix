package com.neo4flix.rating.dto;

public record RatingResponse(
        String movieId,
        String movieTitle,
        double score,
        long timestamp
) {
}