package com.neo4flix.rating.controller;

import com.neo4flix.rating.dto.PageResponse;
import com.neo4flix.rating.dto.RateMovieRequest;
import com.neo4flix.rating.dto.RatingResponse;
import com.neo4flix.rating.service.RatingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ratings")
public class RatingController {

    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    @PostMapping
    public ResponseEntity<RatingResponse> rateMovie(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody RateMovieRequest request) {
        RatingResponse response = ratingService.rateMovie(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    public ResponseEntity<PageResponse<RatingResponse>> getMyRatings(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "date") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ratingService.getUserRatings(userId, sortBy, page, size));
    }

    @GetMapping("/me/{movieId}")
    public ResponseEntity<RatingResponse> getMyRatingForMovie(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String movieId) {
        return ResponseEntity.ok(ratingService.getUserRatingForMovie(userId, movieId));
    }

    @DeleteMapping("/me/{movieId}")
    public ResponseEntity<Void> deleteMyRating(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String movieId) {
        ratingService.deleteRating(userId, movieId);
        return ResponseEntity.noContent().build();
    }
}