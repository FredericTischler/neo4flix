package com.neo4flix.movie.dto;

import java.util.List;

public record MovieDetailResponse(
        String movieId,
        String title,
        int year,
        List<String> genres,
        Double avgRating,
        long voteCount
) {
}