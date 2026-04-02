package com.neo4flix.rating.service;

import com.neo4flix.rating.dto.PageResponse;
import com.neo4flix.rating.dto.RateMovieRequest;
import com.neo4flix.rating.dto.RatingResponse;
import com.neo4flix.rating.exception.InvalidScoreException;
import com.neo4flix.rating.exception.MovieNotFoundException;
import com.neo4flix.rating.exception.RatingNotFoundException;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Values;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RatingService {

    private final Driver driver;

    public RatingService(Driver driver) {
        this.driver = driver;
    }

    public RatingResponse rateMovie(String userId, RateMovieRequest request) {
        validateScore(request.score());
        assertMovieExists(request.movieId());

        try (var session = driver.session()) {
            Record record = session.run("""
                    MATCH (u:User {userId: $userId}), (m:Movie {movieId: $movieId})
                    MERGE (u)-[r:RATED]->(m)
                    SET r.score = $score, r.timestamp = timestamp()
                    RETURN m.movieId AS movieId, m.title AS movieTitle, r.score AS score, r.timestamp AS timestamp
                    """, Values.parameters("userId", userId, "movieId", request.movieId(), "score", request.score()))
                    .single();

            return toRatingResponse(record);
        }
    }

    public PageResponse<RatingResponse> getUserRatings(String userId, String sortBy, int page, int size) {
        String orderClause = "score".equals(sortBy) ? "r.score DESC" : "r.timestamp DESC";

        try (var session = driver.session()) {
            long total = session.run("""
                    MATCH (u:User {userId: $userId})-[r:RATED]->(m:Movie)
                    RETURN count(r)
                    """, Values.parameters("userId", userId)).single().get(0).asLong();

            List<RatingResponse> content = session.run("""
                    MATCH (u:User {userId: $userId})-[r:RATED]->(m:Movie)
                    RETURN m.movieId AS movieId, m.title AS movieTitle, r.score AS score, r.timestamp AS timestamp
                    ORDER BY %s
                    SKIP $skip LIMIT $limit
                    """.formatted(orderClause),
                    Values.parameters("userId", userId, "skip", (long) page * size, "limit", size))
                    .list(this::toRatingResponse);

            int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
            return new PageResponse<>(content, total, totalPages, page);
        }
    }

    public RatingResponse getUserRatingForMovie(String userId, String movieId) {
        try (var session = driver.session()) {
            var result = session.run("""
                    MATCH (u:User {userId: $userId})-[r:RATED]->(m:Movie {movieId: $movieId})
                    RETURN m.movieId AS movieId, m.title AS movieTitle, r.score AS score, r.timestamp AS timestamp
                    """, Values.parameters("userId", userId, "movieId", movieId));

            if (!result.hasNext()) {
                throw new RatingNotFoundException(movieId);
            }
            return toRatingResponse(result.single());
        }
    }

    public void deleteRating(String userId, String movieId) {
        try (var session = driver.session()) {
            long deleted = session.run("""
                    MATCH (u:User {userId: $userId})-[r:RATED]->(m:Movie {movieId: $movieId})
                    DELETE r
                    RETURN count(r) AS deleted
                    """, Values.parameters("userId", userId, "movieId", movieId))
                    .single().get("deleted").asLong();

            if (deleted == 0) {
                throw new RatingNotFoundException(movieId);
            }
        }
    }

    private void validateScore(double score) {
        if (score < 0.5 || score > 5.0 || score % 0.5 != 0) {
            throw new InvalidScoreException();
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

    private RatingResponse toRatingResponse(Record record) {
        return new RatingResponse(
                record.get("movieId").asString(),
                record.get("movieTitle").asString(),
                record.get("score").asDouble(),
                record.get("timestamp").asLong()
        );
    }
}