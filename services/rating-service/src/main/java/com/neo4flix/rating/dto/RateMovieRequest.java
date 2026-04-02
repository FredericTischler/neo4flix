package com.neo4flix.rating.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RateMovieRequest(
        @NotBlank(message = "movieId is required")
        String movieId,

        @NotNull(message = "score is required")
        Double score
) {
}