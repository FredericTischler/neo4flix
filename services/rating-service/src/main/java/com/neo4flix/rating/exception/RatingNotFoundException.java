package com.neo4flix.rating.exception;

public class RatingNotFoundException extends RuntimeException {

    public RatingNotFoundException(String movieId) {
        super("No rating found for movie: " + movieId);
    }
}