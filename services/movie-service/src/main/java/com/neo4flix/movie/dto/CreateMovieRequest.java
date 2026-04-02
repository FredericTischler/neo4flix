package com.neo4flix.movie.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateMovieRequest(
        @NotBlank(message = "Title is required")
        String title,

        int year,

        @NotEmpty(message = "At least one genre is required")
        List<String> genres
) {
}