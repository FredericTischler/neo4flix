package com.neo4flix.rating.dto;

import java.util.List;

public record WatchlistResponse(
        String movieId,
        String movieTitle,
        int year,
        List<String> genres
) {
}