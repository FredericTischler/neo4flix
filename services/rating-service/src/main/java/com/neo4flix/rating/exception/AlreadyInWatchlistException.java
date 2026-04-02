package com.neo4flix.rating.exception;

public class AlreadyInWatchlistException extends RuntimeException {

    public AlreadyInWatchlistException(String movieId) {
        super("Movie already in watchlist: " + movieId);
    }
}