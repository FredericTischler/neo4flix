package com.neo4flix.recommendation.service;

import com.neo4flix.recommendation.dto.RecommendationResponse;
import com.neo4flix.recommendation.dto.RecommendedMovie;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Value;
import org.neo4j.driver.Values;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(RecommendationOrchestrator.class);

    private final CollaborativeFilteringService collaborativeService;
    private final ContentBasedService contentBasedService;
    private final GdsService gdsService;
    private final Driver driver;

    public RecommendationOrchestrator(CollaborativeFilteringService collaborativeService,
                                      ContentBasedService contentBasedService,
                                      GdsService gdsService,
                                      Driver driver) {
        this.collaborativeService = collaborativeService;
        this.contentBasedService = contentBasedService;
        this.gdsService = gdsService;
        this.driver = driver;
    }

    /**
     * Combines results from all three recommendation algorithms:
     * 1. Collaborative filtering (user-to-user similarity via graph traversal)
     * 2. Content-based (genre affinity)
     * 3. GDS Node Similarity (Jaccard via in-memory graph)
     *
     * Deduplicates by movieId and merges sources. If a movie appears in multiple
     * algorithms, its predicted score is boosted and all sources are listed.
     * Falls back to popular movies if the user has no ratings.
     */
    public RecommendationResponse recommend(String userId, String genre, Integer yearFrom,
                                             Integer yearTo, Double minRating, int page, int size) {
        long userRatingCount = getUserRatingCount(userId);

        // Fallback: user has no ratings, return popular movies
        if (userRatingCount == 0) {
            List<RecommendedMovie> popular = getPopularMovies(genre, yearFrom, yearTo, minRating, page, size);
            return new RecommendationResponse(popular, page, size, popular.size());
        }

        int fetchSize = size * 2; // fetch more to account for deduplication

        // Gather results from each algorithm
        List<RecommendedMovie> collaborative = safeCall(() ->
                collaborativeService.recommend(userId, userRatingCount < 3 ? 1 : 3,
                        3.5, genre, yearFrom, yearTo, minRating, 0, fetchSize), "collaborative");

        List<RecommendedMovie> contentBased = safeCall(() ->
                contentBasedService.recommend(userId, genre, yearFrom, yearTo, minRating, 0, fetchSize),
                "content-based");

        List<RecommendedMovie> gds = safeCall(() ->
                gdsService.recommend(userId, fetchSize), "gds");

        // Merge and deduplicate: movies appearing in multiple sources get boosted
        Map<String, RecommendedMovie> merged = new LinkedHashMap<>();

        for (RecommendedMovie movie : collaborative) mergeMovie(merged, movie);
        for (RecommendedMovie movie : contentBased) mergeMovie(merged, movie);
        for (RecommendedMovie movie : gds) mergeMovie(merged, movie);

        // Sort by number of sources (more = more confidence), then by predicted score
        List<RecommendedMovie> sorted = merged.values().stream()
                .sorted(Comparator.<RecommendedMovie, Integer>comparing(m -> m.sources().size()).reversed()
                        .thenComparing(Comparator.comparingDouble(RecommendedMovie::predictedScore).reversed()))
                .toList();

        // Paginate
        int start = page * size;
        int end = Math.min(start + size, sorted.size());
        List<RecommendedMovie> pageContent = start < sorted.size() ? sorted.subList(start, end) : List.of();

        return new RecommendationResponse(pageContent, page, size, sorted.size());
    }

    private void mergeMovie(Map<String, RecommendedMovie> merged, RecommendedMovie movie) {
        merged.merge(movie.movieId(), movie, (existing, incoming) -> {
            // Combine sources and take the higher predicted score
            List<String> allSources = new ArrayList<>(existing.sources());
            for (String s : incoming.sources()) {
                if (!allSources.contains(s)) allSources.add(s);
            }
            return new RecommendedMovie(
                    existing.movieId(),
                    existing.title(),
                    existing.year(),
                    existing.genres(),
                    Math.max(existing.predictedScore(), incoming.predictedScore()),
                    existing.recommenderCount() + incoming.recommenderCount(),
                    existing.avgRating() != null ? existing.avgRating() : incoming.avgRating(),
                    Math.max(existing.voteCount(), incoming.voteCount()),
                    allSources
            );
        });
    }

    /**
     * Fallback for users with no ratings: returns globally popular movies
     * sorted by average rating with a minimum vote threshold to avoid bias.
     */
    private List<RecommendedMovie> getPopularMovies(String genre, Integer yearFrom,
                                                     Integer yearTo, Double minRating,
                                                     int page, int size) {
        StringBuilder filters = new StringBuilder();
        Map<String, Object> params = new HashMap<>();
        params.put("skip", (long) page * size);
        params.put("limit", size);

        if (genre != null && !genre.isBlank()) {
            filters.append("MATCH (m)-[:IN_GENRE]->(:Genre {name: $genre}) ");
            params.put("genre", genre);
        }

        StringBuilder where = new StringBuilder();
        if (yearFrom != null) {
            where.append("AND m.year >= $yearFrom ");
            params.put("yearFrom", yearFrom);
        }
        if (yearTo != null) {
            where.append("AND m.year <= $yearTo ");
            params.put("yearTo", yearTo);
        }

        String ratingFilter = minRating != null ? "AND avgRating >= $minRating " : "";
        if (minRating != null) params.put("minRating", minRating);

        String cypher = """
                MATCH (m:Movie) %s
                OPTIONAL MATCH (m)<-[r:RATED]-()
                WITH m, AVG(r.score) AS avgRating, COUNT(r) AS voteCount
                WHERE voteCount >= 10 %s %s
                OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)
                RETURN m.movieId AS movieId, m.title AS title, m.year AS year,
                       COLLECT(DISTINCT g.name) AS genres, avgRating, voteCount
                ORDER BY avgRating DESC
                SKIP $skip LIMIT $limit
                """.formatted(filters, where, ratingFilter);

        try (var session = driver.session()) {
            return session.run(cypher, Values.value(params)).list(record ->
                    new RecommendedMovie(
                            record.get("movieId").asString(),
                            record.get("title").asString(),
                            record.get("year").asInt(),
                            record.get("genres").asList(Value::asString),
                            record.get("avgRating").isNull() ? 0 : record.get("avgRating").asDouble(),
                            0,
                            record.get("avgRating").isNull() ? null :
                                    Math.round(record.get("avgRating").asDouble() * 100.0) / 100.0,
                            record.get("voteCount").asLong(),
                            List.of("popular")
                    ));
        }
    }

    private long getUserRatingCount(String userId) {
        try (var session = driver.session()) {
            return session.run("MATCH (:User {userId: $userId})-[:RATED]->() RETURN count(*) AS cnt",
                    Values.parameters("userId", userId)).single().get("cnt").asLong();
        }
    }

    private List<RecommendedMovie> safeCall(java.util.function.Supplier<List<RecommendedMovie>> supplier,
                                             String source) {
        try {
            return supplier.get();
        } catch (Exception e) {
            log.warn("{} recommendation failed: {}", source, e.getMessage());
            return Collections.emptyList();
        }
    }
}