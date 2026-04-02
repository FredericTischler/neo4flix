package com.neo4flix.movie.exception;

public class MovieNotFoundException extends RuntimeException {

    public MovieNotFoundException(String movieId) {
        super("Movie not found: " + movieId);
    }
}