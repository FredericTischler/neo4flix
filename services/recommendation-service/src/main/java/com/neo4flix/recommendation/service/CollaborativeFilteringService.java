package com.neo4flix.recommendation.service;

import com.neo4flix.recommendation.dto.RecommendedMovie;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Value;
import org.neo4j.driver.Values;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CollaborativeFilteringService {

    private final Driver driver;

    public CollaborativeFilteringService(Driver driver) {
        this.driver = driver;
    }

    /**
     * Collaborative filtering: finds users who liked the same movies as the target user,
     * then recommends movies those similar users rated highly that the target hasn't seen.
     * This leverages Neo4j's graph traversal to walk User->Movie<-User->Movie paths.
     */
    public List<RecommendedMovie> recommend(String userId, int minCommonMovies, double minScore,
                                             String genre, Integer yearFrom, Integer yearTo,
                                             Double minRating, int skip, int limit) {
        // Build optional filter clauses for genre, year range, and minimum average rating
        StringBuilder filters = new StringBuilder();
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        params.put("minCommonMovies", minCommonMovies);
        params.put("minScore", minScore);
        params.put("skip", (long) skip);
        params.put("limit", limit);

        if (genre != null && !genre.isBlank()) {
            filters.append("AND (rec)-[:IN_GENRE]->(:Genre {name: $genre}) ");
            params.put("genre", genre);
        }
        if (yearFrom != null) {
            filters.append("AND rec.year >= $yearFrom ");
            params.put("yearFrom", yearFrom);
        }
        if (yearTo != null) {
            filters.append("AND rec.year <= $yearTo ");
            params.put("yearTo", yearTo);
        }

        String ratingFilter = "";
        if (minRating != null) {
            ratingFilter = "WHERE avgRating >= $minRating ";
            params.put("minRating", minRating);
        }

        // Find users who rated the same movies highly, then get their other highly-rated movies
        String cypher = """
                MATCH (u:User {userId: $userId})-[r1:RATED]->(m:Movie)<-[r2:RATED]-(similar:User)
                WHERE r1.score >= $minScore AND r2.score >= $minScore
                WITH u, similar, COUNT(m) AS commonMovies
                WHERE commonMovies >= $minCommonMovies
                MATCH (similar)-[r3:RATED]->(rec:Movie)
                WHERE r3.score >= 4.0 AND NOT (u)-[:RATED]->(rec) %s
                OPTIONAL MATCH (rec)<-[allR:RATED]-()
                OPTIONAL MATCH (rec)-[:IN_GENRE]->(g:Genre)
                WITH rec, AVG(r3.score) AS predictedScore, COUNT(DISTINCT similar) AS recommenderCount,
                     AVG(allR.score) AS avgRating, COUNT(allR) AS voteCount, COLLECT(DISTINCT g.name) AS genres
                %s
                RETURN rec.movieId AS movieId, rec.title AS title, rec.year AS year,
                       genres, predictedScore, recommenderCount, avgRating, voteCount
                ORDER BY predictedScore DESC, recommenderCount DESC
                SKIP $skip LIMIT $limit
                """.formatted(filters, ratingFilter);

        try (var session = driver.session()) {
            return session.run(cypher, Values.value(params)).list(record ->
                    new RecommendedMovie(
                            record.get("movieId").asString(),
                            record.get("title").asString(),
                            record.get("year").asInt(),
                            record.get("genres").asList(Value::asString),
                            Math.round(record.get("predictedScore").asDouble() * 100.0) / 100.0,
                            record.get("recommenderCount").asInt(),
                            record.get("avgRating").isNull() ? null :
                                    Math.round(record.get("avgRating").asDouble() * 100.0) / 100.0,
                            record.get("voteCount").asLong(),
                            List.of("collaborative")
                    ));
        }
    }
}