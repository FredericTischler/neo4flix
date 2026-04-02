package com.neo4flix.recommendation.service;

import com.neo4flix.recommendation.dto.RecommendedMovie;
import com.neo4flix.recommendation.dto.SimilarUserResponse;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Value;
import org.neo4j.driver.Values;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class GdsService {

    private static final Logger log = LoggerFactory.getLogger(GdsService.class);
    private static final String GRAPH_NAME = "user-movie-ratings";

    private final Driver driver;

    public GdsService(Driver driver) {
        this.driver = driver;
    }

    /**
     * Finds the most similar users to the target user using Jaccard similarity via GDS.
     * Projects a bipartite User-Movie graph in memory, then runs nodeSimilarity
     * to compute overlap of rated movie sets between users.
     */
    public List<SimilarUserResponse> findSimilarUsers(String userId) {
        try {
            ensureGraphProjection();

            try (var session = driver.session()) {
                return session.run("""
                        CALL gds.nodeSimilarity.stream($graphName, {
                          similarityCutoff: 0.1,
                          topK: 10
                        })
                        YIELD node1, node2, similarity
                        WITH gds.util.asNode(node1) AS user1, gds.util.asNode(node2) AS user2, similarity
                        WHERE user1.userId = $userId AND user1:User AND user2:User
                        RETURN user2.userId AS userId, user2.username AS username,
                               round(similarity * 10000.0) / 10000.0 AS similarity
                        ORDER BY similarity DESC
                        LIMIT 10
                        """, Values.parameters("graphName", GRAPH_NAME, "userId", userId))
                        .list(record -> new SimilarUserResponse(
                                record.get("userId").asString(),
                                record.get("username").isNull() ? null : record.get("username").asString(),
                                record.get("similarity").asDouble()
                        ));
            }
        } catch (Exception e) {
            log.warn("GDS similarity failed: {}. Returning empty results.", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Gets highly-rated movies from a specific similar user that the target user hasn't seen.
     * Used after findSimilarUsers to explore a specific neighbor's taste.
     */
    public List<RecommendedMovie> recommendFromUser(String userId, String similarUserId, int limit) {
        try (var session = driver.session()) {
            return session.run("""
                    MATCH (similar:User {userId: $similarUserId})-[r:RATED]->(rec:Movie)
                    WHERE r.score >= 4.0 AND NOT (:User {userId: $userId})-[:RATED]->(rec)
                    OPTIONAL MATCH (rec)-[:IN_GENRE]->(g:Genre)
                    OPTIONAL MATCH (rec)<-[allR:RATED]-()
                    WITH rec, r.score AS predictedScore, COLLECT(DISTINCT g.name) AS genres,
                         AVG(allR.score) AS avgRating, COUNT(allR) AS voteCount
                    RETURN rec.movieId AS movieId, rec.title AS title, rec.year AS year,
                           genres, predictedScore, avgRating, voteCount
                    ORDER BY predictedScore DESC
                    LIMIT $limit
                    """, Values.parameters("userId", userId, "similarUserId", similarUserId, "limit", limit))
                    .list(record -> new RecommendedMovie(
                            record.get("movieId").asString(),
                            record.get("title").asString(),
                            record.get("year").asInt(),
                            record.get("genres").asList(Value::asString),
                            record.get("predictedScore").asDouble(),
                            1,
                            record.get("avgRating").isNull() ? null :
                                    Math.round(record.get("avgRating").asDouble() * 100.0) / 100.0,
                            record.get("voteCount").asLong(),
                            List.of("gds")
                    ));
        }
    }

    /**
     * Gets recommendations by aggregating movies from the top similar users found via GDS.
     */
    public List<RecommendedMovie> recommend(String userId, int limit) {
        List<SimilarUserResponse> similarUsers = findSimilarUsers(userId);
        if (similarUsers.isEmpty()) {
            return Collections.emptyList();
        }

        // Get top 5 similar users' movie recommendations
        List<String> topUserIds = similarUsers.stream()
                .limit(5)
                .map(SimilarUserResponse::userId)
                .toList();

        try (var session = driver.session()) {
            return session.run("""
                    MATCH (similar:User)-[r:RATED]->(rec:Movie)
                    WHERE similar.userId IN $similarUserIds AND r.score >= 4.0
                      AND NOT (:User {userId: $userId})-[:RATED]->(rec)
                    OPTIONAL MATCH (rec)-[:IN_GENRE]->(g:Genre)
                    OPTIONAL MATCH (rec)<-[allR:RATED]-()
                    WITH rec, AVG(r.score) AS predictedScore, COUNT(DISTINCT similar) AS recommenderCount,
                         COLLECT(DISTINCT g.name) AS genres, AVG(allR.score) AS avgRating, COUNT(allR) AS voteCount
                    RETURN rec.movieId AS movieId, rec.title AS title, rec.year AS year,
                           genres, predictedScore, recommenderCount, avgRating, voteCount
                    ORDER BY recommenderCount DESC, predictedScore DESC
                    LIMIT $limit
                    """, Values.parameters("userId", userId, "similarUserIds", topUserIds, "limit", limit))
                    .list(record -> new RecommendedMovie(
                            record.get("movieId").asString(),
                            record.get("title").asString(),
                            record.get("year").asInt(),
                            record.get("genres").asList(Value::asString),
                            Math.round(record.get("predictedScore").asDouble() * 100.0) / 100.0,
                            record.get("recommenderCount").asInt(),
                            record.get("avgRating").isNull() ? null :
                                    Math.round(record.get("avgRating").asDouble() * 100.0) / 100.0,
                            record.get("voteCount").asLong(),
                            List.of("gds")
                    ));
        } catch (Exception e) {
            log.warn("GDS recommendation aggregation failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Ensures the GDS in-memory graph projection exists.
     * Drops and recreates it each time to reflect the latest ratings.
     * In production, this would use a TTL cache instead.
     */
    private void ensureGraphProjection() {
        try (var session = driver.session()) {
            // Check if graph already exists and drop it to get fresh data
            boolean exists = session.run(
                    "CALL gds.graph.exists($name) YIELD exists RETURN exists",
                    Values.parameters("name", GRAPH_NAME)).single().get("exists").asBoolean();

            if (exists) {
                session.run("CALL gds.graph.drop($name)", Values.parameters("name", GRAPH_NAME));
            }

            // Project the bipartite User-Movie graph with RATED relationship and score property
            session.run("""
                    CALL gds.graph.project(
                      $name,
                      ['User', 'Movie'],
                      {
                        RATED: {
                          type: 'RATED',
                          properties: 'score'
                        }
                      }
                    )
                    """, Values.parameters("name", GRAPH_NAME));
        }
    }
}