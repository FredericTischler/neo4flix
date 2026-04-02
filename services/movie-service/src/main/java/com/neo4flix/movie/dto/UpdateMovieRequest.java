package com.neo4flix.movie.dto;

import java.util.List;

public record UpdateMovieRequest(
        String title,
        Integer year,
        List<String> genres
) {
}