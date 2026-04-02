package com.neo4flix.recommendation.dto;

import java.util.List;

public record RecommendationResponse(
        List<RecommendedMovie> movies,
        int page,
        int size,
        long totalElements
) {
}