package com.neo4flix.rating.service;

import com.neo4flix.rating.dto.PageResponse;
import com.neo4flix.rating.dto.WatchlistExistsResponse;
import com.neo4flix.rating.dto.WatchlistResponse;
import com.neo4flix.rating.exception.AlreadyInWatchlistException;
import com.neo4flix.rating.exception.MovieNotFoundException;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;
import org.neo4j.driver.Values;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WatchlistService {

    private final Driver driver;

    public WatchlistService(Driver driver) {
        this.driver = driver;
    }

    public WatchlistResponse addToWatchlist(String userId, String movieId) {
        assertMovieExists(movieId);

        try (var session = driver.session()) {
            boolean alreadyExists = session.run("""
                    MATCH (u:User {userId: $userId})-[:WATCHLISTED]->(m:Movie {movieId: $movieId})
                    RETURN count(m) > 0 AS exists
                    """, Values.parameters("userId", userId, "movieId", movieId))
                    .single().get("exists").asBoolean();

            if (alreadyExists) {
                throw new AlreadyInWatchlistException(movieId);
            }

            Record record = session.run("""
                    MATCH (u:User {userId: $userId}), (m:Movie {movieId: $movieId})
                    CREATE (u)-[:WATCHLISTED]->(m)
                    WITH m
                    OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)
                    RETURN m.movieId AS movieId, m.title AS movieTitle, m.year AS year, collect(g.name) AS genres
                    """, Values.parameters("userId", userId, "movieId", movieId))
                    .single();

            return toWatchlistResponse(record);
        }
    }

    public PageResponse<WatchlistResponse> getWatchlist(String userId, int page, int size) {
        try (var session = driver.session()) {
            long total = session.run("""
                    MATCH (u:User {userId: $userId})-[:WATCHLISTED]->(m:Movie)
                    RETURN count(m)
                    """, Values.parameters("userId", userId)).single().get(0).asLong();

            List<WatchlistResponse> content = session.run("""
                    MATCH (u:User {userId: $userId})-[:WATCHLISTED]->(m:Movie)
                    OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)
                    RETURN m.movieId AS movieId, m.title AS movieTitle, m.year AS year, collect(g.name) AS genres
                    ORDER BY m.title
                    SKIP $skip LIMIT $limit
                    """, Values.parameters("userId", userId, "skip", (long) page * size, "limit", size))
                    .list(this::toWatchlistResponse);

            int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
            return new PageResponse<>(content, total, totalPages, page);
        }
    }

    public void removeFromWatchlist(String userId, String movieId) {
        try (var session = driver.session()) {
            session.run("""
                    MATCH (u:User {userId: $userId})-[w:WATCHLISTED]->(m:Movie {movieId: $movieId})
                    DELETE w
                    """, Values.parameters("userId", userId, "movieId", movieId));
        }
    }

    public WatchlistExistsResponse existsInWatchlist(String userId, String movieId) {
        try (var session = driver.session()) {
            boolean exists = session.run("""
                    MATCH (u:User {userId: $userId})-[:WATCHLISTED]->(m:Movie {movieId: $movieId})
                    RETURN count(m) > 0 AS exists
                    """, Values.parameters("userId", userId, "movieId", movieId))
                    .single().get("exists").asBoolean();

            return new WatchlistExistsResponse(exists);
        }
    }

    private void assertMovieExists(String movieId) {
        try (var session = driver.session()) {
            boolean exists = session.run(
                    "MATCH (m:Movie {movieId: $movieId}) RETURN count(m) > 0 AS exists",
                    Values.parameters("movieId", movieId)).single().get("exists").asBoolean();
            if (!exists) {
                throw new MovieNotFoundException(movieId);
            }
        }
    }

    private WatchlistResponse toWatchlistResponse(Record record) {
        return new WatchlistResponse(
                record.get("movieId").asString(),
                record.get("movieTitle").asString(),
                record.get("year").asInt(),
                record.get("genres").asList(Value::asString)
        );
    }
}