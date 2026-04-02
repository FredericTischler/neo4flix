package com.neo4flix.rating.exception;

public class MovieNotFoundException extends RuntimeException {

    public MovieNotFoundException(String movieId) {
        super("Movie not found: " + movieId);
    }
}