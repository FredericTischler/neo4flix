package com.neo4flix.recommendation.controller;

import com.neo4flix.recommendation.dto.RecommendationResponse;
import com.neo4flix.recommendation.dto.RecommendedMovie;
import com.neo4flix.recommendation.dto.SimilarUserResponse;
import com.neo4flix.recommendation.service.CollaborativeFilteringService;
import com.neo4flix.recommendation.service.ContentBasedService;
import com.neo4flix.recommendation.service.GdsService;
import com.neo4flix.recommendation.service.RecommendationOrchestrator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationOrchestrator orchestrator;
    private final CollaborativeFilteringService collaborativeService;
    private final ContentBasedService contentBasedService;
    private final GdsService gdsService;

    public RecommendationController(RecommendationOrchestrator orchestrator,
                                     CollaborativeFilteringService collaborativeService,
                                     ContentBasedService contentBasedService,
                                     GdsService gdsService) {
        this.orchestrator = orchestrator;
        this.collaborativeService = collaborativeService;
        this.contentBasedService = contentBasedService;
        this.gdsService = gdsService;
    }

    @GetMapping
    public ResponseEntity<RecommendationResponse> getRecommendations(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) Double minRating,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(orchestrator.recommend(userId, genre, yearFrom, yearTo, minRating, page, size));
    }

    @GetMapping("/collaborative")
    public ResponseEntity<RecommendationResponse> getCollaborative(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) Double minRating,
            @RequestParam(defaultValue = "3") int minCommonMovies,
            @RequestParam(defaultValue = "3.5") double minScore,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        List<RecommendedMovie> movies = collaborativeService.recommend(
                userId, minCommonMovies, minScore, genre, yearFrom, yearTo, minRating, page * size, size);
        return ResponseEntity.ok(new RecommendationResponse(movies, page, size, movies.size()));
    }

    @GetMapping("/content-based")
    public ResponseEntity<RecommendationResponse> getContentBased(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) Double minRating,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        List<RecommendedMovie> movies = contentBasedService.recommend(
                userId, genre, yearFrom, yearTo, minRating, page * size, size);
        return ResponseEntity.ok(new RecommendationResponse(movies, page, size, movies.size()));
    }

    @GetMapping("/similar-users")
    public ResponseEntity<List<SimilarUserResponse>> getSimilarUsers(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(gdsService.findSimilarUsers(userId));
    }

    @GetMapping("/from-user/{similarUserId}")
    public ResponseEntity<List<RecommendedMovie>> getFromUser(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String similarUserId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(gdsService.recommendFromUser(userId, similarUserId, limit));
    }
}