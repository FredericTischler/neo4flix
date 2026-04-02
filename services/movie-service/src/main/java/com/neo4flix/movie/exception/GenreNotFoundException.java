package com.neo4flix.movie.exception;

public class GenreNotFoundException extends RuntimeException {

    public GenreNotFoundException(String name) {
        super("Genre not found: " + name);
    }
}