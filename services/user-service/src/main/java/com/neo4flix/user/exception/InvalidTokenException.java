package com.neo4flix.user.exception;

public class InvalidTokenException extends RuntimeException {

    public InvalidTokenException(String message) {
        super(message);
    }
}