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
public class ContentBasedService {

    private final Driver driver;

    public ContentBasedService(Driver driver) {
        this.driver = driver;
    }

    /**
     * Content-based filtering: identifies the user's preferred genres (weighted by rating score),
     * then recommends unseen movies from those genres with good global ratings.
     * This uses genre affinity as a relevance signal rather than user-to-user similarity.
     */
    public List<RecommendedMovie> recommend(String userId, String genre, Integer yearFrom,
                                             Integer yearTo, Double minRating, int skip, int limit) {
        StringBuilder filters = new StringBuilder();
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        params.put("skip", (long) skip);
        params.put("limit", limit);

        if (genre != null && !genre.isBlank()) {
            filters.append("AND g.name = $genre ");
            params.put("genre", genre);
        }

        StringBuilder recFilters = new StringBuilder();
        if (yearFrom != null) {
            recFilters.append("AND rec.year >= $yearFrom ");
            params.put("yearFrom", yearFrom);
        }
        if (yearTo != null) {
            recFilters.append("AND rec.year <= $yearTo ");
            params.put("yearTo", yearTo);
        }

        String ratingFilter = "";
        if (minRating != null) {
            ratingFilter = "AND avgRating >= $minRating ";
            params.put("minRating", minRating);
        }

        // Find top 5 preferred genres, then recommend unseen movies from those genres
        // with at least 5 votes to avoid low-confidence ratings
        String cypher = """
                MATCH (u:User {userId: $userId})-[r:RATED]->(m:Movie)-[:IN_GENRE]->(g:Genre)
                WHERE r.score >= 4.0 %s
                WITH u, g, AVG(r.score) AS genreAffinity, COUNT(m) AS genreCount
                ORDER BY genreAffinity DESC, genreCount DESC
                LIMIT 5
                MATCH (g)<-[:IN_GENRE]-(rec:Movie)
                WHERE NOT (u)-[:RATED]->(rec) %s
                OPTIONAL MATCH (rec)<-[allR:RATED]-()
                WITH rec, g, genreAffinity, AVG(allR.score) AS avgRating, COUNT(allR) AS voteCount
                WHERE voteCount >= 5 %s
                OPTIONAL MATCH (rec)-[:IN_GENRE]->(allG:Genre)
                WITH rec, COLLECT(DISTINCT g.name) AS matchedGenres, MAX(genreAffinity) AS relevanceScore,
                     avgRating, voteCount, COLLECT(DISTINCT allG.name) AS genres
                RETURN rec.movieId AS movieId, rec.title AS title, rec.year AS year,
                       genres, relevanceScore, SIZE(matchedGenres) AS recommenderCount,
                       avgRating, voteCount
                ORDER BY relevanceScore DESC, avgRating DESC
                SKIP $skip LIMIT $limit
                """.formatted(filters, recFilters, ratingFilter);

        try (var session = driver.session()) {
            return session.run(cypher, Values.value(params)).list(record ->
                    new RecommendedMovie(
                            record.get("movieId").asString(),
                            record.get("title").asString(),
                            record.get("year").asInt(),
                            record.get("genres").asList(Value::asString),
                            Math.round(record.get("relevanceScore").asDouble() * 100.0) / 100.0,
                            record.get("recommenderCount").asInt(),
                            record.get("avgRating").isNull() ? null :
                                    Math.round(record.get("avgRating").asDouble() * 100.0) / 100.0,
                            record.get("voteCount").asLong(),
                            List.of("content-based")
                    ));
        }
    }
}