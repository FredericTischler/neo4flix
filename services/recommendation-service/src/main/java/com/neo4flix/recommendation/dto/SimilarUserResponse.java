package com.neo4flix.recommendation.dto;

public record SimilarUserResponse(
        String userId,
        String username,
        double similarity
) {
}