package com.neo4flix.rating.exception;

public class InvalidScoreException extends RuntimeException {

    public InvalidScoreException() {
        super("Score must be between 0.5 and 5.0, in increments of 0.5");
    }
}